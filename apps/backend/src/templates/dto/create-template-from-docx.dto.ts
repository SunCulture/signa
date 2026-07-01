import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TemplateField } from '../types/template-json';

export class CreateTemplateDocxDocumentDto {
  @ApiProperty({
    description: 'DOCX document display name.',
    example: 'sample-document.docx',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Base64-encoded DOCX content, data URL, or a downloadable DOCX URL.',
    example: 'UEsDBBQABgAIAAAAIQ...',
  })
  @IsString()
  file: string;

  @ApiPropertyOptional({
    description:
      'Field coordinates. Required until embedded DOCX tag extraction is implemented with deterministic geometry.',
    example: [],
  })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];

  @ApiPropertyOptional({
    description:
      'Dynamic DOCX variables used to replace [[variable_name]] placeholders before rendering.',
    example: { client_name: 'Ada Lovelace' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class CreateTemplateFromDocxDto {
  @ApiPropertyOptional({
    description:
      'Template display name. Defaults to the first DOCX document name when omitted.',
    example: 'Test DOCX',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Application-specific unique key for idempotent lookup.',
    example: 'crm-template-1',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description:
      'Folder name/path where the template should be created. Defaults to Default.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({
    description: 'Whether the template should expose a shared-link start form.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  shared_link?: boolean;

  @ApiProperty({
    description:
      'DOCX documents to render into template PDFs. Each document can define its own variables and explicit fields.',
    type: [CreateTemplateDocxDocumentDto],
  })
  @IsArray()
  documents: CreateTemplateDocxDocumentDto[];

  @ApiPropertyOptional({
    description:
      'Default variables applied to every DOCX document unless overridden per document.',
    example: { account: { name: 'Acme Inc.' } },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
