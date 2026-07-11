import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type HealthDependencyStatus = 'up' | 'down' | 'degraded';
export type HealthStatus = 'ok' | 'degraded' | 'error';

export class HealthDependencyDto {
  @ApiProperty({
    description: 'Dependency status.',
    example: 'up',
    enum: ['up', 'down', 'degraded'],
  })
  status: HealthDependencyStatus;

  @ApiPropertyOptional({
    description: 'Measured dependency latency in milliseconds.',
    example: 12,
  })
  latencyMs?: number;

  @ApiPropertyOptional({
    description: 'Operator-readable dependency status message.',
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
  @ApiProperty({
    description: 'Overall service health status.',
    example: 'ok',
    enum: ['ok', 'degraded', 'error'],
  })
  status: HealthStatus;

  @ApiProperty({ description: 'Service name.', example: 'backend' })
  service: string;

  @ApiProperty({ description: 'Application version.', example: '0.0.1' })
  version: string;

  @ApiPropertyOptional({
    description: 'Git commit SHA for the deployed build, when provided.',
    example: '4305457a1f4b0c2d9e8f1234567890abcdef1234',
  })
  commitSha?: string;

  @ApiPropertyOptional({
    description: 'UTC build timestamp for the deployed artifact, when provided.',
    example: '2026-07-11T10:00:00.000Z',
  })
  buildTime?: string;

  @ApiProperty({
    description: 'Runtime environment name.',
    example: 'development',
  })
  environment: string;

  @ApiProperty({
    description: 'UTC timestamp when the health response was generated.',
    example: '2026-06-19T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Process uptime in seconds.',
    example: 12345,
  })
  uptimeSeconds: number;

  @ApiPropertyOptional({
    description: 'Human-readable summary of the health result.',
    example: 'Core dependencies are ready to serve traffic.',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Database health and latency details.',
    type: HealthDependencyDto,
  })
  database?: HealthDependencyDto;

  @ApiPropertyOptional({
    description: 'Redis/queue health and latency details.',
    type: HealthDependencyDto,
  })
  redis?: HealthDependencyDto;

  @ApiPropertyOptional({
    description: 'Storage path or object-store health details.',
    type: HealthDependencyDto,
  })
  storage?: HealthDependencyDto;

  @ApiPropertyOptional({
    description: 'Memory usage status details.',
    type: HealthDependencyDto,
  })
  memory?: HealthDependencyDto;

  @ApiPropertyOptional({
    description: 'Recent API latency/performance status details.',
    type: HealthDependencyDto,
  })
  apiPerformance?: HealthDependencyDto;
}
