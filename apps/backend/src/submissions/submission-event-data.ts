import { UAParser } from 'ua-parser-js';

export type SubmissionRequestMetadata = {
  ip?: string;
  locale?: string;
  smsTrackingParam?: string;
  timezone?: string;
  trackingParam?: string;
  ua?: string;
};

export function buildSubmissionEventData(
  metadata?: SubmissionRequestMetadata,
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  return removeUndefinedValues({
    ...data,
    ...parseSignerMetadata(metadata),
    ip: metadata?.ip,
    locale: metadata?.locale,
    timezone: metadata?.timezone,
    ua: metadata?.ua,
  });
}

export function parseSignerMetadata(
  metadata?: SubmissionRequestMetadata,
): Record<string, unknown> {
  if (!metadata?.ua) {
    return {};
  }

  const result = new UAParser(metadata.ua).getResult();

  return removeUndefinedValues({
    browser: result.browser.name,
    browser_version: result.browser.version,
    device_model: result.device.model,
    device_type: result.device.type ?? 'desktop',
    device_vendor: result.device.vendor,
    os: result.os.name,
    os_version: result.os.version,
  });
}

function removeUndefinedValues(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}
