import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmissionEventLogItemDto {
  @ApiProperty({ example: 'submission-1-created' })
  id: string;

  @ApiProperty({ example: 'view_form' })
  event_type: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  event_timestamp: Date;

  @ApiPropertyOptional({ example: '1', nullable: true })
  submitter_id: string | null;

  @ApiProperty({ example: 'eye' })
  icon: string;

  @ApiProperty({ example: 'Form viewed' })
  title: string;

  @ApiPropertyOptional({ example: 'omondicedo@gmail.com', nullable: true })
  actor: string | null;

  @ApiPropertyOptional({ example: 'desktop', nullable: true })
  device: string | null;

  @ApiPropertyOptional({ example: 'Chrome', nullable: true })
  browser: string | null;

  @ApiPropertyOptional({ example: 'Linux', nullable: true })
  os: string | null;

  @ApiPropertyOptional({ example: '127.0.0.1', nullable: true })
  ip: string | null;

  @ApiPropertyOptional({ example: 'Africa/Nairobi', nullable: true })
  timezone: string | null;

  @ApiPropertyOptional({ example: 'Form viewed by omondicedo@gmail.com' })
  message: string;

  @ApiProperty({ example: {} })
  data: Record<string, unknown>;
}

export class SubmissionEventLogResponseDto {
  @ApiProperty({ type: [SubmissionEventLogItemDto] })
  data: SubmissionEventLogItemDto[];
}
