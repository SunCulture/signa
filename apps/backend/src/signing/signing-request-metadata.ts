import type { Request } from 'express';
import type { SubmissionRequestMetadata } from '../submissions/submission-event-data';

export {
  buildSubmissionEventData as buildEventData,
  parseSignerMetadata,
  type SubmissionRequestMetadata as SigningRequestMetadata,
} from '../submissions/submission-event-data';

export function getSigningRequestMetadata(
  request: Request,
  trackingParam?: string,
  smsTrackingParam?: string,
): SubmissionRequestMetadata {
  return {
    ip: request.ip,
    locale: request.get('x-signa-locale') ?? request.get('accept-language'),
    smsTrackingParam,
    timezone: request.get('x-signa-timezone'),
    trackingParam,
    ua: request.get('user-agent'),
  };
}
