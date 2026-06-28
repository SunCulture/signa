import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import twilio from 'twilio';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';

@Controller('sms-events')
@ApiTags('SMS Events')
export class SmsProviderEventsController {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(SubmissionEvent)
    private readonly submissionEvents: Repository<SubmissionEvent>,
  ) {}

  @Post('twilio/status')
  async recordTwilioStatus(
    @Body() body: unknown,
    @Req() request: Request,
    @Headers('x-signa-callback-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
  ): Promise<{ status: 'ok' }> {
    this.assertCallbackSecret(headerSecret ?? querySecret);
    this.assertTwilioSignature(request, body);

    if (!isRecord(body)) {
      return { status: 'ok' };
    }

    const messageSid = stringValue(body.MessageSid) ?? stringValue(body.SmsSid);
    const status =
      stringValue(body.MessageStatus) ?? stringValue(body.SmsStatus);

    if (!messageSid || !status) {
      return { status: 'ok' };
    }

    const sendEvent = await this.submissionEvents
      .createQueryBuilder('event')
      .where("event.data ->> 'message_id' = :messageSid", { messageSid })
      .orderBy('event.id', 'DESC')
      .getOne();

    if (!sendEvent) {
      return { status: 'ok' };
    }

    await this.submissionEvents.save(
      this.submissionEvents.create({
        accountId: sendEvent.accountId,
        data: body,
        eventTimestamp: new Date(),
        eventType: `sms_${status}`,
        submissionId: sendEvent.submissionId,
        submitterId: sendEvent.submitterId,
      }),
    );

    return { status: 'ok' };
  }

  private assertCallbackSecret(providedSecret: string | undefined): void {
    const configuredSecret = this.config.get<string>('SMS_CALLBACK_SECRET');

    if (!configuredSecret) {
      return;
    }

    if (providedSecret !== configuredSecret) {
      throw new ForbiddenException({ error: 'Invalid callback secret' });
    }
  }

  private assertTwilioSignature(request: Request, body: unknown): void {
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const signature = request.header('x-twilio-signature');

    if (!authToken || !signature || !isRecord(body)) {
      return;
    }

    const publicUrl = this.config.get<string>('PUBLIC_API_URL');
    const url = publicUrl
      ? `${publicUrl}${request.originalUrl}`
      : `${request.protocol}://${request.get('host')}${request.originalUrl}`;

    if (!twilio.validateRequest(authToken, signature, url, body)) {
      throw new ForbiddenException({ error: 'Invalid Twilio signature' });
    }
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
