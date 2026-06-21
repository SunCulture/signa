import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountConfig } from '../accounts/entities/account-config.entity';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import { Account } from '../accounts/entities/account.entity';
import { queueNames } from '../runtime/queue-options';
import { StorageModule } from '../storage/storage.module';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Template } from '../templates/entities/template.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { User } from '../users/entities/user.entity';
import { MailEventListener } from './mail-event.listener';
import { MailProcessor } from './mail.processor';
import { MailBrandingService } from './mail-branding.service';
import { MailDeliveryBuilder } from './mail-delivery.builder';
import { MailReminderScheduler } from './mail-reminder.scheduler';
import { MailService } from './mail.service';
import { MailTemplateResolver } from './mail-template-resolver.service';
import { EmailEvent } from './entities/email-event.entity';
import { EmailMessage } from './entities/email-message.entity';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({ name: queueNames.mail }),
    TypeOrmModule.forFeature([
      Account,
      AccountConfig,
      EncryptedConfig,
      EmailEvent,
      EmailMessage,
      Submission,
      SubmissionEvent,
      Submitter,
      Template,
      User,
    ]),
  ],
  providers: [
    MailBrandingService,
    MailDeliveryBuilder,
    MailEventListener,
    MailProcessor,
    MailReminderScheduler,
    MailService,
    MailTemplateResolver,
  ],
  exports: [MailService, MailTemplateResolver],
})
export class MailModule {}
