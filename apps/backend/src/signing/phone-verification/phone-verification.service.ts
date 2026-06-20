import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class PhoneVerificationService {
  private readonly client: Twilio | null;
  private readonly verifyServiceSid: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');

    this.verifyServiceSid = this.config.get<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );
    this.client =
      accountSid && authToken && this.verifyServiceSid
        ? twilio(accountSid, authToken)
        : null;
  }

  normalizePhone(input: string): string {
    const phone = parsePhoneNumberFromString(input);

    if (!phone?.isValid()) {
      throw new UnprocessableEntityException({
        error: `${input} phone is invalid`,
      });
    }

    return phone.number;
  }

  async sendCode(input: string): Promise<{ status: string; to: string }> {
    const to = this.normalizePhone(input);
    const client = this.getClient();
    const verification = await client.verify.v2
      .services(this.verifyServiceSid!)
      .verifications.create({ channel: 'sms', to });

    return { status: verification.status, to };
  }

  async checkCode(
    input: string,
    code: string,
  ): Promise<{ status: string; valid: boolean }> {
    const to = this.normalizePhone(input);
    const client = this.getClient();
    const verificationCheck = await client.verify.v2
      .services(this.verifyServiceSid!)
      .verificationChecks.create({ code, to });

    return {
      status: verificationCheck.status,
      valid: verificationCheck.status === 'approved',
    };
  }

  private getClient(): Twilio {
    if (!this.client) {
      throw new ServiceUnavailableException({
        error: 'Phone verification is not configured',
      });
    }

    return this.client;
  }
}
