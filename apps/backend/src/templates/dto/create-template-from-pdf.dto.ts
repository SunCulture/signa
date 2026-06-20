import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { TemplateField } from '../types/template-json';

export class CreateTemplatePdfDocumentDto {
  @ApiProperty({ example: 'sample-document.pdf' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Base64-encoded PDF content or a downloadable PDF URL.',
    example: 'base64',
  })
  @IsString()
  file: string;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];
}

export class CreateTemplateFromPdfDto {
  @ApiPropertyOptional({ example: 'Test PDF' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({ example: 'crm-template-1' })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  shared_link?: boolean;

  @ApiPropertyOptional({ type: [CreateTemplatePdfDocumentDto] })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplatePdfDocumentDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  flatten?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;
}
