import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TemplateField } from '../types/template-json';

export class UpdateTemplateDocumentDto {
  @ApiPropertyOptional({
    description: 'Document operation type. Use blank to generate a blank page.',
    example: 'blank',
  })
  @IsOptional()
  @IsIn(['blank'])
  type?: 'blank';

  @ApiPropertyOptional({ example: 'sample-document.pdf' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded PDF/DOCX content or downloadable file URL.',
    example: 'base64',
  })
  @IsOptional()
  @IsString()
  file?: string;

  @ApiPropertyOptional({
    description: 'HTML template with DocuSeal field tags.',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: 'HTML header used when rendering an HTML document.',
  })
  @IsOptional()
  @IsString()
  html_header?: string;

  @ApiPropertyOptional({
    description: 'HTML footer used when rendering an HTML document.',
  })
  @IsOptional()
  @IsString()
  html_footer?: string;

  @ApiPropertyOptional({ example: 'letter' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Zero-based position to insert, replace, or remove.',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional({
    description:
      'Set true to replace an existing document at position or by name.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;

  @ApiPropertyOptional({
    description: 'Set true to remove an existing document at position or name.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  remove?: boolean;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];
}

export class UpdateTemplateDocumentsDto {
  @ApiPropertyOptional({ type: [UpdateTemplateDocumentDto] })
  @IsOptional()
  @IsArray()
  documents?: UpdateTemplateDocumentDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  merge?: boolean;
}
