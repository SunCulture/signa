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
  @ApiProperty({ example: 'sample-document.docx' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Base64-encoded DOCX content or a downloadable DOCX URL.',
    example: 'base64',
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
  @ApiPropertyOptional({ example: 'Test DOCX' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'crm-template-1' })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  shared_link?: boolean;

  @ApiProperty({ type: [CreateTemplateDocxDocumentDto] })
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
