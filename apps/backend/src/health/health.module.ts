import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RuntimeObservabilityService } from './runtime-observability.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, RuntimeObservabilityService],
  exports: [RuntimeObservabilityService],
})
export class HealthModule {}
