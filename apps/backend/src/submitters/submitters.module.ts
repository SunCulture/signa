import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Submitter } from './entities/submitter.entity';
import { SubmittersController } from './submitters.controller';
import { SubmittersService } from './submitters.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    UsersModule,
    TypeOrmModule.forFeature([Submitter, Submission, SubmissionEvent]),
  ],
  controllers: [SubmittersController],
  providers: [SubmittersService, UserHydrationGuard],
  exports: [SubmittersService, TypeOrmModule],
})
export class SubmittersModule {}
