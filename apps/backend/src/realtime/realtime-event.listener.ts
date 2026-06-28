import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  runtimeEvents,
  type RuntimeEventName,
} from '../runtime/runtime-events';
import type { WebhookLifecycleEvent } from '../webhooks/webhook.types';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeEventListener {
  constructor(private readonly realtime: RealtimeService) {}

  @OnEvent(runtimeEvents.formViewed)
  handleFormViewed(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.formViewed, event);
  }

  @OnEvent(runtimeEvents.formStarted)
  handleFormStarted(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.formStarted, event);
  }

  @OnEvent(runtimeEvents.formCompleted)
  handleFormCompleted(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.formCompleted, event);
  }

  @OnEvent(runtimeEvents.formDeclined)
  handleFormDeclined(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.formDeclined, event);
  }

  @OnEvent(runtimeEvents.submissionCreated)
  handleSubmissionCreated(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.submissionCreated, event);
  }

  @OnEvent(runtimeEvents.submissionCompleted)
  handleSubmissionCompleted(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.submissionCompleted, event);
  }

  @OnEvent(runtimeEvents.submissionExpired)
  handleSubmissionExpired(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.submissionExpired, event);
  }

  @OnEvent(runtimeEvents.submissionArchived)
  handleSubmissionArchived(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.submissionArchived, event);
  }

  @OnEvent(runtimeEvents.templateCreated)
  handleTemplateCreated(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.templateCreated, event);
  }

  @OnEvent(runtimeEvents.templateUpdated)
  handleTemplateUpdated(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.templateUpdated, event);
  }

  @OnEvent(runtimeEvents.templateArchived)
  handleTemplateArchived(event: WebhookLifecycleEvent): void {
    this.publish(runtimeEvents.templateArchived, event);
  }

  private publish(
    eventType: RuntimeEventName,
    event: WebhookLifecycleEvent,
  ): void {
    this.realtime.publish({
      account_id: event.accountId,
      data: {
        record_id:
          event.recordId ??
          event.submitterId ??
          event.submissionId ??
          event.templateId ??
          null,
      },
      record_id:
        event.recordId ??
        event.submitterId ??
        event.submissionId ??
        event.templateId,
      submission_id: event.submissionId,
      submitter_id: event.submitterId,
      template_id: event.templateId,
      type: eventType,
    });
  }
}
