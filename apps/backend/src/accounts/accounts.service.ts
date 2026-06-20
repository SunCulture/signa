import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { throwDatabaseErrors, throwIfNotFound } from '../common/utils/error';
import { User } from '../users/entities/user.entity';
import {
  accountPreferenceDefinitions,
  accountPreferenceKeys,
} from './account-preferences';
import { AccountPreferencesResponseDto } from './dto/account-preferences-response.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { UpdateAccountPreferencesDto } from './dto/update-account-preferences.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountConfig } from './entities/account-config.entity';
import { AccountLinkedAccount } from './entities/account-linked-account.entity';
import { Account } from './entities/account.entity';

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

    for (const definition of accountPreferenceDefinitions) {
      const value = input[definition.property];

      if (typeof value === 'undefined') {
        continue;
      }

      const config =
        existingByKey.get(definition.key) ??
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
        [definition.property]: this.toBooleanPreferenceValue(
          configByKey.get(definition.key)?.value,
          definition.defaultValue,
        ),
      }),
      {} as AccountPreferencesResponseDto,
    );
  }

  private toBooleanPreferenceValue(
    value: unknown,
    defaultValue: boolean,
  ): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
  }
}
