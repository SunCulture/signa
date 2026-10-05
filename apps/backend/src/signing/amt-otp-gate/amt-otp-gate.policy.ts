import type { Submitter } from '../../submitters/entities/submitter.entity';

/** Set by AMT on submitters it sends an invitation code to. Signa never sets it itself. */
export const AMT_OTP_REQUIRED_METADATA_KEY = 'amt_otp_required';

export const AMT_OTP_GATE_TOKEN_HEADER = 'x-signa-gate-token';

export const AMT_OTP_GATE_REQUIRED_ERROR = 'amt_otp_gate_required';

export const AMT_OTP_INVALID_CODE_MESSAGE =
  'That code is not valid or has expired';

/** A completed submitter is past the gate: it only guards the signing itself. */
export function isAmtOtpRequired(
  submitter: Pick<Submitter, 'metadata' | 'completedAt'>,
): boolean {
  return (
    submitter.metadata?.[AMT_OTP_REQUIRED_METADATA_KEY] === true &&
    !submitter.completedAt
  );
}

export function readGateToken(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers[AMT_OTP_GATE_TOKEN_HEADER];
  const token = Array.isArray(value) ? value[0] : value;
  return token?.trim() || undefined;
}
