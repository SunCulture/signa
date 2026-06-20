import type { Request } from 'express';

const redactedValue = '[REDACTED]';
const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'password',
  'password_confirmation',
  'current_password',
  'token',
  'access_token',
  'x-auth-token',
  'jwt_secret',
]);

export type SafeRequestLog = {
  body: unknown;
  query: unknown;
  params: unknown;
};

export function buildSafeRequestLog(request: Request): SafeRequestLog {
  return {
    body: redactValue(request.body),
    query: redactValue(request.query),
    params: redactValue(request.params),
  };
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      shouldRedact(key) ? redactedValue : redactValue(entryValue),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function shouldRedact(key: string): boolean {
  return sensitiveKeys.has(key.toLowerCase());
}
