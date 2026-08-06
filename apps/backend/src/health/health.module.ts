import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RuntimeObservabilityService } from './runtime-observability.service';

@Module({
  imports: [StorageModule],
  controllers: [HealthController],
  providers: [HealthService, RuntimeObservabilityService],
  exports: [RuntimeObservabilityService],
})
export class HealthModule {}
