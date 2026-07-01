import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import forge from 'node-forge';
import type * as Forge from 'node-forge';

export type TimestampServerAttempt = {
  error?: string;
  status: 'success' | 'failed';
  url: string;
};

export type TimestampTokenResult = {
  attempts: TimestampServerAttempt[];
  token: Buffer | null;
  url: string | null;
};

const sha256AlgorithmOid = '2.16.840.1.101.3.4.2.1';
const defaultTimestampTimeoutMs = 10_000;

@Injectable()
export class Rfc3161TimestampClient {
  private readonly logger = new Logger(Rfc3161TimestampClient.name);

  constructor(private readonly config: ConfigService) {}

  async assertTimestampServerWorks(value: string): Promise<void> {
    const result = await this.requestTimestampToken({
      digest: createHash('sha256').update('signa-tsa-validation').digest(),
      serverUrls: parseTimestampServerUrls(value),
    });

    if (!result.token) {
      throw new UnprocessableEntityException({
        error: this.buildValidationError(result.attempts),
      });
    }
  }

  async requestTimestampToken(input: {
    digest: Buffer;
    serverUrls: string[];
  }): Promise<TimestampTokenResult> {
    const attempts: TimestampServerAttempt[] = [];

    for (const serverUrl of input.serverUrls) {
      const attempt = await this.requestFromOneServer(serverUrl, input.digest);
      attempts.push(attempt);

      if (attempt.status === 'success' && hasTimestampToken(attempt)) {
        return {
          attempts,
          token: attempt.token,
          url: serverUrl,
        };
      }
    }

    return { attempts, token: null, url: null };
  }

  private async requestFromOneServer(
    serverUrl: string,
    digest: Buffer,
  ): Promise<TimestampServerAttempt & { token?: Buffer }> {
    try {
      const response = await this.postTimestampRequest(serverUrl, digest);
      const responseBody = Buffer.from(await response.arrayBuffer());

      if (!response.ok || responseBody.length === 0) {
        return {
          error: `Unexpected TSA response ${response.status}`,
          status: 'failed',
          url: serverUrl,
        };
      }

      return {
        status: 'success',
        token: parseGrantedTimestampToken(responseBody),
        url: serverUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`RFC3161 timestamp request failed: ${message}`);

      return { error: message, status: 'failed', url: serverUrl };
    }
  }

  private postTimestampRequest(serverUrl: string, digest: Buffer) {
    const url = new URL(serverUrl);
    const headers: Record<string, string> = {
      'content-type': 'application/timestamp-query',
    };

    if (url.username || url.password) {
      headers.authorization = `Basic ${Buffer.from(
        `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`,
      ).toString('base64')}`;
      url.username = '';
      url.password = '';
    }

    return fetch(url, {
      body: new Uint8Array(buildTimestampRequest(digest)),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(this.getTimeoutMs()),
    });
  }

  private buildValidationError(attempts: TimestampServerAttempt[]): string {
    const lastFailure = [...attempts]
      .reverse()
      .find((attempt) => attempt.error);

    return lastFailure?.error
      ? `Invalid timestamp server: ${lastFailure.error}`
      : 'Invalid timestamp server';
  }

  private getTimeoutMs(): number {
    return this.config.get<number>(
      'PDF_TIMESTAMP_TIMEOUT_MS',
      defaultTimestampTimeoutMs,
    );
  }
}

export function parseTimestampServerUrls(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeTimestampServerUrl);
}

export function buildTimestampRequest(digest: Buffer): Buffer {
  const request = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        '\x01',
      ),
      buildMessageImprint(digest),
      buildNonce(),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.BOOLEAN,
        false,
        '\xff',
      ),
    ],
  );

  return Buffer.from(forge.asn1.toDer(request).getBytes(), 'binary');
}

function buildMessageImprint(digest: Buffer) {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(sha256AlgorithmOid).getBytes(),
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.NULL,
            false,
            '',
          ),
        ],
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        digest.toString('binary'),
      ),
    ],
  );
}

function buildNonce() {
  const nonce = randomBytes(16);
  nonce[0] &= 0x7f;

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    nonce.toString('binary'),
  );
}

function parseGrantedTimestampToken(responseBody: Buffer): Buffer {
  const response = forge.asn1.fromDer(responseBody.toString('binary'));
  const statusInfo = getAsn1Child(response, 0, 'timestamp status info');
  const statusValue = getAsn1Child(statusInfo, 0, 'timestamp status');
  const status = parseAsn1Integer(statusValue);

  if (status !== 0 && status !== 1) {
    throw new Error(`Timestamp server rejected request with status ${status}`);
  }

  const token = getOptionalAsn1Child(response, 1);

  if (!token) {
    throw new Error('Timestamp server response did not include a token');
  }

  return Buffer.from(forge.asn1.toDer(token).getBytes(), 'binary');
}

function getAsn1Child(
  node: Forge.asn1.Asn1,
  index: number,
  description: string,
): Forge.asn1.Asn1 {
  const child = getOptionalAsn1Child(node, index);

  if (!child) {
    throw new Error(`Missing ${description}`);
  }

  return child;
}

function getOptionalAsn1Child(
  node: Forge.asn1.Asn1,
  index: number,
): Forge.asn1.Asn1 | null {
  const child = Array.isArray(node.value) ? node.value[index] : null;

  return typeof child === 'string' ? null : (child ?? null);
}

function parseAsn1Integer(node: Forge.asn1.Asn1): number {
  if (typeof node.value !== 'string') {
    throw new Error('Timestamp status was not an integer');
  }

  return Number.parseInt(Buffer.from(node.value, 'binary').toString('hex'), 16);
}

function normalizeTimestampServerUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnprocessableEntityException({
      error: 'Timestamp server URL must use HTTP or HTTPS',
    });
  }

  return value;
}

function hasTimestampToken(
  attempt: TimestampServerAttempt,
): attempt is TimestampServerAttempt & { token: Buffer } {
  return 'token' in attempt && Buffer.isBuffer(attempt.token);
}
