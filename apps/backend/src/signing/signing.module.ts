import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    StorageModule,
    SubmissionsModule,
    TypeOrmModule.forFeature([
      Submitter,
      Submission,
      SubmissionEvent,
      Template,
    ]),
  ],
  controllers: [SigningController, AttachmentsController],
  providers: [SigningService, PhoneVerificationService],
})
export class SigningModule {}
