import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
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

  normalizePhone(input: string, country?: string | null): string {
    const countryCode = normalizeCountryCode(country);
    const phone = parsePhoneNumberFromString(input, countryCode);

    if (!phone?.isValid()) {
      throw new UnprocessableEntityException({
        error: `${input} phone is invalid`,
      });
    }

    if (countryCode && phone.country !== countryCode) {
      throw new UnprocessableEntityException({
        error: `${input} must be a valid ${countryCode} phone number`,
      });
    }

    return phone.number;
  }

  async sendCode(
    input: string,
    country?: string | null,
  ): Promise<{ status: string; to: string }> {
    const to = this.normalizePhone(input, country);
    const client = this.getClient();
    const verification = await client.verify.v2
      .services(this.verifyServiceSid!)
      .verifications.create({ channel: 'sms', to });

    return { status: verification.status, to };
  }

  async checkCode(
    input: string,
    code: string,
    country?: string | null,
  ): Promise<{ status: string; valid: boolean }> {
    const to = this.normalizePhone(input, country);
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

function normalizeCountryCode(country: string | null | undefined) {
  const normalized = country?.trim().toUpperCase();

  return normalized && /^[A-Z]{2}$/.test(normalized)
    ? (normalized as CountryCode)
    : undefined;
}
