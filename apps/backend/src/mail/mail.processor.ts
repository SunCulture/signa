import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { runtimeJobNames } from '../runtime/runtime-jobs';
import { queueNames } from '../runtime/queue-options';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { MailDeliveryBuilder } from './mail-delivery.builder';
import { MailService } from './mail.service';
import type {
  MailJobMap,
  MailJobName,
  SendTemplateMailInput,
} from './mail.types';

type MailJob<N extends MailJobName = MailJobName> = Job<MailJobMap[N], void, N>;

@Injectable()
@Processor(queueNames.mail, { concurrency: 3 })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    @InjectRepository(SubmissionEvent)
    private readonly submissionEvents: Repository<SubmissionEvent>,
    @InjectQueue(queueNames.mail)
    private readonly mailQueue: Queue,
    private readonly deliveryBuilder: MailDeliveryBuilder,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: MailJob): Promise<void> {
    this.logger.log(`Processing mail job "${job.name}" [${job.id}]`);

    switch (job.name) {
      case runtimeJobNames.deliverCompletedEmail:
        await this.handleCompleted(
          job as MailJob<typeof runtimeJobNames.deliverCompletedEmail>,
        );
        break;
      case runtimeJobNames.deliverDeclinedEmail:
        await this.handleDeclined(
          job as MailJob<typeof runtimeJobNames.deliverDeclinedEmail>,
        );
        break;
      case runtimeJobNames.deliverDocumentsCopyEmail:
        await this.handleDocumentsCopy(
          job as MailJob<typeof runtimeJobNames.deliverDocumentsCopyEmail>,
        );
        break;
      case runtimeJobNames.deliverReminderEmail:
        await this.handleReminder(
          job as MailJob<typeof runtimeJobNames.deliverReminderEmail>,
        );
        break;
      case runtimeJobNames.deliverSignatureRequestEmail:
        await this.handleInvitation(
          job as MailJob<typeof runtimeJobNames.deliverSignatureRequestEmail>,
        );
        break;
      case runtimeJobNames.deliverSubmitterVerificationEmail:
        await this.handleVerification(
          job as MailJob<
            typeof runtimeJobNames.deliverSubmitterVerificationEmail
          >,
        );
        break;
      default:
        this.logger.warn('Unknown mail job');
    }
  }

  private async handleInvitation(
    job: MailJob<typeof runtimeJobNames.deliverSignatureRequestEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);
    const mail = await this.deliveryBuilder.buildInvitation(submitter);

    if (!mail) {
      this.logger.log(
        `Skipping invitation email for submitter ${submitter.id}`,
      );
      return;
    }

    const result = await this.send(mail);

    if (result === 'sent') {
      submitter.sentAt = submitter.sentAt ?? new Date();
      await this.submitters.save(submitter);
      await this.recordSubmissionEvent(submitter, 'send_email');
    }
  }

  private async handleReminder(
    job: MailJob<typeof runtimeJobNames.deliverReminderEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);
    const mail = await this.deliveryBuilder.buildInvitationReminder(submitter);

    if (!mail) {
      this.logger.log(`Skipping reminder email for submitter ${submitter.id}`);
      return;
    }

    const result = await this.send(mail);

    if (result === 'sent') {
      await this.recordSubmissionEvent(submitter, 'send_reminder_email', {
        reminder_index: job.data.reminderIndex,
      });
    }
  }

  private async handleVerification(
    job: MailJob<typeof runtimeJobNames.deliverSubmitterVerificationEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);
    const otpCode = String(randomInt(100000, 999999));
    const mail = this.deliveryBuilder.buildVerification(submitter, otpCode);

    if (!mail) {
      this.logger.log(
        `Skipping verification email for submitter ${submitter.id}`,
      );
      return;
    }

    const result = await this.send(mail);

    if (result === 'sent') {
      await this.recordSubmissionEvent(submitter, 'send_2fa_email', {
        email: submitter.email,
      });
    }
  }

  private async handleCompleted(
    job: MailJob<typeof runtimeJobNames.deliverCompletedEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);

    if (!this.isSubmissionCompleted(submitter)) {
      await this.queueNextSubmitterInvitation(submitter);
      return;
    }

    if (!this.isLatestCompletedSubmitter(submitter)) {
      return;
    }

    await this.sendMany(
      await this.deliveryBuilder.buildCompletedNotifications(submitter),
    );
    await this.sendMany(
      await this.deliveryBuilder.buildDocumentsCopy(submitter),
    );
  }

  private async handleDocumentsCopy(
    job: MailJob<typeof runtimeJobNames.deliverDocumentsCopyEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);

    await this.sendMany(
      await this.deliveryBuilder.buildDocumentsCopy(submitter),
    );
  }

  private async handleDeclined(
    job: MailJob<typeof runtimeJobNames.deliverDeclinedEmail>,
  ): Promise<void> {
    const submitter = await this.findSubmitter(job.data.submitterId);

    await this.sendMany(
      this.deliveryBuilder.buildDeclined(submitter, job.data.reason),
    );
  }

  private async sendMany(inputs: SendTemplateMailInput[]): Promise<void> {
    for (const input of inputs) {
      await this.send(input);
    }
  }

  private async send(
    input: SendTemplateMailInput,
  ): Promise<'sent' | 'skipped'> {
    const result = await this.mailService.sendTemplate(input);

    return result.status;
  }

  private async findSubmitter(submitterId: string): Promise<Submitter> {
    return this.submitters.findOneOrFail({
      where: { id: submitterId },
      relations: {
        account: true,
        submission: {
          createdByUser: true,
          submitters: true,
          template: {
            author: true,
          },
        },
      },
      order: {
        submission: {
          submitters: {
            id: 'ASC',
          },
        },
      },
    });
  }

  private async recordSubmissionEvent(
    submitter: Submitter,
    eventType: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.submissionEvents.save(
      this.submissionEvents.create({
        accountId: submitter.accountId,
        submissionId: submitter.submissionId,
        submitterId: submitter.id,
        eventType,
        eventTimestamp: new Date(),
        data,
      }),
    );
  }

  private isSubmissionCompleted(submitter: Submitter): boolean {
    return (submitter.submission.submitters ?? []).every(
      (item) => !!item.completedAt,
    );
  }

  private isLatestCompletedSubmitter(submitter: Submitter): boolean {
    const completedAt = submitter.completedAt?.getTime() ?? 0;
    const latestCompletedAt = Math.max(
      ...(submitter.submission.submitters ?? []).map(
        (item) => item.completedAt?.getTime() ?? 0,
      ),
    );

    return completedAt === latestCompletedAt;
  }

  private async queueNextSubmitterInvitation(
    submitter: Submitter,
  ): Promise<void> {
    if (submitter.submission.submittersOrder !== 'preserved') {
      return;
    }

    const nextSubmitter = (submitter.submission.submitters ?? []).find(
      (item) => !item.completedAt && !item.declinedAt && !item.sentAt,
    );

    if (
      !nextSubmitter?.email ||
      nextSubmitter.preferences?.send_email === false
    ) {
      return;
    }

    await this.mailQueue.add(
      runtimeJobNames.deliverSignatureRequestEmail,
      { submitterId: nextSubmitter.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
      },
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: MailJob | undefined, error: Error): void {
    this.logger.error(
      `Mail job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`Mail worker error: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: MailJob): void {
    this.logger.log(`Mail job "${job.name}" [${job.id}] completed`);
  }
}
