export type SubmissionRequestMetadata = {
  ip?: string;
  smsTrackingParam?: string;
  trackingParam?: string;
  ua?: string;
};

export function buildSubmissionEventData(
  metadata?: SubmissionRequestMetadata,
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  return removeUndefinedValues({
    ...data,
    ip: metadata?.ip,
    ua: metadata?.ua,
  });
}

function removeUndefinedValues(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}
