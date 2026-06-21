import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { queueNames } from '../runtime/queue-options';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { SmsEventListener } from './sms-event.listener';
import { SmsProcessor } from './sms.processor';
import { SmsService } from './sms.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: queueNames.sms }),
    TypeOrmModule.forFeature([SubmissionEvent, Submitter]),
  ],
  providers: [SmsEventListener, SmsProcessor, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
