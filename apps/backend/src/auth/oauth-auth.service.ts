import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
} from 'node:crypto';
import type { JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Account } from '../accounts/entities/account.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { createTeamSlug } from '../teams/team-slug';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  OAuthAuthProvider,
  OAuthStartDto,
  OAuthStartResponseDto,
} from './dto/oauth-auth.dto';
import { hashPassword } from './passwords';
import { assertRegistrationAllowed } from './registration-policy';
import { WebSessionJwtPayload } from './web-session';

type OAuthStatePayload = {
  issued_at: number;
  mode: 'login' | 'register';
  nonce: string;
  provider: OAuthAuthProvider;
};

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
};

type OAuthIdTokenClaims = {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean | string;
  exp?: number;
  family_name?: string;
  given_name?: string;
  iss?: string;
  name?: string;
  nonce?: string;
  preferred_username?: string;
  sub?: string;
  tid?: string;
};

type JwksResponse = {
  keys?: ProviderJsonWebKey[];
};

type ProviderJsonWebKey = NodeJsonWebKey & {
  kid?: string;
};

type OAuthProviderConfig = {
  authorizationEndpoint: string;
  clientId: string;
  clientSecret: string;
  issuer: 'google' | 'microsoft';
  jwksUri: string;
  redirectUri: string;
  scopes: string[];
  tokenEndpoint: string;
  userinfoEndpoint: string;
};

@Injectable()
export class OAuthAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  start(
    provider: OAuthAuthProvider,
    input: OAuthStartDto,
  ): OAuthStartResponseDto {
    this.assertProvider(provider);

    const config = this.getProviderConfig(provider);
    const statePayload: OAuthStatePayload = {
      issued_at: Date.now(),
      mode: input.mode ?? 'login',
      nonce: randomBytes(16).toString('base64url'),
      provider,
    };
    const state = this.signState(statePayload);
    const url = new URL(config.authorizationEndpoint);

    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', statePayload.nonce);

    if (provider === 'google') {
      url.searchParams.set('prompt', 'select_account');
    }

    if (provider === 'microsoft') {
      url.searchParams.set('response_mode', 'query');
      url.searchParams.set('prompt', 'select_account');
    }

    return {
      state,
      url: url.toString(),
    };
  }

  async complete(options: {
    code: string;
    provider: OAuthAuthProvider;
    state: string;
  }): Promise<AuthResponseDto> {
    this.assertProvider(options.provider);

    const state = this.verifyState(options.state);

    if (state.provider !== options.provider) {
      throw new UnauthorizedException({
        error: 'OAuth state provider mismatch',
      });
    }

    const config = this.getProviderConfig(options.provider);
    const tokenResponse = await this.exchangeCode(config, options.code);

    if (!tokenResponse.id_token) {
      throw new UnauthorizedException({
        error: 'OAuth provider did not return an ID token',
      });
    }

    const claims = await this.verifyIdToken(
      config,
      tokenResponse.id_token,
      state.nonce,
    );
    const email = this.resolveVerifiedEmail(claims);
    const { account, user } = await this.findOrCreateUserFromOAuth(
      email,
      claims,
    );

    return this.createAuthResponse(user, account);
  }

  private async exchangeCode(
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    });
    const response = await fetch(config.tokenEndpoint, {
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new UnauthorizedException({
        error: `OAuth token exchange failed: ${await response.text()}`,
      });
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  private async verifyIdToken(
    config: OAuthProviderConfig,
    idToken: string,
    nonce: string,
  ): Promise<OAuthIdTokenClaims> {
    const [encodedHeader, encodedPayload, encodedSignature] =
      idToken.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException({ error: 'Invalid OAuth ID token' });
    }

    const header = this.decodeJwtPart<{ alg?: string; kid?: string }>(
      encodedHeader,
    );

    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException({
        error: 'Unsupported OAuth ID token signature',
      });
    }

    const jwk = await this.findProviderJwk(config.jwksUri, header.kid);
    const publicKey = createPublicKey({ format: 'jwk', key: jwk });
    const isValidSignature = verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, 'base64url'),
    );

    if (!isValidSignature) {
      throw new UnauthorizedException({
        error: 'OAuth ID token signature is invalid',
      });
    }

    const claims = this.decodeJwtPart<OAuthIdTokenClaims>(encodedPayload);

    this.assertProviderClaims(config, claims, nonce);

    return claims;
  }

  private async findProviderJwk(
    jwksUri: string,
    kid: string,
  ): Promise<ProviderJsonWebKey> {
    const response = await fetch(jwksUri, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new UnauthorizedException({
        error: 'Unable to fetch OAuth provider signing keys',
      });
    }

    const jwks = (await response.json()) as JwksResponse;
    const jwk = jwks.keys?.find((key) => key.kid === kid);

    if (!jwk) {
      throw new UnauthorizedException({
        error: 'OAuth provider signing key was not found',
      });
    }

    return jwk;
  }

  private assertProviderClaims(
    config: OAuthProviderConfig,
    claims: OAuthIdTokenClaims,
    nonce: string,
  ): void {
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

    if (!audience.includes(config.clientId)) {
      throw new UnauthorizedException({
        error: 'OAuth ID token audience is invalid',
      });
    }

    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException({
        error: 'OAuth ID token is expired',
      });
    }

    if (claims.nonce !== nonce) {
      throw new UnauthorizedException({
        error: 'OAuth ID token nonce is invalid',
      });
    }

    if (config.issuer === 'google') {
      if (
        claims.iss !== 'https://accounts.google.com' &&
        claims.iss !== 'accounts.google.com'
      ) {
        throw new UnauthorizedException({
          error: 'Google ID token issuer is invalid',
        });
      }
      return;
    }

    if (
      !claims.iss?.startsWith('https://login.microsoftonline.com/') ||
      !claims.iss.endsWith('/v2.0')
    ) {
      throw new UnauthorizedException({
        error: 'Microsoft ID token issuer is invalid',
      });
    }
  }

  private resolveVerifiedEmail(claims: OAuthIdTokenClaims): string {
    const email = claims.email ?? claims.preferred_username;

    if (!email) {
      throw new UnauthorizedException({
        error: 'OAuth provider did not return an email address',
      });
    }

    if (
      claims.email &&
      claims.email_verified !== undefined &&
      claims.email_verified !== true &&
      claims.email_verified !== 'true'
    ) {
      throw new UnauthorizedException({
        error: 'OAuth provider email is not verified',
      });
    }

    return email.toLowerCase();
  }

  private async findOrCreateUserFromOAuth(
    email: string,
    claims: OAuthIdTokenClaims,
  ): Promise<{ account: Account; user: User }> {
    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: { email },
      relations: { account: true },
    });

    if (existingUser) {
      if (existingUser.archivedAt || existingUser.account.archivedAt) {
        throw new UnauthorizedException({ error: 'Account is archived' });
      }

      return { account: existingUser.account, user: existingUser };
    }

    return this.dataSource.transaction(async (manager) => {
      await assertRegistrationAllowed({
        configService: this.configService,
        dataSource: this.dataSource,
        manager,
      });

      const accountRepository = manager.getRepository(Account);
      const teamMemberRepository = manager.getRepository(TeamMember);
      const teamRepository = manager.getRepository(Team);
      const userRepository = manager.getRepository(User);
      const nameParts = this.resolveNameParts(claims, email);
      const account = accountRepository.create({
        locale: 'en-US',
        name: `${nameParts.firstName ?? email.split('@')[0]}'s Workspace`,
        timezone: 'UTC',
      });
      const savedAccount = await accountRepository.save(account);
      const user = userRepository.create({
        accountId: savedAccount.id,
        confirmedAt: new Date(),
        email,
        encryptedPassword: await hashPassword(
          randomBytes(32).toString('base64url'),
        ),
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        role: 'admin',
      });
      const savedUser = await userRepository.save(user);
      const team = teamRepository.create({
        accountId: savedAccount.id,
        createdByUserId: savedUser.id,
        name: savedAccount.name,
        slug: createTeamSlug(savedAccount.name),
      });
      const savedTeam = await teamRepository.save(team);

      await teamMemberRepository.save(
        teamMemberRepository.create({
          accountId: savedAccount.id,
          role: 'manager',
          teamId: savedTeam.id,
          userId: savedUser.id,
        }),
      );

      return { account: savedAccount, user: savedUser };
    });
  }

  private resolveNameParts(
    claims: OAuthIdTokenClaims,
    email: string,
  ): { firstName: string | null; lastName: string | null } {
    if (claims.given_name || claims.family_name) {
      return {
        firstName: claims.given_name ?? null,
        lastName: claims.family_name ?? null,
      };
    }

    if (claims.name) {
      const [firstName, ...rest] = claims.name.trim().split(/\s+/);

      return {
        firstName: firstName || null,
        lastName: rest.join(' ') || null,
      };
    }

    return {
      firstName: email.split('@')[0] || null,
      lastName: null,
    };
  }

  private createAuthResponse(user: User, account: Account): AuthResponseDto {
    const payload: WebSessionJwtPayload = {
      accountId: user.accountId,
      role: user.role,
      sub: user.id,
      userId: user.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      account: {
        id: account.id,
        is_test_mode: false,
        locale: account.locale,
        name: account.name,
        production_account_id: null,
        testing_account_id: null,
        timezone: account.timezone,
      },
      user: {
        email: user.email,
        first_name: user.firstName,
        id: user.id,
        last_name: user.lastName,
        otp_required_for_login: user.otpRequiredForLogin,
        role: user.role,
      },
    };
  }

  private getProviderConfig(provider: OAuthAuthProvider): OAuthProviderConfig {
    if (provider === 'google') {
      return this.assertConfigured({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: this.configService.get<string>('GOOGLE_AUTH_CLIENT_ID', ''),
        clientSecret: this.configService.get<string>(
          'GOOGLE_AUTH_CLIENT_SECRET',
          '',
        ),
        issuer: 'google',
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        redirectUri: this.configService.get<string>(
          'GOOGLE_AUTH_REDIRECT_URI',
          '',
        ),
        scopes: ['openid', 'email', 'profile'],
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
      });
    }

    return this.assertConfigured({
      authorizationEndpoint:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      clientId: this.configService.get<string>('MICROSOFT_AUTH_CLIENT_ID', ''),
      clientSecret: this.configService.get<string>(
        'MICROSOFT_AUTH_CLIENT_SECRET',
        '',
      ),
      issuer: 'microsoft',
      jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      redirectUri: this.configService.get<string>(
        'MICROSOFT_AUTH_REDIRECT_URI',
        '',
      ),
      scopes: ['openid', 'email', 'profile'],
      tokenEndpoint:
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userinfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
    });
  }

  private assertProvider(
    provider: string,
  ): asserts provider is OAuthAuthProvider {
    if (provider !== 'google' && provider !== 'microsoft') {
      throw new BadRequestException({
        error: 'Unsupported OAuth provider',
      });
    }
  }

  private assertConfigured(config: OAuthProviderConfig): OAuthProviderConfig {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new ServiceUnavailableException({
        error:
          'OAuth provider is not configured. Set the client id, client secret, and redirect URI environment variables.',
      });
    }

    return config;
  }

  private signState(payload: OAuthStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string): OAuthStatePayload {
    const [encodedPayload, signature] = state.split('.');

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException({ error: 'Invalid OAuth state' });
    }

    const expectedSignature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException({ error: 'Invalid OAuth state' });
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as OAuthStatePayload;
    const maxAgeMs = 10 * 60 * 1000;

    if (
      !payload.issued_at ||
      Date.now() - payload.issued_at > maxAgeMs ||
      (payload.provider !== 'google' && payload.provider !== 'microsoft')
    ) {
      throw new UnauthorizedException({ error: 'OAuth state expired' });
    }

    return payload;
  }

  private getStateSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'signa-secret');
  }

  private decodeJwtPart<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException({ error: 'Invalid OAuth token payload' });
    }
  }
}
