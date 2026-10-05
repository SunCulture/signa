import { ApiError, apiFetch } from "./http";

/**
 * The AMT OTP gate on public signing (FSS-793). The backend hands a short-lived token to a signer who entered the
 * code AMT sent; it lives in sessionStorage per slug and goes out as `X-Signa-Gate-Token` on every slug request.
 */
const GATE_TOKEN_HEADER = "X-Signa-Gate-Token";
const GATE_REQUIRED_ERROR = "amt_otp_gate_required";

type GateRequiredListener = () => void;

const gateRequiredListeners = new Map<string, Set<GateRequiredListener>>();

export type AmtOtpGateTokenResponse = {
  gate_token: string;
  expires_in: number;
};

export function getAmtOtpGateToken(slug: string): string | null {
  try {
    return window.sessionStorage.getItem(gateStorageKey(slug));
  } catch {
    return null;
  }
}

export function hasAmtOtpGateToken(slug: string): boolean {
  return typeof window !== "undefined" && Boolean(getAmtOtpGateToken(slug));
}

export function storeAmtOtpGateToken(slug: string, token: string): void {
  try {
    window.sessionStorage.setItem(gateStorageKey(slug), token);
  } catch {
    // Private browsing can refuse storage; the signer then re-enters the code on the next load.
  }
}

export function clearAmtOtpGateToken(slug: string): void {
  try {
    window.sessionStorage.removeItem(gateStorageKey(slug));
  } catch {
    // Nothing stored, nothing to clear.
  }
}

/** Calls `listener` whenever a request for `slug` comes back 403 `amt_otp_gate_required`. */
export function subscribeAmtOtpGateRequired(
  slug: string,
  listener: GateRequiredListener,
): () => void {
  const listeners = gateRequiredListeners.get(slug) ?? new Set();

  listeners.add(listener);
  gateRequiredListeners.set(slug, listeners);

  return () => listeners.delete(listener);
}

export function verifySigningAmtOtp(
  slug: string,
  code: string,
): Promise<AmtOtpGateTokenResponse> {
  return apiFetch<AmtOtpGateTokenResponse>(`/signing/${slug}/amt-otp/verify`, {
    body: JSON.stringify({ code }),
    method: "POST",
  });
}

/** `apiFetch` for a public signing request: sends the gate token and reacts when the gate has lapsed. */
export async function signingFetch<TResponse>(
  slug: string,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  const token = typeof window === "undefined" ? null : getAmtOtpGateToken(slug);

  if (token) {
    headers.set(GATE_TOKEN_HEADER, token);
  }

  try {
    return await apiFetch<TResponse>(path, { ...init, headers });
  } catch (error) {
    if (isGateRequiredError(error)) {
      clearAmtOtpGateToken(slug);
      gateRequiredListeners.get(slug)?.forEach((listener) => listener());
    }

    throw error;
  }
}

function isGateRequiredError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) {
    return false;
  }

  const details = error.details as { error?: unknown } | null | undefined;

  return details?.error === GATE_REQUIRED_ERROR;
}

function gateStorageKey(slug: string): string {
  return `signa:amt-gate:${slug}`;
}
