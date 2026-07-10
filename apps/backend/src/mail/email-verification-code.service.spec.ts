import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { EmailVerificationCodeService } from './email-verification-code.service';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Template } from '../templates/entities/template.entity';

type OtplibGenerateInput = {
  epoch: number;
  secret: Uint8Array;
};

type OtplibUriInput = {
  issuer: string;
  label: string;
  secret: string;
};

type OtplibVerifyInput = OtplibGenerateInput & {
  epochTolerance?: number | [number, number];
  token: string;
};

jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateSync: jest.fn(({ epoch, secret }: OtplibGenerateInput) =>
    buildMockCode(secret, epoch),
  ),
  generateURI: jest.fn(({ issuer, label, secret }: OtplibUriInput) => {
    const params = new URLSearchParams({ issuer, secret });

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;
  }),
  verifySync: jest.fn(
    ({ epoch, epochTolerance, secret, token }: OtplibVerifyInput) => {
      const tolerance = Array.isArray(epochTolerance)
        ? epochTolerance[0]
        : Number(epochTolerance ?? 0);
      const current = Number(epoch);
      const acceptedEpochs = [current, current - tolerance].filter(
        Number.isFinite,
      );

      return {
        valid: acceptedEpochs.some(
          (acceptedEpoch) => buildMockCode(secret, acceptedEpoch) === token,
        ),
      };
    },
  ),
}));

describe('EmailVerificationCodeService', () => {
  let service: EmailVerificationCodeService;

  beforeEach(() => {
    service = new EmailVerificationCodeService({
      get: jest.fn((key: string, fallback?: unknown) =>
        key === 'JWT_SECRET' ? 'test-secret' : fallback,
      ),
    } as unknown as ConfigService);
  });

  it('generates deterministic submitter codes with otplib TOTP verification', () => {
    const submitter = {
      email: 'ADA@example.com',
      slug: 'submitter-slug',
    } as Submitter;
    const at = new Date('2026-06-21T12:00:00.000Z');
    const code = service.generateSubmitterCode(submitter, at);

    expect(code).toMatch(/^\d{6}$/);
    expect(service.generateSubmitterCode(submitter, at)).toBe(code);
    expect(service.verifySubmitterCode(submitter, code, at)).toBe(true);
    expect(service.verifySubmitterCode(submitter, '000000', at)).toBe(false);
  });

  it('verifies template shared-link codes from email and template slug', () => {
    const template = {
      slug: 'template-slug',
    } as Template;
    const at = new Date('2026-06-21T12:00:00.000Z');
    const code = service.generateTemplateCode(template, 'ADA@example.com', at);

    expect(
      service.verifyTemplateCode(template, 'ada@example.com', code, at),
    ).toBe(true);
    expect(
      service.verifyTemplateCode(template, 'other@example.com', code, at),
    ).toBe(false);
  });

  it('generates authenticator app secrets and otpauth URIs', () => {
    const secret = service.generateAuthenticatorSecret();
    const uri = service.generateAuthenticatorUri({
      email: 'ada@example.com',
      secret,
    });

    expect(secret).toBeTruthy();
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('issuer=Signa+Docs');
  });
});

function buildMockCode(secret: Uint8Array, epoch: number): string {
  return createHash('sha1')
    .update(Buffer.from(secret))
    .update(String(epoch))
    .digest('hex')
    .replace(/\D/g, '')
    .padEnd(6, '0')
    .slice(0, 6);
}
