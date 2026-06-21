import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { throwDatabaseErrors, throwIfNotFound } from '../common/utils/error';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageService } from '../storage/storage.service';
import { UploadedBufferFile } from '../storage/storage.types';
import { User } from '../users/entities/user.entity';
import {
  accountPreferenceDefinitions,
  accountPreferenceKeys,
} from './account-preferences';
import {
  AccountLogoResponseDto,
  SigningCertificateListResponseDto,
  SigningCertificateResponseDto,
} from './dto/account-branding.dto';
import { AccountPreferencesResponseDto } from './dto/account-preferences-response.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import {
  AccountEmailIntegrationConnectResponseDto,
  AccountEmailIntegrationListResponseDto,
  AccountEmailIntegrationResponseDto,
} from './dto/account-integration.dto';
import { UpdateAccountPreferencesDto } from './dto/update-account-preferences.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountConfig } from './entities/account-config.entity';
import { AccountLinkedAccount } from './entities/account-linked-account.entity';
import { Account } from './entities/account.entity';
import { EncryptedConfig } from './entities/encrypted-config.entity';

const signingCertificatePrefix = 'signing_certificate:';
const defaultSigningCertificateKey = 'default_signing_certificate';
const emailIntegrationProviders = ['gmail', 'microsoft'] as const;

type EmailIntegrationProvider = (typeof emailIntegrationProviders)[number];

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
    @InjectRepository(AccountConfig)
    private readonly accountConfigs: Repository<AccountConfig>,
    @InjectRepository(AccountLinkedAccount)
    private readonly linkedAccounts: Repository<AccountLinkedAccount>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(EncryptedConfig)
    private readonly encryptedConfigs: Repository<EncryptedConfig>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  findActiveAccount(accountId: string): Promise<Account | null> {
    return this.accounts.findOne({
      where: {
        id: accountId,
        archivedAt: IsNull(),
      },
    });
  }

  async findConfigValue(accountId: string, key: string): Promise<unknown> {
    const config = await this.accountConfigs.findOne({
      where: {
        accountId,
        key,
      },
    });

    return config?.value ?? null;
  }

  findLinkedAccount(options: {
    accountId: string;
    accountType: string;
  }): Promise<AccountLinkedAccount | null> {
    return this.linkedAccounts.findOne({
      where: {
        accountId: options.accountId,
        accountType: options.accountType,
      },
    });
  }

  async getAccount(accountId: string): Promise<AccountResponseDto> {
    return this.toAccountResponse(
      await this.findActiveAccountOrFail(accountId),
    );
  }

  async getAccountPreferences(
    accountId: string,
  ): Promise<AccountPreferencesResponseDto> {
    await this.findActiveAccountOrFail(accountId);

    return this.toAccountPreferencesResponse(
      await this.accountConfigs.find({
        where: {
          accountId,
          key: In(accountPreferenceKeys),
        },
      }),
    );
  }

  async updateAccount(
    accountId: string,
    input: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    const account = await this.findActiveAccountOrFail(accountId);

    this.accounts.merge(account, {
      name: input.name ?? account.name,
      timezone: input.timezone ?? account.timezone,
      locale: input.locale ?? account.locale,
    });

    try {
      return this.toAccountResponse(await this.accounts.save(account));
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async updateAccountPreferences(
    accountId: string,
    input: UpdateAccountPreferencesDto,
  ): Promise<AccountPreferencesResponseDto> {
    await this.findActiveAccountOrFail(accountId);

    const existingConfigs = await this.accountConfigs.find({
      where: {
        accountId,
        key: In(accountPreferenceKeys),
      },
    });
    const existingByKey = new Map(
      existingConfigs.map((config) => [config.key, config]),
    );
    const configsToSave: AccountConfig[] = [];
    const configsToRemove: AccountConfig[] = [];

    for (const definition of accountPreferenceDefinitions) {
      const value = this.normalizePreferenceValue(
        definition.property,
        input[definition.property],
      );

      if (typeof value === 'undefined') {
        continue;
      }

      const existingConfig = existingByKey.get(definition.key);

      if (this.isEmptyPreferenceValue(value)) {
        if (existingConfig) {
          configsToRemove.push(existingConfig);
        }

        continue;
      }

      const config =
        existingConfig ??
        this.accountConfigs.create({
          accountId,
          key: definition.key,
        });

      config.value = value;
      configsToSave.push(config);
    }

    try {
      if (configsToSave.length > 0) {
        await this.accountConfigs.save(configsToSave);
      }

      if (configsToRemove.length > 0) {
        await this.accountConfigs.remove(configsToRemove);
      }

      return this.getAccountPreferences(accountId);
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async archiveAccount(options: {
    accountId: string;
    userId: string;
  }): Promise<AccountResponseDto> {
    const account = await this.findActiveAccountOrFail(options.accountId);
    const user = await this.findUserOrFail(options.userId);
    const archivedAt = new Date();

    user.lockedAt = archivedAt;
    user.email = user.email.replace('@', '+removed@');
    account.archivedAt = archivedAt;

    try {
      await this.users.save(user);
      return this.toAccountResponse(await this.accounts.save(account));
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async getAccountLogo(
    accountId: string,
  ): Promise<AccountLogoResponseDto | null> {
    await this.findActiveAccountOrFail(accountId);

    const [logo] = await this.storageService.findRecordAttachments({
      recordType: 'Account',
      recordId: accountId,
      name: 'logo',
    });

    return logo ? this.toLogoResponse(logo) : null;
  }

  async uploadAccountLogo(
    accountId: string,
    file: UploadedBufferFile,
  ): Promise<AccountLogoResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    this.assertUploadedFile(file, 'Logo file is required');

    if (!file.mimetype?.startsWith('image/')) {
      throw new UnprocessableEntityException({
        error: 'Logo must be an image file',
      });
    }

    await this.storageService.deleteRecordAttachments({
      recordType: 'Account',
      recordId: accountId,
      name: 'logo',
    });

    const logo = await this.storageService.createAttachment({
      buffer: file.buffer,
      filename: file.originalname || 'logo.png',
      contentType: file.mimetype,
      name: 'logo',
      recordType: 'Account',
      recordId: accountId,
      metadata: { analyzed: true, identified: true },
    });

    return this.toLogoResponse(logo);
  }

  async deleteAccountLogo(
    accountId: string,
  ): Promise<AccountLogoResponseDto | null> {
    const existingLogo = await this.getAccountLogo(accountId);

    await this.storageService.deleteRecordAttachments({
      recordType: 'Account',
      recordId: accountId,
      name: 'logo',
    });

    return existingLogo;
  }

  async listSigningCertificates(
    accountId: string,
  ): Promise<SigningCertificateListResponseDto> {
    await this.findActiveAccountOrFail(accountId);

    const [configs, defaultConfig] = await Promise.all([
      this.encryptedConfigs.find({
        where: { accountId },
        order: { createdAt: 'ASC' },
      }),
      this.encryptedConfigs.findOne({
        where: { accountId, key: defaultSigningCertificateKey },
      }),
    ]);
    const defaultName = defaultConfig?.value ?? null;

    return {
      data: configs
        .filter((config) => config.key.startsWith(signingCertificatePrefix))
        .map((config) =>
          this.toSigningCertificateResponse(config, defaultName),
        ),
    };
  }

  async uploadSigningCertificate(
    accountId: string,
    name: string | undefined,
    file: UploadedBufferFile,
  ): Promise<SigningCertificateResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    this.assertUploadedFile(file, 'Signing certificate file is required');
    const certificateName = this.normalizeCertificateName(
      name || file.originalname,
    );
    const value = JSON.stringify({
      filename: file.originalname || `${certificateName}.p12`,
      content_type: file.mimetype ?? 'application/octet-stream',
      data: file.buffer.toString('base64'),
      valid_to: null,
    });
    const config = await this.upsertEncryptedConfig(
      accountId,
      `${signingCertificatePrefix}${certificateName}`,
      value,
    );
    const certificates = await this.listSigningCertificates(accountId);

    if (certificates.data.length === 1) {
      await this.upsertEncryptedConfig(
        accountId,
        defaultSigningCertificateKey,
        certificateName,
      );
      return { ...this.toSigningCertificateResponse(config, certificateName) };
    }

    return this.toSigningCertificateResponse(config, null);
  }

  async makeDefaultSigningCertificate(
    accountId: string,
    name: string,
  ): Promise<SigningCertificateResponseDto> {
    await this.findSigningCertificateOrFail(accountId, name);
    await this.upsertEncryptedConfig(
      accountId,
      defaultSigningCertificateKey,
      this.normalizeCertificateName(name),
    );

    return this.toSigningCertificateResponse(
      await this.findSigningCertificateOrFail(accountId, name),
      this.normalizeCertificateName(name),
    );
  }

  async deleteSigningCertificate(
    accountId: string,
    name: string,
  ): Promise<SigningCertificateResponseDto> {
    const certificate = await this.findSigningCertificateOrFail(
      accountId,
      name,
    );
    const response = this.toSigningCertificateResponse(certificate, null);
    const defaultConfig = await this.encryptedConfigs.findOne({
      where: { accountId, key: defaultSigningCertificateKey },
    });

    if (defaultConfig?.value === response.name) {
      await this.encryptedConfigs.remove(defaultConfig);
    }

    await this.encryptedConfigs.remove(certificate);
    return response;
  }

  async listEmailIntegrations(
    accountId: string,
  ): Promise<AccountEmailIntegrationListResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    const configs = await this.encryptedConfigs.find({
      where: {
        accountId,
        key: In(
          emailIntegrationProviders.map((provider) =>
            this.getEmailIntegrationKey(provider),
          ),
        ),
      },
    });
    const configByProvider = new Map(
      configs.map((config) => [
        config.key.replace(
          'email_integration:',
          '',
        ) as EmailIntegrationProvider,
        config,
      ]),
    );

    return {
      data: emailIntegrationProviders.map((provider) =>
        this.toEmailIntegrationResponse(
          provider,
          configByProvider.get(provider),
        ),
      ),
    };
  }

  async startEmailIntegrationConnect(
    accountId: string,
    providerInput: string,
  ): Promise<AccountEmailIntegrationConnectResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    const provider = this.normalizeEmailIntegrationProvider(providerInput);
    const settings = this.getEmailIntegrationSettings(provider);

    if (!settings.clientId || !settings.clientSecret || !settings.redirectUri) {
      return {
        provider,
        connected: false,
        configured: false,
        url: null,
      };
    }

    return {
      provider,
      connected: false,
      configured: true,
      url: this.buildEmailIntegrationOauthUrl(provider, settings),
    };
  }

  async completeEmailIntegrationConnect(
    accountId: string,
    providerInput: string,
    code: string,
  ): Promise<AccountEmailIntegrationResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    const provider = this.normalizeEmailIntegrationProvider(providerInput);
    const settings = this.getEmailIntegrationSettings(provider);

    if (!settings.clientId || !settings.clientSecret || !settings.redirectUri) {
      throw new UnprocessableEntityException({
        error: 'Email integration is not configured',
      });
    }

    const tokenResponse = await this.exchangeEmailIntegrationCode(
      provider,
      settings,
      code,
    );
    const email = await this.fetchEmailIntegrationUserEmail(
      provider,
      tokenResponse.access_token,
    );
    const connectedAt = new Date().toISOString();
    const config = await this.upsertEncryptedConfig(
      accountId,
      this.getEmailIntegrationKey(provider),
      JSON.stringify({
        provider,
        email,
        connected_at: connectedAt,
        token_type: tokenResponse.token_type,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token ?? null,
        expires_at: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
        scope: tokenResponse.scope ?? null,
      }),
    );

    return this.toEmailIntegrationResponse(provider, config);
  }

  async disconnectEmailIntegration(
    accountId: string,
    providerInput: string,
  ): Promise<AccountEmailIntegrationResponseDto> {
    await this.findActiveAccountOrFail(accountId);
    const provider = this.normalizeEmailIntegrationProvider(providerInput);
    const config = await this.encryptedConfigs.findOne({
      where: {
        accountId,
        key: this.getEmailIntegrationKey(provider),
      },
    });

    if (config) {
      await this.encryptedConfigs.remove(config);
    }

    return this.toEmailIntegrationResponse(provider);
  }

  private async findActiveAccountOrFail(accountId: string): Promise<Account> {
    try {
      return await this.accounts.findOneByOrFail({
        id: accountId,
        archivedAt: IsNull(),
      });
    } catch (error) {
      throwIfNotFound(error, 'Account not found');
    }
  }

  private async findUserOrFail(userId: string): Promise<User> {
    try {
      return await this.users.findOneByOrFail({ id: userId });
    } catch (error) {
      throwIfNotFound(error, 'User not found');
    }
  }

  private normalizeEmailIntegrationProvider(
    provider: string,
  ): EmailIntegrationProvider {
    if (
      emailIntegrationProviders.includes(provider as EmailIntegrationProvider)
    ) {
      return provider as EmailIntegrationProvider;
    }

    throw new NotFoundException({ error: 'Email integration not found' });
  }

  private getEmailIntegrationKey(provider: EmailIntegrationProvider): string {
    return `email_integration:${provider}`;
  }

  private getEmailIntegrationSettings(provider: EmailIntegrationProvider): {
    authUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    tokenUrl: string;
    userInfoUrl: string;
  } {
    if (provider === 'gmail') {
      return {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: this.configService.get<string>('GMAIL_OAUTH_CLIENT_ID', ''),
        clientSecret: this.configService.get<string>(
          'GMAIL_OAUTH_CLIENT_SECRET',
          '',
        ),
        redirectUri: this.configService.get<string>(
          'GMAIL_OAUTH_REDIRECT_URI',
          '',
        ),
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/gmail.send',
        ],
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      };
    }

    return {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      clientId: this.configService.get<string>('MICROSOFT_OAUTH_CLIENT_ID', ''),
      clientSecret: this.configService.get<string>(
        'MICROSOFT_OAUTH_CLIENT_SECRET',
        '',
      ),
      redirectUri: this.configService.get<string>(
        'MICROSOFT_OAUTH_REDIRECT_URI',
        '',
      ),
      scopes: ['openid', 'email', 'profile', 'offline_access', 'Mail.Send'],
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    };
  }

  private buildEmailIntegrationOauthUrl(
    provider: EmailIntegrationProvider,
    settings: ReturnType<AccountsService['getEmailIntegrationSettings']>,
  ): string {
    const params = new URLSearchParams({
      client_id: settings.clientId,
      redirect_uri: settings.redirectUri,
      response_type: 'code',
      scope: settings.scopes.join(' '),
      state: Buffer.from(
        JSON.stringify({ provider, timestamp: Date.now() }),
      ).toString('base64url'),
    });

    if (provider === 'gmail') {
      params.set('access_type', 'offline');
      params.set('include_granted_scopes', 'true');
      params.set('prompt', 'consent');
    }

    return `${settings.authUrl}?${params.toString()}`;
  }

  private toEmailIntegrationResponse(
    provider: EmailIntegrationProvider,
    config?: EncryptedConfig,
  ): AccountEmailIntegrationResponseDto {
    const value = config ? parseEmailIntegrationConfig(config.value) : {};
    const settings = this.getEmailIntegrationSettings(provider);

    return {
      provider,
      name: provider === 'gmail' ? 'Gmail' : 'Microsoft',
      connected: Boolean(config),
      configured: Boolean(
        settings.clientId && settings.clientSecret && settings.redirectUri,
      ),
      email: value.email ?? null,
      connected_at: value.connected_at ?? null,
    };
  }

  private async exchangeEmailIntegrationCode(
    provider: EmailIntegrationProvider,
    settings: ReturnType<AccountsService['getEmailIntegrationSettings']>,
    code: string,
  ): Promise<{
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  }> {
    const body = new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: settings.redirectUri,
    });
    const response = await fetch(settings.tokenUrl, {
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || !isPlainRecord(payload)) {
      throw new UnprocessableEntityException({
        error: `Failed to connect ${provider}`,
      });
    }

    if (typeof payload.access_token !== 'string') {
      throw new UnprocessableEntityException({
        error: `Missing ${provider} access token`,
      });
    }

    return {
      access_token: payload.access_token,
      expires_in:
        typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
      refresh_token:
        typeof payload.refresh_token === 'string'
          ? payload.refresh_token
          : undefined,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      token_type:
        typeof payload.token_type === 'string' ? payload.token_type : undefined,
    };
  }

  private async fetchEmailIntegrationUserEmail(
    provider: EmailIntegrationProvider,
    accessToken: string,
  ): Promise<string | null> {
    const settings = this.getEmailIntegrationSettings(provider);
    const response = await fetch(settings.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || !isPlainRecord(payload)) {
      return null;
    }

    if (typeof payload.email === 'string') {
      return payload.email;
    }

    if (typeof payload.preferred_username === 'string') {
      return payload.preferred_username;
    }

    return null;
  }

  private async upsertEncryptedConfig(
    accountId: string,
    key: string,
    value: string,
  ): Promise<EncryptedConfig> {
    const config =
      (await this.encryptedConfigs.findOne({ where: { accountId, key } })) ??
      this.encryptedConfigs.create({ accountId, key });

    config.value = value;
    return this.encryptedConfigs.save(config);
  }

  private async findSigningCertificateOrFail(
    accountId: string,
    name: string,
  ): Promise<EncryptedConfig> {
    const certificateName = this.normalizeCertificateName(name);
    const certificate = await this.encryptedConfigs.findOne({
      where: {
        accountId,
        key: `${signingCertificatePrefix}${certificateName}`,
      },
    });

    if (!certificate) {
      throw new NotFoundException({ error: 'Signing certificate not found' });
    }

    return certificate;
  }

  toAccountResponse(account: Account): AccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      timezone: account.timezone,
      locale: account.locale,
      archived_at: account.archivedAt,
    };
  }

  private toAccountPreferencesResponse(
    configs: AccountConfig[],
  ): AccountPreferencesResponseDto {
    const configByKey = new Map(configs.map((config) => [config.key, config]));

    return accountPreferenceDefinitions.reduce(
      (response, definition) => ({
        ...response,
        [definition.property]: this.toPreferenceValue(
          configByKey.get(definition.key)?.value,
          definition.defaultValue,
        ),
      }),
      {} as AccountPreferencesResponseDto,
    );
  }

  private toPreferenceValue(value: unknown, defaultValue: unknown): unknown {
    if (typeof defaultValue === 'boolean') {
      return typeof value === 'boolean' ? value : defaultValue;
    }

    if (typeof defaultValue === 'string') {
      return typeof value === 'string' ? value : defaultValue;
    }

    if (this.isSubmitterReminderValue(defaultValue)) {
      return this.isSubmitterReminderValue(value)
        ? {
            first_duration: value.first_duration ?? null,
            second_duration: value.second_duration ?? null,
            third_duration: value.third_duration ?? null,
          }
        : defaultValue;
    }

    if (isPlainRecord(defaultValue)) {
      return isPlainRecord(value)
        ? { ...defaultValue, ...value }
        : defaultValue;
    }

    return value ?? defaultValue;
  }

  private normalizePreferenceValue(property: string, value: unknown): unknown {
    if (property === 'bcc_emails' && typeof value === 'string') {
      return value
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)
        .join(', ');
    }

    if (
      property === 'submitter_reminders' &&
      this.isSubmitterReminderValue(value)
    ) {
      return {
        first_duration: value.first_duration || null,
        second_duration: value.second_duration || null,
        third_duration: value.third_duration || null,
      };
    }

    if (isPlainRecord(value)) {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, nestedValue]) => [
            key,
            typeof nestedValue === 'string' ? nestedValue.trim() : nestedValue,
          ])
          .filter(
            ([, nestedValue]) => !this.isEmptyPreferenceValue(nestedValue),
          ),
      );
    }

    return value;
  }

  private isEmptyPreferenceValue(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }

    if (this.isSubmitterReminderValue(value)) {
      return (
        !value.first_duration && !value.second_duration && !value.third_duration
      );
    }

    if (isPlainRecord(value)) {
      return Object.keys(value).length === 0;
    }

    return false;
  }

  private isSubmitterReminderValue(value: unknown): value is {
    first_duration?: string | null;
    second_duration?: string | null;
    third_duration?: string | null;
  } {
    return (
      isPlainRecord(value) &&
      ('first_duration' in value ||
        'second_duration' in value ||
        'third_duration' in value)
    );
  }

  private assertUploadedFile(
    file: UploadedBufferFile | undefined,
    error: string,
  ): asserts file is UploadedBufferFile {
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException({ error });
    }
  }

  private toLogoResponse(logo: StorageAttachment): AccountLogoResponseDto {
    return {
      uuid: logo.uuid,
      filename: logo.blob.filename,
      content_type: logo.blob.contentType,
      url: this.storageService.createBlobProxyUrl(logo.blob),
    };
  }

  private toSigningCertificateResponse(
    config: EncryptedConfig,
    defaultName: string | null,
  ): SigningCertificateResponseDto {
    const name = config.key.replace(signingCertificatePrefix, '');
    const metadata = parseCertificateConfig(config.value);

    return {
      name,
      filename: metadata.filename,
      valid_to: metadata.valid_to ?? null,
      status: defaultName === name ? 'default' : 'active',
    };
  }

  private normalizeCertificateName(name: string | undefined): string {
    const normalized = (name || '').trim().replace(/\.[a-z0-9]+$/i, '');

    if (!normalized) {
      throw new UnprocessableEntityException({
        error: 'Signing certificate name is required',
      });
    }

    return normalized;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseCertificateConfig(value: string): {
  filename?: string;
  valid_to?: string | null;
} {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isPlainRecord(parsed)
      ? {
          filename:
            typeof parsed.filename === 'string' ? parsed.filename : undefined,
          valid_to:
            typeof parsed.valid_to === 'string' ? parsed.valid_to : null,
        }
      : {};
  } catch {
    return {};
  }
}

function parseEmailIntegrationConfig(value: string): {
  email?: string;
  connected_at?: string | null;
} {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isPlainRecord(parsed)
      ? {
          email: typeof parsed.email === 'string' ? parsed.email : undefined,
          connected_at:
            typeof parsed.connected_at === 'string'
              ? parsed.connected_at
              : null,
        }
      : {};
  } catch {
    return {};
  }
}
