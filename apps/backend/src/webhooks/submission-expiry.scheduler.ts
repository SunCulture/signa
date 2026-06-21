import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class SubmissionExpiryScheduler {
  private readonly logger = new Logger(SubmissionExpiryScheduler.name);

  constructor(private readonly submissionsService: SubmissionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredSubmissions(): Promise<void> {
    const count = await this.submissionsService.emitExpiredSubmissionEvents();

    if (count > 0) {
      this.logger.log(`Queued webhook events for ${count} expired submissions`);
    }
  }
}
