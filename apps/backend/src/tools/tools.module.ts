import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import { UsersModule } from '../users/users.module';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([CompletedDocument]),
  ],
  controllers: [ToolsController],
  providers: [ToolsService, UserHydrationGuard],
})
export class ToolsModule {}
