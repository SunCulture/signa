import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { runtimeEvents } from '../runtime/runtime-events';
import type { WebhookEventType } from './webhook-events';
import type { WebhookLifecycleEvent } from './webhook.types';
import { WebhooksService } from './webhooks.service';

@Injectable()
export class WebhookEventListener {
  private readonly logger = new Logger(WebhookEventListener.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @OnEvent(runtimeEvents.formViewed)
  handleFormViewed(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('form.viewed', event);
  }

  @OnEvent(runtimeEvents.formStarted)
  handleFormStarted(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('form.started', event);
  }

  @OnEvent(runtimeEvents.formCompleted)
  handleFormCompleted(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('form.completed', event);
  }

  @OnEvent(runtimeEvents.formDeclined)
  handleFormDeclined(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('form.declined', event);
  }

  @OnEvent(runtimeEvents.submissionCreated)
  handleSubmissionCreated(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('submission.created', event);
  }

  @OnEvent(runtimeEvents.submissionCompleted)
  handleSubmissionCompleted(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('submission.completed', event);
  }

  @OnEvent(runtimeEvents.submissionExpired)
  handleSubmissionExpired(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('submission.expired', event);
  }

  @OnEvent(runtimeEvents.submissionArchived)
  handleSubmissionArchived(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('submission.archived', event);
  }

  @OnEvent(runtimeEvents.templateCreated)
  handleTemplateCreated(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('template.created', event);
  }

  @OnEvent(runtimeEvents.templateUpdated)
  handleTemplateUpdated(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('template.updated', event);
  }

  @OnEvent(runtimeEvents.templateArchived)
  handleTemplateArchived(event: WebhookLifecycleEvent): Promise<void> {
    return this.enqueue('template.archived', event);
  }

  private async enqueue(
    eventType: WebhookEventType,
    event: WebhookLifecycleEvent,
  ): Promise<void> {
    const recordId =
      event.recordId ??
      event.submitterId ??
      event.submissionId ??
      event.templateId;

    if (!recordId) {
      this.logger.warn(`Skipped ${eventType} webhook without record id`);
      return;
    }

    await this.webhooksService.enqueueAccountEvent({
      accountId: event.accountId,
      eventType,
      recordId,
    });
  }
}
