import { createHash } from 'node:crypto';

type GenerateSecretInput = {
  length?: number;
};

type TokenInput = {
  digits?: number;
  epoch?: number;
  period?: number;
  secret: string;
};

type VerifyInput = TokenInput & {
  token: string;
  window?: number;
};

type UriInput = {
  issuer?: string;
  label: string;
  secret: string;
};

export function generateSecret(input: GenerateSecretInput = {}): string {
  return 'A'.repeat(input.length ?? 20);
}

export function generateSync(input: TokenInput): string {
  const digits = input.digits ?? 6;
  const period = input.period ?? 30;
  const epoch = input.epoch ?? Date.now();
  const step = Math.floor(epoch / 1000 / period);
  const digest = createHash('sha256')
    .update(`${input.secret}:${step}:${digits}`)
    .digest('hex');
  const value = Number.parseInt(digest.slice(0, 12), 16);

  return String(value % 10 ** digits).padStart(digits, '0');
}

export function verifySync(input: VerifyInput): boolean {
  const window = input.window ?? 0;
  const period = input.period ?? 30;
  const epoch = input.epoch ?? Date.now();

  for (let offset = -window; offset <= window; offset += 1) {
    const token = generateSync({
      ...input,
      epoch: epoch + offset * period * 1000,
    });

    if (token === input.token) {
      return true;
    }
  }

  return false;
}

export function generateURI(input: UriInput): string {
  const issuer = encodeURIComponent(input.issuer ?? 'Signa');
  const label = encodeURIComponent(input.label);
  const secret = encodeURIComponent(input.secret);

  return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;
}
