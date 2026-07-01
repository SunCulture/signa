import { TimestampServerAttempt } from './rfc3161-timestamp-client';

export type PdfTimestampEvidence = {
  attempts: TimestampServerAttempt[];
  embedded: boolean;
  required: boolean;
  status: 'disabled' | 'embedded' | 'failed';
  tokenSha256: string | null;
  url: string | null;
};
