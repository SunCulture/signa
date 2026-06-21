import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const secretPrefix = 'whsec_';
const secretBytes = 24;
const signatureToleranceSeconds = 5 * 60;

export function generateWebhookSecret(): string {
  return `${secretPrefix}${randomBytes(secretBytes).toString('base64')}`;
}

export function signWebhookPayload(options: {
  body: string;
  secret: string;
  timestamp?: number;
}): string {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', options.secret)
    .update(`${timestamp}.${options.body}`)
    .digest('hex');

  return `${timestamp}.${signature}`;
}

export function verifyWebhookSignature(options: {
  body: string;
  header: string;
  secret: string;
  now?: number;
}): boolean {
  const [timestampValue, signature] = options.header.split('.', 2);
  const timestamp = Number(timestampValue);

  if (!Number.isFinite(timestamp) || !signature) {
    return false;
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);

  if (
    timestamp < now - signatureToleranceSeconds ||
    timestamp > now + signatureToleranceSeconds
  ) {
    return false;
  }

  const expected = signWebhookPayload({
    body: options.body,
    secret: options.secret,
    timestamp,
  }).split('.')[1];

  return secureCompare(signature, expected);
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
