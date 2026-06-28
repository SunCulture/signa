import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function createMailerOptions(config: ConfigService): MailerOptions {
  return {
    transport: createMailerTransport(config),
    defaults: {
      from: formatEmailAddress({
        name: config.get<string>('MAIL_FROM_NAME', 'Signa'),
        address: config.get<string>('MAIL_FROM_ADDRESS', 'no-reply@signa.com'),
      }),
      replyTo: config.get<string>('MAIL_REPLY_TO') || undefined,
    },
    template: {
      dir: resolveMailTemplateDirectory(config),
      adapter: new HandlebarsAdapter(undefined, {
        inlineCssEnabled: true,
      }),
      options: {
        strict: true,
      },
    },
  };
}

function createMailerTransport(config: ConfigService) {
  const shouldUseAuth = config.get<boolean>('MAIL_AUTH_ENABLED', false);

  return {
    host: config.get<string>('MAIL_HOST', 'localhost'),
    port: config.get<number>('MAIL_PORT', 1025),
    secure: config.get<boolean>('MAIL_SECURE', false),
    ...(shouldUseAuth
      ? {
          auth: {
            user: config.getOrThrow<string>('MAIL_USER'),
            pass: config.getOrThrow<string>('MAIL_PASS'),
          },
        }
      : {}),
    tls: {
      rejectUnauthorized: config.get<boolean>(
        'MAIL_TLS_REJECT_UNAUTHORIZED',
        false,
      ),
    },
  };
}

function formatEmailAddress(input: { name: string; address: string }) {
  return `"${input.name}" <${input.address}>`;
}

function resolveMailTemplateDirectory(config: ConfigService) {
  const configuredDirectory = config.get<string>('MAIL_TEMPLATE_DIR');

  if (configuredDirectory) {
    return configuredDirectory;
  }

  const candidates = [
    join(__dirname, 'templates'),
    join(process.cwd(), 'dist', 'src', 'mail', 'templates'),
    join(process.cwd(), 'dist', 'mail', 'templates'),
    join(process.cwd(), 'src', 'mail', 'templates'),
    join(process.cwd(), 'apps', 'backend', 'src', 'mail', 'templates'),
  ];

  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    join(process.cwd(), 'apps', 'backend', 'src', 'mail', 'templates')
  );
}
