import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { StorageModule } from '../storage/storage.module';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    TemplatesModule,
    UsersModule,
    TypeOrmModule.forFeature([Submission, Submitter, SubmissionEvent]),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, UserHydrationGuard],
  exports: [SubmissionsService, TypeOrmModule],
})
export class SubmissionsModule {}
