import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateAuthorResponseDto } from './template-author-response.dto';
import { TemplateDocumentResponseDto } from './template-document-response.dto';

export class TemplateResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  archived_at: Date | null;

  @ApiProperty({ example: [] })
  fields: unknown[];

  @ApiProperty({ example: 'NDA' })
  name: string;

  @ApiProperty({ example: {} })
  preferences: Record<string, unknown>;

  @ApiProperty({ example: [] })
  schema: unknown[];

  @ApiProperty({ example: 'abc123' })
  slug: string;

  @ApiProperty({ example: 'native' })
  source: string;

  @ApiProperty({ example: [{ name: 'First Party' }] })
  submitters: unknown[];

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;

  @ApiProperty({ example: '1' })
  author_id: string;

  @ApiPropertyOptional({ example: 'crm-template-1', nullable: true })
  external_id: string | null;

  @ApiProperty({ example: '1' })
  folder_id: string;

  @ApiProperty({ example: false })
  shared_link: boolean;

  @ApiProperty({ example: false })
  shared_with_test_mode: boolean;

  @ApiPropertyOptional({ example: 'crm-template-1', nullable: true })
  application_key: string | null;

  @ApiProperty({ example: 'Default' })
  folder_name: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  variables_schema: unknown;

  @ApiProperty({ type: TemplateAuthorResponseDto })
  author: TemplateAuthorResponseDto;

  @ApiProperty({ type: [TemplateDocumentResponseDto] })
  documents: TemplateDocumentResponseDto[];
}
