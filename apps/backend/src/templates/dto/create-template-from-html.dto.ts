import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTemplateHtmlDocumentDto {
  @ApiProperty({
    description: 'HTML template with DocuSeal field tags.',
    example:
      '<p>Hello <text-field name="Name" role="First Party"></text-field></p>',
  })
  @IsString()
  html: string;

  @ApiPropertyOptional({ example: 'Test Document' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html_header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html_footer?: string;

  @ApiPropertyOptional({ example: 'A4' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class CreateTemplateFromHtmlDto {
  @ApiPropertyOptional({
    description:
      'HTML template with DocuSeal field tags. Used when documents is empty.',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html_header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html_footer?: string;

  @ApiPropertyOptional({ example: 'Test Template' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'A4' })
  @IsOptional()
  @IsString()
  size?: string;

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

  @ApiPropertyOptional({ type: [CreateTemplateHtmlDocumentDto] })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplateHtmlDocumentDto[];
}
