import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { generateSecret, generateSync, generateURI, verifySync } from 'otplib';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Template } from '../templates/entities/template.entity';

const CODE_TTL_SECONDS = 10 * 60;
const EMAIL_OTP_DIGITS = 6;
const EMAIL_OTP_ALGORITHM = 'sha256';
const AUTHENTICATOR_ISSUER = 'Signa Docs';

@Injectable()
export class EmailVerificationCodeService {
  constructor(private readonly config: ConfigService) {}

  generateSubmitterCode(submitter: Submitter, at = new Date()): string {
    return this.generateCode(this.submitterIdentity(submitter), at);
  }

  verifySubmitterCode(
    submitter: Submitter,
    code: string,
    at = new Date(),
  ): boolean {
    return this.verifyCode(this.submitterIdentity(submitter), code, at);
  }

  generateTemplateCode(
    template: Template,
    email: string,
    at = new Date(),
  ): string {
    return this.generateCode(this.templateIdentity(template, email), at);
  }

  verifyTemplateCode(
    template: Template,
    email: string,
    code: string,
    at = new Date(),
  ): boolean {
    return this.verifyCode(this.templateIdentity(template, email), code, at);
  }

  private generateCode(identity: string, at: Date): string {
    return generateSync({
      algorithm: EMAIL_OTP_ALGORITHM,
      digits: EMAIL_OTP_DIGITS,
      epoch: toUnixSeconds(at),
      period: CODE_TTL_SECONDS,
      secret: this.deriveSecret(identity),
    });
  }

  private verifyCode(identity: string, code: string, at: Date): boolean {
    const normalizedCode = code.replace(/\D/g, '');

    if (normalizedCode.length !== EMAIL_OTP_DIGITS) {
      return false;
    }

    const result = verifySync({
      algorithm: EMAIL_OTP_ALGORITHM,
      digits: EMAIL_OTP_DIGITS,
      epoch: toUnixSeconds(at),
      epochTolerance: [CODE_TTL_SECONDS, 0],
      period: CODE_TTL_SECONDS,
      secret: this.deriveSecret(identity),
      token: normalizedCode,
    });

    return result.valid;
  }

  generateAuthenticatorSecret(): string {
    return generateSecret({ length: 20 });
  }

  generateAuthenticatorUri(input: { email: string; secret: string }): string {
    return generateURI({
      issuer: AUTHENTICATOR_ISSUER,
      label: input.email,
      secret: input.secret,
    });
  }

  verifyAuthenticatorCode(input: {
    code: string;
    secret: string;
    at?: Date;
  }): boolean {
    const result = verifySync({
      epoch: toUnixSeconds(input.at ?? new Date()),
      epochTolerance: 30,
      secret: input.secret,
      token: input.code.replace(/\D/g, ''),
    });

    return result.valid;
  }

  private getSecret(): string {
    return this.config.get<string>('JWT_SECRET') || 'signa-email-otp-secret';
  }

  private submitterIdentity(submitter: Submitter): string {
    return [(submitter.email ?? '').toLowerCase().trim(), submitter.slug].join(
      ':',
    );
  }

  private templateIdentity(template: Template, email: string): string {
    return [email.toLowerCase().trim(), template.slug].join(':');
  }

  private deriveSecret(identity: string): Uint8Array {
    return createHmac('sha256', this.getSecret()).update(identity).digest();
  }
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
