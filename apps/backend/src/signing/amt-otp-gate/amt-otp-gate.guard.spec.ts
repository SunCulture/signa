import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AmtOtpGateCheckCurrent,
  AmtOtpGateGuard,
  SkipAmtOtpGate,
} from './amt-otp-gate.guard';
import type { AmtOtpGateService } from './amt-otp-gate.service';

class Routes {
  plain() {}

  @AmtOtpGateCheckCurrent()
  complete() {}

  @SkipAmtOtpGate()
  form() {}
}

describe('AmtOtpGateGuard', () => {
  it('checks the slug and gate token header on a plain route', async () => {
    const { guard, gate } = setup();

    await expect(
      guard.canActivate(contextFor('plain', { token: 'gate-token' })),
    ).resolves.toBe(true);
    expect(gate.assertPassedForSlug).toHaveBeenCalledWith(
      'slug-1',
      'gate-token',
      { checkCurrent: false },
    );
  });

  it('re-checks the challenge with AMT on routes that complete the form', async () => {
    const { guard, gate } = setup();

    await guard.canActivate(contextFor('complete', {}));
    await guard.canActivate(contextFor('plain', { body: { completed: true } }));

    expect(gate.assertPassedForSlug).toHaveBeenNthCalledWith(
      1,
      'slug-1',
      undefined,
      { checkCurrent: true },
    );
    expect(gate.assertPassedForSlug).toHaveBeenNthCalledWith(
      2,
      'slug-1',
      undefined,
      { checkCurrent: true },
    );
  });

  it('propagates the 403 when the gate has not been passed', async () => {
    const { guard, gate } = setup();
    gate.assertPassedForSlug.mockRejectedValue(
      new ForbiddenException({ error: 'amt_otp_gate_required' }),
    );

    await expect(
      guard.canActivate(contextFor('plain', {})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('skips routes that answer gated signers themselves', async () => {
    const { guard, gate } = setup();

    await expect(guard.canActivate(contextFor('form', {}))).resolves.toBe(true);
    expect(gate.assertPassedForSlug).not.toHaveBeenCalled();
  });
});

function setup() {
  const gate = { assertPassedForSlug: jest.fn().mockResolvedValue(undefined) };
  const guard = new AmtOtpGateGuard(
    gate as unknown as AmtOtpGateService,
    new Reflector(),
  );
  return { guard, gate };
}

function contextFor(
  handler: keyof Routes,
  { token, body }: { token?: string; body?: unknown },
): ExecutionContext {
  const request = {
    params: { slug: 'slug-1' },
    headers: token ? { 'x-signa-gate-token': token } : {},
    body,
  };
  return {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
