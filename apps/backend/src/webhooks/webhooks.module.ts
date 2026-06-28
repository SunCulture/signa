import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { queueNames } from '../runtime/queue-options';
import { SubmissionsModule } from '../submissions/submissions.module';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { WebhookAttempt } from './entities/webhook-attempt.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { WebhookUrl } from './entities/webhook-url.entity';
import { WebhookEventListener } from './webhook-event.listener';
import { WebhookProcessor } from './webhook.processor';
import { SubmissionExpiryScheduler } from './submission-expiry.scheduler';
import {
  WebhookEventsController,
  WebhooksController,
} from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    SubmissionsModule,
    TemplatesModule,
    BullModule.registerQueue({ name: queueNames.webhooks }),
    BullBoardModule.forFeature({
      name: queueNames.webhooks,
      adapter: BullMQAdapter,
    }),
    TypeOrmModule.forFeature([WebhookUrl, WebhookEvent, WebhookAttempt]),
  ],
  controllers: [WebhooksController, WebhookEventsController],
  providers: [
    WebhooksService,
    WebhookEventListener,
    WebhookProcessor,
    SubmissionExpiryScheduler,
    UserHydrationGuard,
  ],
  exports: [WebhooksService, TypeOrmModule],
})
export class WebhooksModule {}
