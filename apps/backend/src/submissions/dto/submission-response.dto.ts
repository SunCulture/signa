import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmissionSubmitterResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '1' })
  submission_id: string;

  @ApiProperty({ example: '884d545b-3396-49f1-8c07-05b8b2a78755' })
  uuid: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'pAMimKcyrLjqVt' })
  slug: string;

  @ApiPropertyOptional({ example: null, nullable: true })
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

  @ApiPropertyOptional({ example: '2321', nullable: true })
  external_id: string | null;

  @ApiProperty({
    enum: ['completed', 'declined', 'opened', 'sent', 'awaiting'],
  })
  status: string;

  @ApiProperty({ example: 'First Party' })
  role: string;

  @ApiProperty({ example: {} })
  metadata: Record<string, unknown>;

  @ApiProperty({ example: {} })
  preferences: Record<string, unknown>;

  @ApiProperty({ example: [] })
  values: unknown[];

  @ApiPropertyOptional({ example: 'http://localhost:3001/s/pAMimKcyrLjqVt' })
  embed_src?: string;
}

export class SubmissionTemplateResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Example Template' })
  name: string;

  @ApiPropertyOptional({ example: 'Temp123', nullable: true })
  external_id: string | null;

  @ApiProperty({ example: 'Default' })
  folder_name: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;
}

export class SubmissionUserResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: 'Ada', nullable: true })
  first_name: string | null;

  @ApiPropertyOptional({ example: 'Lovelace', nullable: true })
  last_name: string | null;

  @ApiProperty({ example: 'ada@example.com' })
  email: string;
}

export class SubmissionEventResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: '1', nullable: true })
  submitter_id: string | null;

  @ApiProperty({ example: 'api_complete_form' })
  event_type: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  event_timestamp: Date;

  @ApiProperty({ example: {} })
  data: Record<string, unknown>;
}

export class SubmissionDocumentPreviewImageResponseDto {
  @ApiProperty({ example: '22' })
  id: string;

  @ApiProperty({ example: 'https://api.example.test/storage/blobs/...' })
  url: string;

  @ApiProperty({ example: '0.png' })
  filename: string;

  @ApiProperty({ example: { width: 1400, height: 1800 } })
  metadata: Record<string, unknown>;
}

export class SubmissionDocumentResponseDto {
  @ApiPropertyOptional({ example: '21' })
  id?: string;

  @ApiPropertyOptional({ example: 'a453be1e-ad7c-4001-8521-ca90d0920956' })
  uuid?: string;

  @ApiPropertyOptional({ example: 'contract.pdf' })
  filename?: string;

  @ApiProperty({ example: 'example' })
  name: string;

  @ApiProperty({ example: 'https://api.example.test/storage/blobs/...' })
  url: string;

  @ApiPropertyOptional({ type: [SubmissionDocumentPreviewImageResponseDto] })
  preview_images?: SubmissionDocumentPreviewImageResponseDto[];
}

export class SubmissionFieldAttachmentValueResponseDto {
  @ApiProperty({ example: '77d8b59b-1741-4c25-b95e-f8cd7a22a302' })
  uuid: string;

  @ApiProperty({ example: 'signature.png' })
  filename: string;

  @ApiPropertyOptional({ example: 'image/png', nullable: true })
  content_type: string | null;

  @ApiProperty({ example: 'https://api.example.test/storage/blobs/...' })
  url: string;
}

export class SubmissionResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: 'Test Submission Document', nullable: true })
  name: string | null;

  @ApiProperty({ example: 'NtLDQM7eJX2ZMd' })
  slug: string;

  @ApiProperty({ example: 'api' })
  source: string;

  @ApiProperty({ enum: ['random', 'preserved'] })
  submitters_order: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  expire_at: Date | null;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  archived_at: Date | null;

  @ApiProperty({ enum: ['completed', 'declined', 'expired', 'pending'] })
  status: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  completed_at: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  audit_log_url: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  combined_document_url: string | null;

  @ApiProperty({ example: {} })
  variables: Record<string, unknown>;

  @ApiProperty({ type: [SubmissionSubmitterResponseDto] })
  submitters: SubmissionSubmitterResponseDto[];

  @ApiPropertyOptional({ type: SubmissionTemplateResponseDto, nullable: true })
  template: SubmissionTemplateResponseDto | null;

  @ApiPropertyOptional({ type: SubmissionUserResponseDto, nullable: true })
  created_by_user: SubmissionUserResponseDto | null;

  @ApiPropertyOptional({ type: [SubmissionEventResponseDto] })
  submission_events?: SubmissionEventResponseDto[];

  @ApiPropertyOptional({ type: [SubmissionDocumentResponseDto] })
  documents?: SubmissionDocumentResponseDto[];

  @ApiPropertyOptional({ example: [] })
  fields?: unknown[];
}

export class SubmissionPaginationDto {
  @ApiProperty({ example: 10 })
  count: number;

  @ApiProperty({ example: '42', nullable: true })
  next: string | null;

  @ApiProperty({ example: '51', nullable: true })
  prev: string | null;
}

export class SubmissionsListResponseDto {
  @ApiProperty({ type: [SubmissionResponseDto] })
  data: SubmissionResponseDto[];

  @ApiProperty({ type: SubmissionPaginationDto })
  pagination: SubmissionPaginationDto;
}

export class SubmissionDeleteResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: '2026-06-19T00:00:00.000Z', nullable: true })
  archived_at: Date | null;
}

export class SubmissionDocumentsResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ type: [SubmissionDocumentResponseDto] })
  documents: SubmissionDocumentResponseDto[];
}
