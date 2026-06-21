import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { queueNames } from '../runtime/queue-options';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { canInviteSubmitterBySms, SmsService } from './sms.service';

type SubmitterSmsJobData = {
  submitterId: string;
};

@Processor(queueNames.sms, { concurrency: 3 })
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private readonly sms: SmsService,
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    @InjectRepository(SubmissionEvent)
    private readonly submissionEvents: Repository<SubmissionEvent>,
  ) {
    super();
  }

  async process(job: Job<SubmitterSmsJobData>): Promise<void> {
    if (job.name !== runtimeJobNames.deliverSubmitterSms) {
      this.logger.warn(`Skipped unknown SMS job "${job.name}"`);
      return;
    }

    const submitter = await this.submitters.findOne({
      where: { id: job.data.submitterId },
      relations: {
        account: true,
        submission: { template: true },
      },
    });

    if (!submitter || !canInviteSubmitterBySms(submitter)) {
      return;
    }

    const result = await this.sms.sendSubmitterInvitation(submitter);
    const sentAt = new Date();

    if (!submitter.sentAt) {
      submitter.sentAt = sentAt;
      await this.submitters.save(submitter);
    }

    await this.submissionEvents.save(
      this.submissionEvents.create({
        accountId: submitter.accountId,
        data: {
          message_id: result.messageSid,
          phone: result.to,
          segments: result.segments,
        },
        eventTimestamp: sentAt,
        eventType: 'send_sms',
        submissionId: submitter.submissionId,
        submitterId: submitter.id,
      }),
    );
  }

  @OnWorkerEvent('failed')
  handleFailed(job: Job<SubmitterSmsJobData> | undefined, error: Error): void {
    this.logger.error(
      `SMS job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}
