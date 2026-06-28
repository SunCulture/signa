import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import twilio, { Twilio } from 'twilio';
import { buildSubmitterEventTrackingParam } from '../submissions/submission-event-tracking';
import { Submitter } from '../submitters/entities/submitter.entity';

export type SendSubmitterSmsResult = {
  messageSid: string | null;
  segments: number;
  to: string;
};

@Injectable()
export class SmsService {
  private readonly client: Twilio | null;
  private readonly fromPhone: string | undefined;
  private readonly messagingServiceSid: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');

    this.fromPhone = this.config.get<string>('TWILIO_FROM_PHONE');
    this.messagingServiceSid = this.config.get<string>(
      'TWILIO_MESSAGING_SERVICE_SID',
    );
    this.client =
      accountSid && authToken && (this.fromPhone || this.messagingServiceSid)
        ? twilio(accountSid, authToken)
        : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async sendSubmitterInvitation(
    submitter: Submitter,
  ): Promise<SendSubmitterSmsResult> {
    if (!canInviteSubmitterBySms(submitter)) {
      throw new ServiceUnavailableException({
        error: 'Submitter cannot receive SMS invitations',
      });
    }

    const to = normalizePhone(submitter.phone!);
    const client = this.getClient();
    const message = await client.messages.create({
      ...this.getSender(),
      body: this.buildInvitationBody(submitter),
      statusCallback: this.buildStatusCallbackUrl(),
      to,
    });

    return {
      messageSid: message.sid ?? null,
      segments: Number(message.numSegments ?? 1) || 1,
      to,
    };
  }

  buildInvitationBody(submitter: Submitter): string {
    const accountName = submitter.account?.name ?? 'Signa';
    const templateName = submitter.submission.template?.name ?? 'document';
    const link = this.buildSubmitterLink(submitter);

    return `${accountName} has invited you to sign ${templateName}: ${link}`;
  }

  private buildSubmitterLink(submitter: Submitter): string {
    const origin = this.config.get<string>(
      'FRONTEND_ORIGIN',
      'http://localhost:3000',
    );
    const secret = this.config.get<string>('JWT_SECRET', '');
    const trackingParam = buildSubmitterEventTrackingParam({
      eventType: 'click_sms',
      secret,
      submitterSlug: submitter.slug,
    });

    return `${origin}/s/${submitter.slug}?c=${trackingParam}`;
  }

  private getClient(): Twilio {
    if (!this.client) {
      throw new ServiceUnavailableException({
        error:
          'SMS delivery is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE.',
      });
    }

    return this.client;
  }

  private getSender(): { messagingServiceSid: string } | { from: string } {
    if (this.messagingServiceSid) {
      return { messagingServiceSid: this.messagingServiceSid };
    }

    return { from: this.fromPhone! };
  }

  private buildStatusCallbackUrl(): string | undefined {
    const apiBase = this.config.get<string>('API_PUBLIC_URL');

    if (!apiBase) {
      return undefined;
    }

    const secret = this.config.get<string>('SMS_CALLBACK_SECRET');
    const url = new URL(
      `${apiBase.replace(/\/$/, '')}/sms-events/twilio/status`,
    );

    if (secret) {
      url.searchParams.set('secret', secret);
    }

    return url.toString();
  }
}

export function canInviteSubmitterBySms(submitter: Submitter): boolean {
  return (
    Boolean(submitter.phone) &&
    !submitter.completedAt &&
    !submitter.declinedAt &&
    !submitter.submission.archivedAt &&
    !submitter.submission.template?.archivedAt &&
    submitter.preferences?.send_sms === true
  );
}

function normalizePhone(input: string): string {
  const phone = parsePhoneNumberFromString(input);

  return phone?.isValid() ? phone.number : input.replace(/[^0-9+]/g, '');
}
