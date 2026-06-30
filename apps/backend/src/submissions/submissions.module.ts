import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { AccountConfig } from '../accounts/entities/account-config.entity';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { EmailMessage } from '../mail/entities/email-message.entity';
import { PdfSignaturesModule } from '../pdf-signatures/pdf-signatures.module';
import { StorageModule } from '../storage/storage.module';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { queueNames } from '../runtime/queue-options';
import { CompletedDocument } from './entities/completed-document.entity';
import { CompletedSubmitter } from './entities/completed-submitter.entity';
import { DocumentGenerationEvent } from './entities/document-generation-event.entity';
import { IdentityVerification } from './entities/identity-verification.entity';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import { DocumentGenerationProcessor } from './document-generation.processor';
import { DocumentGenerationQueueService } from './document-generation-queue.service';
import { SubmissionDocumentsService } from './submission-documents.service';
import { SubmissionExportService } from './submission-export.service';
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
    AccountsModule,
    PdfSignaturesModule,
    StorageModule,
    TemplatesModule,
    UsersModule,
    BullModule.registerQueue({ name: queueNames.documentGeneration }),
    BullBoardModule.forFeature({
      name: queueNames.documentGeneration,
      adapter: BullMQAdapter,
    }),
    TypeOrmModule.forFeature([
      Submission,
      Submitter,
      SubmissionEvent,
      PaymentAttempt,
      IdentityVerification,
      CompletedDocument,
      CompletedSubmitter,
      DocumentGenerationEvent,
      AccountConfig,
      EmailMessage,
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
    DocumentGenerationProcessor,
    DocumentGenerationQueueService,
    SubmissionDocumentsService,
    SubmissionExportService,
    SubmissionPdfGeneratorService,
    SubmitterValueNormalizer,
    UserHydrationGuard,
  ],
  exports: [
    SubmissionsService,
    DocumentGenerationQueueService,
    SubmissionDocumentsService,
    SubmitterValueNormalizer,
    TypeOrmModule,
  ],
})
export class SubmissionsModule {}
