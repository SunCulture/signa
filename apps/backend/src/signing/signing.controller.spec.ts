import type { Request } from 'express';
import type { AmtOtpGateService } from './amt-otp-gate/amt-otp-gate.service';
import { SigningController } from './signing.controller';
import type { SigningService } from './signing.service';

describe('SigningController AMT OTP gate', () => {
  it('returns only the gate payload to a signer who has not passed it', async () => {
    const gated = {
      amt_otp_gate: { required: true },
      submitter: { slug: 'slug-1', name: 'Ada' },
      template: { name: 'Loan agreement' },
    };
    const { controller, signing, gate } = setup(gated);

    const payload = await controller.getSigningForm(
      'slug-1',
      undefined,
      undefined,
      requestWith({ 'x-signa-gate-token': 'stale-token' }),
    );

    expect(payload).toBe(gated);
    expect(payload).not.toHaveProperty('documents');
    expect(payload).not.toHaveProperty('fields');
    expect(gate.gatedFormFor).toHaveBeenCalledWith('slug-1', 'stale-token');
    expect(signing.getSigningForm).not.toHaveBeenCalled();
  });

  it('serves the full form once the gate is passed', async () => {
    const { controller, signing } = setup(null);

    await controller.getSigningForm(
      'slug-1',
      undefined,
      undefined,
      requestWith({}),
    );

    expect(signing.getSigningForm).toHaveBeenCalledWith(
      'slug-1',
      expect.any(Object),
    );
  });
});

function setup(gated: unknown) {
  const signing = { getSigningForm: jest.fn().mockResolvedValue({}) };
  const gate = { gatedFormFor: jest.fn().mockResolvedValue(gated) };
  const controller = new SigningController(
    signing as unknown as SigningService,
    gate as unknown as AmtOtpGateService,
  );
  return { controller, signing, gate };
}

function requestWith(headers: Record<string, string>): Request {
  return {
    headers,
    ip: '127.0.0.1',
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}
