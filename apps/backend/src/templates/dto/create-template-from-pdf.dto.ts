import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { TemplateField } from '../types/template-json';

export class CreateTemplatePdfDocumentDto {
  @ApiProperty({
    description:
      'Document display name. The file extension is preserved in generated download names where possible.',
    example: 'sample-document.pdf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Base64-encoded PDF content, data URL, or a downloadable PDF URL. Multipart uploads can use documents/files/file instead.',
    example: 'JVBERi0xLjQKJcfs...',
  })
  @IsString()
  file: string;

  @ApiPropertyOptional({
    description:
      'Explicit DocuSeal-style field definitions with normalized coordinate areas. If omitted, Signa attempts AcroForm, XFA, and text-tag extraction.',
    example: [
      {
        name: 'Signature',
        role: 'First Party',
        type: 'signature',
        areas: [{ page: 0, x: 10, y: 75, w: 30, h: 8 }],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];
}

export class CreateTemplateFromPdfDto {
  @ApiPropertyOptional({
    description:
      'Template display name. Defaults to the first document name when omitted.',
    example: 'Test PDF',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Folder name/path where the template should be created. Defaults to Default.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({
    description: 'Application-specific unique key for idempotent lookup.',
    example: 'crm-template-1',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description: 'Whether the template should expose a shared-link start form.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  shared_link?: boolean;

  @ApiPropertyOptional({
    description:
      'PDF documents supplied as JSON. For multipart requests use documents/files/file upload fields instead.',
    type: [CreateTemplatePdfDocumentDto],
  })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplatePdfDocumentDto[];

  @ApiPropertyOptional({
    description:
      'Flatten existing PDF form annotations before field detection/rendering.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  flatten?: boolean;

  @ApiPropertyOptional({
    description:
      'Remove embedded DocuSeal text tags such as {{signature}} from generated template previews/results.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;
}
