import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AmtSubmitterRef = { submissionId: string; submitterId: string };

export type AmtOtpVerifyOutcome =
  | { status: 'verified'; challengeId: string }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type AmtOtpCurrentOutcome = 'current' | 'stale' | 'unavailable';

type AmtPostResult = { ok: true; body: unknown } | { ok: false };

const VERIFY_PATH = '/e-signing/signa/otp/verify';
const CURRENT_PATH = '/e-signing/signa/otp/current';

/**
 * Server-to-server calls to AMT's OTP gate (FSS-793). Fails closed: missing config, a timeout, a non-2xx answer or
 * an unreadable body never opens the gate. Request bodies carry the signer's code, so nothing here logs them.
 */
@Injectable()
export class AmtOtpClient {
  private readonly logger = new Logger(AmtOtpClient.name);

  constructor(private readonly config: ConfigService) {}

  async verify(
    ref: AmtSubmitterRef,
    code: string,
  ): Promise<AmtOtpVerifyOutcome> {
    const result = await this.post(VERIFY_PATH, { ...ref, code });
    if (!result.ok) return { status: 'unavailable' };

    const body = result.body as { ok?: unknown; challengeId?: unknown };
    if (body?.ok === true && typeof body.challengeId === 'string') {
      return { status: 'verified', challengeId: body.challengeId };
    }
    return { status: 'invalid' };
  }

  async isCurrent(
    ref: AmtSubmitterRef,
    challengeId: string,
  ): Promise<AmtOtpCurrentOutcome> {
    const result = await this.post(CURRENT_PATH, { ...ref, challengeId });
    if (!result.ok) return 'unavailable';
    return (result.body as { current?: unknown })?.current === true
      ? 'current'
      : 'stale';
  }

  private async post(path: string, payload: object): Promise<AmtPostResult> {
    const baseUrl = this.config.get<string>('AMT_API_BASE_URL')?.trim();
    const apiKey = this.config.get<string>('AMT_API_KEY')?.trim();
    if (!baseUrl || !apiKey) {
      this.logger.warn(
        'AMT OTP gate is not configured; refusing gated signers',
      );
      return { ok: false };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get<number>('AMT_REQUEST_TIMEOUT_MS', 5_000),
    );

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', api_key: apiKey },
        method: 'POST',
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(`AMT OTP gate ${path} answered ${response.status}`);
        return { ok: false };
      }
      return { ok: true, body: await response.json() };
    } catch (error) {
      this.logger.warn(
        `AMT OTP gate ${path} failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  }
}
