import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { queueNames } from '../runtime/queue-options';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import type { WebhookQueuePayload } from './webhook.types';
import { WebhooksService } from './webhooks.service';

@Processor(queueNames.webhooks, { concurrency: 3 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    @InjectQueue(queueNames.webhooks) private readonly webhookQueue: Queue,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<WebhookQueuePayload>): Promise<void> {
    if (job.name !== runtimeJobNames.deliverWebhook) {
      return;
    }

    const attempt = job.data.attempt ?? 0;
    const delivered = await this.webhooksService.deliverWebhook({
      ...job.data,
      attempt,
    });

    if (!delivered && attempt < this.maxAttempts - 1) {
      await this.webhookQueue.add(
        runtimeJobNames.deliverWebhook,
        {
          ...job.data,
          attempt: attempt + 1,
        },
        {
          delay: Math.pow(2, attempt) * this.backoffMs,
          attempts: 1,
          removeOnComplete: true,
        },
      );
    }

    this.logger.debug(
      `Processed webhook ${job.data.eventType} for record ${job.data.recordId}`,
    );
  }

  private get backoffMs(): number {
    return this.config.get<number>('WEBHOOK_BACKOFF_MS', 30_000);
  }

  private get maxAttempts(): number {
    return this.config.get<number>('WEBHOOK_MAX_ATTEMPTS', 8);
  }
}
