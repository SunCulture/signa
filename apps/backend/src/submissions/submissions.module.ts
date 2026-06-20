import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { StorageModule } from '../storage/storage.module';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { CompletedDocument } from './entities/completed-document.entity';
import { CompletedSubmitter } from './entities/completed-submitter.entity';
import { DocumentGenerationEvent } from './entities/document-generation-event.entity';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import { SubmissionDocumentsService } from './submission-documents.service';
import { SubmissionPdfGeneratorService } from './submission-pdf-generator.service';
import { SubmitterValueNormalizer } from './submitter-value-normalizer.service';
import {
  EventsController,
  SubmissionMailController,
  SubmissionsController,
  TemplateSubmissionsController,
} from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    TemplatesModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Submission,
      Submitter,
      SubmissionEvent,
      CompletedDocument,
      CompletedSubmitter,
      DocumentGenerationEvent,
    ]),
  ],
  controllers: [
    SubmissionsController,
    TemplateSubmissionsController,
    EventsController,
    SubmissionMailController,
  ],
  providers: [
    SubmissionsService,
    SubmissionDocumentsService,
    SubmissionPdfGeneratorService,
    SubmitterValueNormalizer,
    UserHydrationGuard,
  ],
  exports: [
    SubmissionsService,
    SubmissionDocumentsService,
    SubmitterValueNormalizer,
    TypeOrmModule,
  ],
})
export class SubmissionsModule {}
