import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AmtOtpGateService } from './amt-otp-gate.service';
import { readGateToken } from './amt-otp-gate.policy';

const CHECK_CURRENT_KEY = 'amt_otp_gate:check_current';
const SKIP_KEY = 'amt_otp_gate:skip';

/** Also asks AMT that the passed challenge is still the signer's newest code, so a resend lapses the gate. */
export const AmtOtpGateCheckCurrent = () =>
  SetMetadata(CHECK_CURRENT_KEY, true);

/** For a route that answers gated signers itself, such as the form payload that renders the gate. */
export const SkipAmtOtpGate = () => SetMetadata(SKIP_KEY, true);

/**
 * Blocks a public `:slug` signing route until an AMT-owned submitter has passed the OTP gate (FSS-793). Routes whose
 * slug only arrives in a multipart body cannot use this guard (it runs before multer) and call the service instead.
 */
@Injectable()
export class AmtOtpGateGuard implements CanActivate {
  constructor(
    private readonly gate: AmtOtpGateService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.flag(context, SKIP_KEY)) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const slug = request.params?.slug;
    await this.gate.assertPassedForSlug(
      typeof slug === 'string' ? slug : undefined,
      readGateToken(request.headers),
      {
        checkCurrent:
          this.flag(context, CHECK_CURRENT_KEY) || completesForm(request),
      },
    );
    return true;
  }

  private flag(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

/** `PUT :slug/values` with `completed: true` finishes the form just as `POST :slug/complete` does. */
function completesForm(request: Request): boolean {
  return (
    (request.body as { completed?: unknown } | undefined)?.completed === true
  );
}
