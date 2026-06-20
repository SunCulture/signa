import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailTemplateResolver } from './mail-template-resolver.service';
import type {
  MailAddress,
  MailDeliveryResult,
  SendTemplateMailInput,
} from './mail.types';

type SentMessageInfo = {
  accepted?: unknown;
  rejected?: unknown;
  messageId?: string;
  response?: string;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly templates: MailTemplateResolver,
  ) {}

  onModuleInit(): void {
    const host = this.config.get<string>('MAIL_HOST', 'localhost');
    const port = this.config.get<number>('MAIL_PORT', 1025);
    const secure = this.config.get<boolean>('MAIL_SECURE', false);
    const enabled = this.config.get<boolean>('MAIL_ENABLED', false);
    const authEnabled = this.config.get<boolean>('MAIL_AUTH_ENABLED', false);
    const provider =
      host.includes('localhost') || host.includes('mailpit')
        ? 'local-smtp'
        : 'external-smtp';

    this.logger.log(
      `Mail transport ready: enabled=${enabled} provider=${provider} host=${host} port=${port} secure=${secure} authEnabled=${authEnabled}`,
    );
  }

  getHealthSnapshot(): {
    status: 'up' | 'degraded';
    message: string;
    details: Record<string, unknown>;
  } {
    const enabled = this.config.get<boolean>('MAIL_ENABLED', false);
    const host = this.config.get<string>('MAIL_HOST', 'localhost');
    const port = this.config.get<number>('MAIL_PORT', 1025);

    return {
      status: host && Number.isFinite(port) ? 'up' : 'degraded',
      message: enabled
        ? 'Mail transport is configured.'
        : 'Mail transport is configured but disabled.',
      details: {
        enabled,
        host,
        port,
        secure: this.config.get<boolean>('MAIL_SECURE', false),
        authEnabled: this.config.get<boolean>('MAIL_AUTH_ENABLED', false),
        from: this.formatDefaultFrom(),
      },
    };
  }

  async sendTemplate(
    input: SendTemplateMailInput,
  ): Promise<MailDeliveryResult> {
    this.templates.assertTemplateExists(input.template);

    if (!this.config.get<boolean>('MAIL_ENABLED', false)) {
      this.logger.warn(
        `Mail disabled. Skipping template="${input.template}" to=${formatRecipientLog(input.to)}`,
      );

      return {
        status: 'skipped',
        accepted: [],
        rejected: [],
      };
    }

    const info = await this.send(input);
    const rejected = normalizeStringArray(info.rejected);

    if (rejected.length > 0) {
      throw new InternalServerErrorException({
        error: `SMTP rejected recipient(s): ${rejected.join(', ')}`,
      });
    }

    return {
      status: 'sent',
      accepted: normalizeStringArray(info.accepted),
      rejected,
      messageId: info.messageId,
      response: info.response,
    };
  }

  private async send(input: SendTemplateMailInput): Promise<SentMessageInfo> {
    try {
      const info = (await this.mailer.sendMail({
        to: formatRecipients(input.to),
        from: formatAddress(input.from) ?? this.formatDefaultFrom(),
        replyTo: formatAddress(input.replyTo) ?? undefined,
        subject: input.subject,
        template: input.template,
        context: input.context ?? {},
        attachments: input.attachments,
      })) as SentMessageInfo;

      return info;
    } catch (error) {
      this.logger.error(
        `Failed to send template="${input.template}" to=${formatRecipientLog(input.to)}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private formatDefaultFrom(): string {
    return (
      formatAddress({
        name: this.config.get<string>('MAIL_FROM_NAME', 'Signa'),
        email: this.config.get<string>(
          'MAIL_FROM_ADDRESS',
          'no-reply@signa.local',
        ),
      }) ?? 'no-reply@signa.local'
    );
  }
}

function formatRecipients(input: MailAddress | MailAddress[]): string[] {
  return (Array.isArray(input) ? input : [input])
    .map(formatAddress)
    .filter((address): address is string => !!address);
}

function formatAddress(
  input: MailAddress | string | null | undefined,
): string | undefined {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    return input;
  }

  return input.name ? `"${input.name}" <${input.email}>` : input.email;
}

function formatRecipientLog(input: MailAddress | MailAddress[]): string {
  return formatRecipients(input).join(', ');
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
