import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { EmailEvent } from './entities/email-event.entity';
import { EmailMessage } from './entities/email-message.entity';

@Controller('email-events')
@ApiTags('Email Events')
export class MailProviderEventsController {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(EmailEvent)
    private readonly emailEvents: Repository<EmailEvent>,
    @InjectRepository(EmailMessage)
    private readonly emailMessages: Repository<EmailMessage>,
  ) {}

  @Post('provider')
  @ApiOperation({
    description:
      'Receives normalized provider events such as delivered, opened, clicked, bounced, or failed. Supports optional callback secret and Mailgun signature verification.',
    summary: 'Record email provider event',
  })
  @ApiQuery({
    description:
      'Optional callback secret when the provider cannot send the x-signa-callback-secret header.',
    name: 'secret',
    required: false,
  })
  @ApiBody({
    description:
      'Raw provider webhook payload. Arrays and single event objects are accepted.',
    schema: {
      example: {
        email: 'recipient@example.com',
        event: 'delivered',
        message_id: '<mailgun-message-id>',
        timestamp: 1782748800,
      },
      type: 'object',
    },
  })
  async recordProviderEvent(
    @Body() body: unknown,
    @Headers('x-signa-callback-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
  ): Promise<{ status: 'ok' }> {
    this.assertCallbackSecret(headerSecret ?? querySecret);
    this.assertMailgunSignature(body);

    const events = normalizeProviderEvents(body);

    for (const event of events) {
      const message = event.messageId
        ? await this.emailMessages.findOne({
            where: { messageId: event.messageId },
          })
        : null;

      await this.emailEvents.save(
        this.emailEvents.create({
          accountId: message?.accountId ?? null,
          data: event.data,
          email: event.email,
          emailMessageId: message?.id ?? null,
          emailableId: null,
          emailableType: null,
          eventDatetime: event.eventDatetime,
          eventType: event.eventType,
          messageId: event.messageId,
        }),
      );
    }

    return { status: 'ok' };
  }

  @Get('messages')
  @ApiOperation({
    description:
      'Lists recently queued/sent email messages, optionally scoped to one submission or submitter for debugging delivery.',
    summary: 'List email messages',
  })
  @ApiQuery({
    description: 'Optional submission id filter.',
    name: 'submission_id',
    required: false,
  })
  @ApiQuery({
    description: 'Optional submitter id filter.',
    name: 'submitter_id',
    required: false,
  })
  @ApiOkResponse({ type: Object })
  async listMessages(
    @Query('submission_id') submissionId?: string,
    @Query('submitter_id') submitterId?: string,
  ): Promise<{ data: EmailMessage[] }> {
    return {
      data: await this.emailMessages.find({
        where: {
          ...(submissionId ? { submissionId } : {}),
          ...(submitterId ? { submitterId } : {}),
        },
        order: { id: 'DESC' },
        take: 100,
      }),
    };
  }

  @Get('messages/:id/events')
  @ApiParam({ description: 'Email message id.', name: 'id' })
  @ApiOperation({
    description:
      'Lists provider events recorded for a queued email message, including delivery and failure provider payloads.',
    summary: 'List email message events',
  })
  @ApiOkResponse({ type: Object })
  async listMessageEvents(
    @Param('id') id: string,
  ): Promise<{ data: EmailEvent[] }> {
    const message = await this.emailMessages.findOneBy({ id });

    return {
      data: await this.emailEvents.find({
        where: {
          emailMessageId: message?.id ?? id,
        },
        order: { id: 'DESC' },
        take: 100,
      }),
    };
  }

  private assertCallbackSecret(providedSecret: string | undefined): void {
    const configuredSecret = this.config.get<string>('MAIL_CALLBACK_SECRET');

    if (!configuredSecret) {
      return;
    }

    if (providedSecret !== configuredSecret) {
      throw new ForbiddenException({ error: 'Invalid callback secret' });
    }
  }

  private assertMailgunSignature(body: unknown): void {
    const signingKey = this.config.get<string>('MAILGUN_WEBHOOK_SIGNING_KEY');

    if (!signingKey || !isRecord(body) || !isRecord(body.signature)) {
      return;
    }

    const timestamp = stringValue(body.signature.timestamp);
    const token = stringValue(body.signature.token);
    const signature = stringValue(body.signature.signature);

    if (!timestamp || !token || !signature) {
      throw new ForbiddenException({ error: 'Invalid Mailgun signature' });
    }

    const expected = createHmac('sha256', signingKey)
      .update(`${timestamp}${token}`)
      .digest('hex');

    if (!constantTimeEqual(signature, expected)) {
      throw new ForbiddenException({ error: 'Invalid Mailgun signature' });
    }
  }
}

type NormalizedEmailProviderEvent = {
  data: Record<string, unknown>;
  email: string;
  eventDatetime: Date;
  eventType: string;
  messageId: string | null;
};

function normalizeProviderEvents(
  body: unknown,
): NormalizedEmailProviderEvent[] {
  const records = Array.isArray(body) ? body : [body];

  return records.filter(isRecord).map((record) => ({
    data: record,
    email:
      stringValue(record.email) ??
      stringValue(record.recipient) ??
      stringValue(record.to) ??
      'unknown@example.invalid',
    eventDatetime: dateValue(record.timestamp) ?? new Date(),
    eventType:
      stringValue(record.event) ??
      stringValue(record.event_type) ??
      stringValue(record.type) ??
      'provider_event',
    messageId:
      stringValue(record.message_id) ??
      stringValue(record.messageId) ??
      stringValue(record['MessageID']),
  }));
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function dateValue(value: unknown): Date | null {
  if (typeof value === 'number') {
    return new Date(value * 1000);
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
