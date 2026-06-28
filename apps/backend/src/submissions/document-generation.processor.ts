import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import { queueNames } from '../runtime/queue-options';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Submission } from './entities/submission.entity';
import { SubmissionDocumentsService } from './submission-documents.service';

type DocumentGenerationJobData = {
  submissionId?: string;
  submitterId?: string;
  withAudit?: boolean;
};

@Processor(queueNames.documentGeneration, { concurrency: 2 })
export class DocumentGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentGenerationProcessor.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    private readonly documents: SubmissionDocumentsService,
  ) {
    super();
  }

  async process(job: Job<DocumentGenerationJobData>): Promise<void> {
    switch (job.name) {
      case runtimeJobNames.generateAuditTrailPdf:
        await this.generateAuditTrail(job.data);
        break;
      case runtimeJobNames.generateCombinedPdf:
        await this.generateCombined(job.data);
        break;
      case runtimeJobNames.generateCompletedPdf:
        await this.generateCompleted(job.data);
        break;
      case runtimeJobNames.generatePreviewImages:
        await this.generatePreview(job.data);
        break;
      default:
        this.logger.warn(`Skipped unknown document job "${job.name}"`);
    }
  }

  private async generateAuditTrail(
    data: DocumentGenerationJobData,
  ): Promise<void> {
    const submission = await this.findSubmission(data.submissionId);

    await this.documents.ensureAuditTrail(submission);
  }

  private async generateCombined(
    data: DocumentGenerationJobData,
  ): Promise<void> {
    const submitter = await this.findSubmitter(data.submitterId);

    await this.documents.ensureMergedDocument(submitter, {
      submission: submitter.submission,
      withAudit: data.withAudit ?? true,
    });
  }

  private async generateCompleted(
    data: DocumentGenerationJobData,
  ): Promise<void> {
    const submitter = await this.findSubmitter(data.submitterId);

    await this.documents.processSubmitterCompletion(submitter);
  }

  private async generatePreview(
    data: DocumentGenerationJobData,
  ): Promise<void> {
    const submission = await this.findSubmission(data.submissionId);

    await this.documents.ensurePreviewDocuments(submission);
    await this.documents.ensurePreviewMergedDocument(submission);
  }

  private async findSubmission(
    submissionId: string | undefined,
  ): Promise<Submission> {
    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    return this.submissions.findOneOrFail({
      where: { id: submissionId },
      relations: {
        submissionEvents: true,
        submitters: true,
        template: true,
      },
      order: {
        submissionEvents: { id: 'ASC' },
        submitters: { id: 'ASC' },
      },
    });
  }

  private async findSubmitter(
    submitterId: string | undefined,
  ): Promise<Submitter> {
    if (!submitterId) {
      throw new Error('submitterId is required');
    }

    return this.submitters.findOneOrFail({
      where: { id: submitterId },
      relations: {
        submission: {
          submissionEvents: true,
          submitters: true,
          template: true,
        },
      },
      order: {
        submission: {
          submissionEvents: { id: 'ASC' },
          submitters: { id: 'ASC' },
        },
      },
    });
  }

  @OnWorkerEvent('failed')
  handleFailed(
    job: Job<DocumentGenerationJobData> | undefined,
    error: Error,
  ): void {
    this.logger.error(
      `Document generation job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
