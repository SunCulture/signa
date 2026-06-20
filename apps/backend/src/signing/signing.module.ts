import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Template } from '../templates/entities/template.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';
import { PhoneVerificationService } from './phone-verification/phone-verification.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      Submitter,
      Submission,
      SubmissionEvent,
      Template,
    ]),
  ],
  controllers: [SigningController],
  providers: [SigningService, PhoneVerificationService],
})
export class SigningModule {}
