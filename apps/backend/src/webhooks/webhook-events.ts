export const webhookEventTypes = [
  'form.viewed',
  'form.started',
  'form.completed',
  'form.declined',
  'submission.created',
  'submission.completed',
  'submission.expired',
  'submission.archived',
  'template.created',
  'template.updated',
  'template.archived',
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];

export function isWebhookEventType(value: string): value is WebhookEventType {
  return webhookEventTypes.includes(value as WebhookEventType);
}

export function getWebhookRecordKind(
  eventType: WebhookEventType,
): 'form' | 'submission' | 'template' {
  return eventType.split('.')[0] as 'form' | 'submission' | 'template';
}
