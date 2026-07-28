import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getMailRuntimeConfig } from './mail-runtime-config';

export function createMailerOptions(config: ConfigService): MailerOptions {
  const mail = getMailRuntimeConfig(config);

  return {
    transport: {
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      requireTLS: mail.requireTls,
      connectionTimeout: mail.connectionTimeout,
      socketTimeout: mail.readTimeout,
      ...(mail.name ? { name: mail.name } : {}),
      ...(mail.auth ? { auth: mail.auth } : {}),
      ...(mail.authMethod ? { authMethod: mail.authMethod } : {}),
      tls: {
        rejectUnauthorized: mail.rejectUnauthorized,
      },
    },
    defaults: {
      from: mail.from,
      replyTo: mail.replyTo,
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
