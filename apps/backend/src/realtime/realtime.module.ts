import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeEventListener } from './realtime-event.listener';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [RealtimeController],
  providers: [RealtimeEventListener, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
