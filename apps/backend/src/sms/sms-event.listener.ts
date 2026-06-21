import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { queueNames } from '../runtime/queue-options';
import { runtimeEvents } from '../runtime/runtime-events';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import type { SubmitterMailEvent } from '../mail/mail.types';

@Injectable()
export class SmsEventListener {
  private readonly logger = new Logger(SmsEventListener.name);

  constructor(@InjectQueue(queueNames.sms) private readonly smsQueue: Queue) {}

  @OnEvent(runtimeEvents.submitterInvitationRequested)
  async handleSubmitterInvitationRequested(
    event: SubmitterMailEvent,
  ): Promise<void> {
    try {
      await this.smsQueue.add(
        runtimeJobNames.deliverSubmitterSms,
        { submitterId: event.submitterId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: true,
        },
      );
      this.logger.log(`Queued SMS job for submitter ${event.submitterId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue SMS job for submitter ${event.submitterId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
