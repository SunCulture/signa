import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountConfig } from '../accounts/entities/account-config.entity';
import { StorageModule } from '../storage/storage.module';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { SubmissionsModule } from '../submissions/submissions.module';
import { Template } from '../templates/entities/template.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';
import { PhoneVerificationService } from './phone-verification/phone-verification.service';
import { AttachmentsController } from './attachments.controller';
import { SubmitterTrackingController } from './submitter-tracking.controller';

@Module({
  imports: [
    StorageModule,
    SubmissionsModule,
    TypeOrmModule.forFeature([
      Submitter,
      Submission,
      SubmissionEvent,
      Template,
      AccountConfig,
    ]),
  ],
  controllers: [
    SigningController,
    AttachmentsController,
    SubmitterTrackingController,
  ],
  providers: [SigningService, PhoneVerificationService],
})
export class SigningModule {}
