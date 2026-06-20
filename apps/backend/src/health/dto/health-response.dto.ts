import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type HealthDependencyStatus = 'up' | 'down' | 'degraded';
export type HealthStatus = 'ok' | 'degraded' | 'error';

export class HealthDependencyDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down', 'degraded'] })
  status: HealthDependencyStatus;

  @ApiPropertyOptional({ example: 12 })
  latencyMs?: number;

  @ApiPropertyOptional({
    example: 'Database query failed. Verify PostgreSQL connectivity.',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional structured details for operators.',
    example: { path: 'storage' },
  })
  details?: Record<string, unknown>;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded', 'error'] })
  status: HealthStatus;

  @ApiProperty({ example: 'backend' })
  service: string;

  @ApiProperty({ example: '0.0.1' })
  version: string;

  @ApiProperty({ example: 'development' })
  environment: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 12345 })
  uptimeSeconds: number;

  @ApiPropertyOptional({
    example: 'Core dependencies are ready to serve traffic.',
  })
  message?: string;

  @ApiPropertyOptional({ type: HealthDependencyDto })
  database?: HealthDependencyDto;

  @ApiPropertyOptional({ type: HealthDependencyDto })
  redis?: HealthDependencyDto;

  @ApiPropertyOptional({ type: HealthDependencyDto })
  storage?: HealthDependencyDto;

  @ApiPropertyOptional({ type: HealthDependencyDto })
  memory?: HealthDependencyDto;

  @ApiPropertyOptional({ type: HealthDependencyDto })
  apiPerformance?: HealthDependencyDto;
}
