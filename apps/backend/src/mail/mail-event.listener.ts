import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { runtimeEvents } from '../runtime/runtime-events';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import { queueNames } from '../runtime/queue-options';
import type { MailJobMap, SubmitterMailEvent } from './mail.types';

@Injectable()
export class MailEventListener {
  private readonly logger = new Logger(MailEventListener.name);

  constructor(
    @InjectQueue(queueNames.mail) private readonly mailQueue: Queue,
  ) {}

  @OnEvent(runtimeEvents.submitterInvitationRequested)
  async handleSubmitterInvitationRequested(
    event: SubmitterMailEvent,
  ): Promise<void> {
    await this.enqueue(runtimeJobNames.deliverSignatureRequestEmail, {
      submitterId: event.submitterId,
    });
  }

  @OnEvent(runtimeEvents.submitterVerificationRequested)
  async handleSubmitterVerificationRequested(
    event: SubmitterMailEvent,
  ): Promise<void> {
    await this.enqueue(runtimeJobNames.deliverSubmitterVerificationEmail, {
      submitterId: event.submitterId,
      locale: event.locale,
    });
  }

  @OnEvent(runtimeEvents.formCompleted)
  async handleFormCompleted(event: SubmitterMailEvent): Promise<void> {
    await this.enqueue(runtimeJobNames.deliverCompletedEmail, {
      submitterId: event.submitterId,
    });
  }

  @OnEvent(runtimeEvents.formDeclined)
  async handleFormDeclined(event: SubmitterMailEvent): Promise<void> {
    await this.enqueue(runtimeJobNames.deliverDeclinedEmail, {
      submitterId: event.submitterId,
      reason: event.reason,
    });
  }

  @OnEvent(runtimeEvents.submitterDocumentsCopyRequested)
  async handleSubmitterDocumentsCopyRequested(
    event: SubmitterMailEvent,
  ): Promise<void> {
    await this.enqueue(runtimeJobNames.deliverDocumentsCopyEmail, {
      submitterId: event.submitterId,
    });
  }

  private async enqueue<N extends keyof MailJobMap>(
    name: N,
    data: MailJobMap[N],
  ): Promise<void> {
    try {
      await this.mailQueue.add(name, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
      });
      this.logger.log(
        `Queued mail job "${name}" for submitter ${data.submitterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue mail job "${name}" for submitter ${data.submitterId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
