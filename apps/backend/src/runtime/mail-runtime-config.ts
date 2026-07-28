import { ConfigService } from '@nestjs/config';

export type MailRuntimeConfig = {
  auth:
    | {
        pass: string;
        user: string;
      }
    | undefined;
  authMethod: string | undefined;
  connectionTimeout: number;
  enabled: boolean;
  from: string;
  host: string;
  name: string | undefined;
  port: number;
  readTimeout: number;
  rejectUnauthorized: boolean;
  replyTo: string | undefined;
  requireTls: boolean;
  secure: boolean;
};

/**
 * Resolves the deployment-wide SMTP transport.
 *
 * SMTP_* is the preferred self-hosted contract and mirrors DocuSeal. MAIL_*
 * remains supported so existing Signa deployments can upgrade without a flag
 * day. Supplying SMTP_ADDRESS is enough to enable delivery.
 */
export function getMailRuntimeConfig(config: ConfigService): MailRuntimeConfig {
  const smtpHost = getOptionalString(config, 'SMTP_ADDRESS');
  const host = smtpHost ?? config.get<string>('MAIL_HOST', 'localhost');
  const port = smtpHost
    ? (getOptionalNumber(config, 'SMTP_PORT') ?? 587)
    : config.get<number>('MAIL_PORT', 1025);
  const username =
    getOptionalString(config, 'SMTP_USERNAME') ??
    getOptionalString(config, 'MAIL_USER');
  const password =
    getOptionalString(config, 'SMTP_PASSWORD') ??
    getOptionalString(config, 'MAIL_PASS');
  const legacyAuthEnabled = config.get<boolean>('MAIL_AUTH_ENABLED', false);
  const authEnabled = legacyAuthEnabled || Boolean(username || password);
  const enabled =
    Boolean(smtpHost) || config.get<boolean>('MAIL_ENABLED', false);

  if (enabled && authEnabled && (!username || !password)) {
    throw new Error(
      'SMTP authentication requires both SMTP_USERNAME and SMTP_PASSWORD.',
    );
  }

  const secure =
    (getOptionalBoolean(config, 'SMTP_ENABLE_SSL') ??
      getOptionalBoolean(config, 'SMTP_ENABLE_TLS') ??
      config.get<boolean>('MAIL_SECURE', false)) ||
    port === 465;
  const requireTls =
    getOptionalBoolean(config, 'SMTP_ENABLE_STARTTLS') ?? Boolean(smtpHost);
  const rejectUnauthorized =
    getOptionalBoolean(config, 'SMTP_SSL_VERIFY') ??
    config.get<boolean>('MAIL_TLS_REJECT_UNAUTHORIZED', true);

  return {
    auth:
      authEnabled && username && password
        ? {
            pass: password,
            user: username,
          }
        : undefined,
    authMethod: getOptionalString(config, 'SMTP_AUTHENTICATION')?.toUpperCase(),
    connectionTimeout: getTimeoutMs(config, 'SMTP_OPEN_TIMEOUT', 15),
    enabled,
    from: getDefaultFrom(config),
    host,
    name: getOptionalString(config, 'SMTP_DOMAIN'),
    port,
    readTimeout: getTimeoutMs(config, 'SMTP_READ_TIMEOUT', 25),
    rejectUnauthorized,
    replyTo:
      getOptionalString(config, 'SMTP_REPLY_TO') ??
      getOptionalString(config, 'MAIL_REPLY_TO'),
    requireTls: !secure && requireTls,
    secure,
  };
}

export function getDefaultMailSenderName(config: ConfigService): string {
  const smtpFrom = getOptionalString(config, 'SMTP_FROM');
  const nameMatch = smtpFrom?.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);

  return (
    nameMatch?.[1]?.trim() || config.get<string>('MAIL_FROM_NAME', 'Signa')
  );
}

function getDefaultFrom(config: ConfigService): string {
  const smtpFrom = getOptionalString(config, 'SMTP_FROM');

  if (smtpFrom) {
    if (smtpFrom.includes('<')) {
      return smtpFrom;
    }

    return formatEmailAddress({
      address: smtpFrom,
      name: config.get<string>('MAIL_FROM_NAME', 'Signa'),
    });
  }

  return formatEmailAddress({
    address: config.get<string>('MAIL_FROM_ADDRESS', 'no-reply@signa.com'),
    name: config.get<string>('MAIL_FROM_NAME', 'Signa'),
  });
}

function formatEmailAddress(input: { address: string; name: string }): string {
  return `"${input.name.replaceAll('"', '\\"')}" <${input.address}>`;
}

function getOptionalBoolean(
  config: ConfigService,
  key: string,
): boolean | undefined {
  const value = config.get<boolean | string>(key);

  if (value === undefined || value === '') {
    return undefined;
  }

  return typeof value === 'boolean' ? value : value.toLowerCase() === 'true';
}

function getOptionalNumber(
  config: ConfigService,
  key: string,
): number | undefined {
  const value = config.get<number | string>(key);

  if (value === undefined || value === '') {
    return undefined;
  }

  return typeof value === 'number' ? value : Number(value);
}

function getOptionalString(
  config: ConfigService,
  key: string,
): string | undefined {
  const value = config.get<string>(key)?.trim();

  return value || undefined;
}

function getTimeoutMs(
  config: ConfigService,
  key: string,
  defaultSeconds: number,
): number {
  return (getOptionalNumber(config, key) ?? defaultSeconds) * 1000;
}
