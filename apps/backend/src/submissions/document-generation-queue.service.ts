import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { queueNames } from '../runtime/queue-options';
import { runtimeJobNames } from '../runtime/runtime-jobs';

@Injectable()
export class DocumentGenerationQueueService {
  constructor(
    @InjectQueue(queueNames.documentGeneration)
    private readonly queue: Queue,
  ) {}

  async enqueueSubmitterCompletion(submitterId: string): Promise<void> {
    await this.queue.add(runtimeJobNames.generateCompletedPdf, {
      submitterId,
    });
  }

  async enqueueSubmissionArtifacts(submissionId: string): Promise<void> {
    await Promise.all([
      this.queue.add(runtimeJobNames.generateAuditTrailPdf, { submissionId }),
      this.queue.add(runtimeJobNames.generatePreviewImages, { submissionId }),
    ]);
  }
}
