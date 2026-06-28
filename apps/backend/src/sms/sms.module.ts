import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { queueNames } from '../runtime/queue-options';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { SmsEventListener } from './sms-event.listener';
import { SmsProcessor } from './sms.processor';
import { SmsProviderEventsController } from './sms-provider-events.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: queueNames.sms }),
    BullBoardModule.forFeature({
      name: queueNames.sms,
      adapter: BullMQAdapter,
    }),
    TypeOrmModule.forFeature([SubmissionEvent, Submitter]),
  ],
  controllers: [SmsProviderEventsController],
  providers: [SmsEventListener, SmsProcessor, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
