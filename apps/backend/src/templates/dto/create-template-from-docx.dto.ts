import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
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
}
