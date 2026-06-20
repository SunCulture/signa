import { createHash } from 'node:crypto';

const trackingParamLength = 6;

export function buildSubmitterEventTrackingParam(input: {
  eventType?: string;
  secret: string;
  submitterSlug: string;
}): string {
  const tokenPayload = [
    input.submitterSlug,
    input.eventType ?? 'click_email',
    input.secret,
  ].join(':');

  return createHash('sha1')
    .update(tokenPayload)
    .digest('base64url')
    .slice(0, trackingParamLength);
}

export function isValidSubmitterEventTrackingParam(input: {
  eventType?: string;
  secret: string;
  submitterSlug: string;
  trackingParam?: string;
}): boolean {
  if (!input.trackingParam) {
    return false;
  }

  return (
    input.trackingParam ===
    buildSubmitterEventTrackingParam({
      eventType: input.eventType,
      secret: input.secret,
      submitterSlug: input.submitterSlug,
    })
  );
}
