import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SigningPreviewImageDto {
  @ApiProperty({ example: '22' })
  id!: string;

  @ApiProperty({ example: 'http://localhost:3001/api/storage/blobs/...' })
  url!: string;

  @ApiProperty({ example: '0.png' })
  filename!: string;

  @ApiProperty({ example: { width: 1400, height: 1800 } })
  metadata!: Record<string, unknown>;
}

export class SigningDocumentDto {
  @ApiProperty({ example: '21' })
  id!: string;

  @ApiProperty({ example: 'a453be1e-ad7c-4001-8521-ca90d0920956' })
  uuid!: string;

  @ApiProperty({ example: 'contract.pdf' })
  filename!: string;

  @ApiProperty({ example: 'Contract' })
  name!: string;

  @ApiProperty({ example: 'http://localhost:3001/api/storage/blobs/...' })
  url!: string;

  @ApiProperty({ type: [SigningPreviewImageDto] })
  preview_images!: SigningPreviewImageDto[];
}

export class SigningSubmitterDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'pAMimKcyrLjqVt' })
  slug!: string;

  @ApiProperty({ example: '884d545b-3396-49f1-8c07-05b8b2a78755' })
  uuid!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'First Party' })
  role!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  completed_at!: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  declined_at!: Date | null;
}

export class SigningAttachmentDto {
  @ApiProperty({ example: '77d8b59b-1741-4c25-b95e-f8cd7a22a302' })
  uuid!: string;

  @ApiProperty({ example: 'signature.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  content_type!: string | null;

  @ApiProperty({ example: 'http://localhost:3001/api/storage/blobs/...' })
  url!: string;
}

export class SigningResponseDto {
  @ApiProperty({ example: '1' })
  submission_id!: string;

  @ApiProperty({ example: 'fw8ben-ced' })
  title!: string;

  @ApiProperty({ type: SigningSubmitterDto })
  submitter!: SigningSubmitterDto;

  @ApiProperty({ type: [SigningDocumentDto] })
  documents!: SigningDocumentDto[];

  @ApiProperty({ example: [] })
  fields!: Record<string, unknown>[];

  @ApiProperty({ example: {} })
  values!: Record<string, unknown>;

  @ApiProperty({ example: {} })
  readonly_values!: Record<string, unknown>;

  @ApiProperty({ type: [SigningAttachmentDto] })
  attachments!: SigningAttachmentDto[];
}

export class SigningDownloadResponseDto {
  @ApiProperty({ type: [SigningDocumentDto] })
  documents!: SigningDocumentDto[];
}

export class SigningFieldValueResponseDto {
  @ApiPropertyOptional({
    example: '77d8b59b-1741-4c25-b95e-f8cd7a22a302',
    nullable: true,
  })
  value!: unknown;

  @ApiPropertyOptional({ type: SigningAttachmentDto, nullable: true })
  attachment!: SigningAttachmentDto | null;
}
