import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Submitter } from '../../submitters/entities/submitter.entity';
import type { AmtOtpClient } from './amt-otp.client';
import { AmtOtpGateService } from './amt-otp-gate.service';

const SESSION_SECRET = 'session-secret';

describe('AmtOtpGateService', () => {
  it('hands out a gate token and records the event when AMT accepts the code', async () => {
    const { service, amt, events } = setup();

    const result = await service.verify('slug-1', '123456');

    expect(amt.verify).toHaveBeenCalledWith(
      { submissionId: 'submission-1', submitterId: 'submitter-1' },
      '123456',
    );
    expect(result.expires_in).toBe(7200);
    expect(events.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'amt_otp_verified' }),
    );
    await expect(
      service.assertPassedForSlug('slug-1', result.gate_token, {
        checkCurrent: false,
      }),
    ).resolves.toBeUndefined();
  });

  it('answers a wrong, reused or revoked code with one generic 422', async () => {
    const { service, amt, events } = setup();
    amt.verify.mockResolvedValue({ status: 'invalid' });

    const attempt = service.verify('slug-1', '000000');

    await expect(attempt).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(attempt).rejects.toMatchObject({
      response: { error: 'That code is not valid or has expired' },
    });
    expect(events.save).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when AMT cannot be reached', async () => {
    const { service, amt } = setup();
    amt.verify.mockResolvedValue({ status: 'unavailable' });

    await expect(service.verify('slug-1', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('refuses a code for an unknown slug or a signer AMT did not mark', async () => {
    const unknown = setup({ submitter: null });
    await expect(
      unknown.service.verify('nope', '123456'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const unmarked = setup({ submitter: createSubmitter({ metadata: {} }) });
    await expect(
      unmarked.service.verify('slug-1', '123456'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(unmarked.amt.verify).not.toHaveBeenCalled();
  });

  it('blocks a gated signer without a token', async () => {
    const { service } = setup();

    await expect(
      service.assertPassedForSlug('slug-1', undefined, { checkCurrent: false }),
    ).rejects.toMatchObject({
      response: { error: 'amt_otp_gate_required' },
    });
  });

  it('rejects a token issued for another slug', async () => {
    const { service, jwt } = setup();
    const otherSlugToken = await gateToken(jwt, { sub: 'slug-2' });

    await expect(
      service.assertPassedForSlug('slug-1', otherSlugToken, {
        checkCurrent: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never accepts a session JWT as a gate token', async () => {
    const { service, jwt } = setup();
    const sessionToken = await jwt.signAsync(
      { typ: 'amt_otp_gate', sub: 'slug-1', cid: 'challenge-1' },
      { secret: SESSION_SECRET },
    );

    await expect(
      service.assertPassedForSlug('slug-1', sessionToken, {
        checkCurrent: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lapses the gate once AMT has resent a newer code', async () => {
    const { service, amt, jwt } = setup();
    amt.isCurrent.mockResolvedValue('stale');
    const token = await gateToken(jwt);

    await expect(
      service.assertPassedForSlug('slug-1', token, { checkCurrent: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(amt.isCurrent).toHaveBeenCalledWith(
      { submissionId: 'submission-1', submitterId: 'submitter-1' },
      'challenge-1',
    );
  });

  it('fails closed when AMT cannot confirm the challenge is current', async () => {
    const { service, amt, jwt } = setup();
    amt.isCurrent.mockResolvedValue('unavailable');

    await expect(
      service.assertPassedForSlug('slug-1', await gateToken(jwt), {
        checkCurrent: true,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lets ungated, completed and unknown signers through untouched', async () => {
    for (const submitter of [
      createSubmitter({ metadata: {} }),
      createSubmitter({ completedAt: new Date() }),
      null,
    ]) {
      const { service, amt } = setup({ submitter });
      await expect(
        service.assertPassedForSlug('slug-1', undefined, {
          checkCurrent: true,
        }),
      ).resolves.toBeUndefined();
      expect(amt.isCurrent).not.toHaveBeenCalled();
    }
  });

  it('serves a gated form payload with no documents or fields', async () => {
    const { service } = setup();

    const payload = await service.gatedFormFor('slug-1', undefined);

    expect(payload).toEqual({
      amt_otp_gate: { required: true },
      submitter: { slug: 'slug-1', name: 'Ada' },
      template: { name: 'Loan agreement' },
    });
  });

  it('serves the full form once the gate is passed and still current', async () => {
    const { service, jwt } = setup();

    await expect(
      service.gatedFormFor('slug-1', await gateToken(jwt)),
    ).resolves.toBeNull();
  });
});

type SetupOptions = { submitter?: Submitter | null };

function setup({ submitter = createSubmitter() }: SetupOptions = {}) {
  const jwt = new JwtService({ secret: SESSION_SECRET });
  const amt = {
    verify: jest
      .fn()
      .mockResolvedValue({ status: 'verified', challengeId: 'challenge-1' }),
    isCurrent: jest.fn().mockResolvedValue('current'),
  };
  const events = {
    create: jest.fn((event: unknown) => event),
    save: jest.fn((event: unknown) => Promise.resolve(event)),
  };
  const submitters = { findOne: jest.fn().mockResolvedValue(submitter) };
  const config = { get: jest.fn(() => SESSION_SECRET) };
  const service = new AmtOtpGateService(
    submitters as never,
    events as never,
    amt as unknown as AmtOtpClient,
    jwt,
    config as never,
  );
  return { service, amt, events, jwt };
}

function gateToken(
  jwt: JwtService,
  claims: Partial<{ sub: string; cid: string }> = {},
): Promise<string> {
  return jwt.signAsync(
    { typ: 'amt_otp_gate', sub: 'slug-1', cid: 'challenge-1', ...claims },
    { secret: `${SESSION_SECRET}:amt_otp_gate`, expiresIn: 60 },
  );
}

function createSubmitter(overrides: Partial<Submitter> = {}): Submitter {
  return {
    id: 'submitter-1',
    slug: 'slug-1',
    name: 'Ada',
    accountId: 'account-1',
    submissionId: 'submission-1',
    metadata: { amt_otp_required: true },
    completedAt: null,
    submission: { template: { name: 'Loan agreement' } },
    ...overrides,
  } as unknown as Submitter;
}
