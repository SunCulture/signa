import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitterTemplateResponseDto {
  @ApiProperty({ example: '2' })
  id: string;

  @ApiProperty({ example: 'Example Template' })
  name: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;
}

export class SubmitterEventResponseDto {
  @ApiProperty({ example: '12' })
  id: string;

  @ApiPropertyOptional({ example: '7', nullable: true })
  submitter_id: string | null;

  @ApiProperty({ example: 'view_form' })
  event_type: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  event_timestamp: Date;

  @ApiProperty({ example: {} })
  data: Record<string, unknown>;
}

export class SubmitterValueResponseDto {
  @ApiProperty({ example: 'Full Name' })
  field: string;

  @ApiProperty({ example: 'John Doe' })
  value: unknown;
}

export class SubmitterDocumentResponseDto {
  @ApiProperty({ example: 'sample-document' })
  name: string;

  @ApiProperty({ example: 'https://api.example.test/storage/blobs/...' })
  url: string;
}

export class SubmitterResponseDto {
  @ApiProperty({ example: '7' })
  id: string;

  @ApiProperty({ example: '3' })
  submission_id: string;

  @ApiProperty({ example: '0954d146-db8c-4772-aafe-2effc7c0e0c0' })
  uuid: string;

  @ApiPropertyOptional({ example: 'submitter@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'dsEeWrhRD8yDXT' })
  slug: string;

  @ApiPropertyOptional({ example: '2026-06-19T00:00:00.000Z', nullable: true })
  sent_at: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  opened_at: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  completed_at: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  declined_at: Date | null;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiPropertyOptional({ example: '+1234567890', nullable: true })
  phone: string | null;

  @ApiProperty({
    enum: ['completed', 'declined', 'opened', 'sent', 'awaiting'],
  })
  status: string;

  @ApiPropertyOptional({ example: '2321', nullable: true })
  external_id: string | null;

  @ApiPropertyOptional({ example: '2321', nullable: true })
  application_key: string | null;

  @ApiProperty({ example: {} })
  metadata: Record<string, unknown>;

  @ApiProperty({ example: {} })
  preferences: Record<string, unknown>;

  @ApiPropertyOptional({ type: SubmitterTemplateResponseDto })
  template?: SubmitterTemplateResponseDto;

  @ApiPropertyOptional({ type: [SubmitterEventResponseDto] })
  submission_events?: SubmitterEventResponseDto[];

  @ApiProperty({ type: [SubmitterValueResponseDto] })
  values: SubmitterValueResponseDto[];

  @ApiProperty({ type: [SubmitterDocumentResponseDto] })
  documents: SubmitterDocumentResponseDto[];

  @ApiProperty({ example: 'First Party' })
  role: string;

  @ApiPropertyOptional({ example: 'http://localhost:3001/s/pAMimKcyrLjqVt' })
  embed_src?: string;

  @ApiPropertyOptional({ example: [] })
  fields?: unknown[];
}

export class SubmitterPaginationDto {
  @ApiProperty({ example: 10 })
  count: number;

  @ApiProperty({ example: '42', nullable: true })
  next: string | null;

  @ApiProperty({ example: '51', nullable: true })
  prev: string | null;
}

export class SubmittersListResponseDto {
  @ApiProperty({ type: [SubmitterResponseDto] })
  data: SubmitterResponseDto[];

  @ApiProperty({ type: SubmitterPaginationDto })
  pagination: SubmitterPaginationDto;
}
