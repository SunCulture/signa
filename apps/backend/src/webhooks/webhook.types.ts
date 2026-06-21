import type { WebhookEventType } from './webhook-events';

export type WebhookQueuePayload = {
  attempt?: number;
  eventType: WebhookEventType;
  eventUuid: string;
  recordId: string;
  webhookUrlId: string;
};

export type WebhookLifecycleEvent = {
  accountId: string;
  recordId?: string;
  submissionId?: string;
  submitterId?: string;
  templateId?: string;
};
