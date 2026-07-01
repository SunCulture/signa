import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTemplateHtmlDocumentDto {
  @ApiProperty({
    description:
      'HTML body rendered to PDF. Supports DocuSeal field tags such as text-field, signature-field, date-field, and checkbox-field.',
    example:
      '<p>Hello <text-field name="Name" role="First Party"></text-field></p>',
  })
  @IsString()
  html: string;

  @ApiPropertyOptional({
    description: 'Document display name inside the created template.',
    example: 'Test Document',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Optional HTML header rendered on every page when the HTML is converted to PDF.',
    example: '<div style="font-size:10px">Acme Inc.</div>',
  })
  @IsOptional()
  @IsString()
  html_header?: string;

  @ApiPropertyOptional({
    description:
      'Optional HTML footer rendered on every page when the HTML is converted to PDF.',
    example:
      '<div style="font-size:10px">Page <span class="pageNumber"></span></div>',
  })
  @IsOptional()
  @IsString()
  html_footer?: string;

  @ApiPropertyOptional({
    description: 'PDF page size accepted by the HTML renderer.',
    example: 'A4',
  })
  @IsOptional()
  @IsString()
  size?: string;
}

export class CreateTemplateFromHtmlDto {
  @ApiPropertyOptional({
    description:
      'HTML template with DocuSeal field tags. Used as a single document when documents is empty.',
    example:
      '<h1>Agreement</h1><signature-field name="Signature" role="First Party"></signature-field>',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: 'Default header for the single html body.',
    example: '<div>Header</div>',
  })
  @IsOptional()
  @IsString()
  html_header?: string;

  @ApiPropertyOptional({
    description: 'Default footer for the single html body.',
    example: '<div>Footer</div>',
  })
  @IsOptional()
  @IsString()
  html_footer?: string;

  @ApiPropertyOptional({
    description: 'Template display name.',
    example: 'Test Template',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Default PDF page size for the single html body.',
    example: 'A4',
  })
  @IsOptional()
  @IsString()
  size?: string;

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

  @ApiPropertyOptional({
    description:
      'Multiple HTML documents to render into the template. If omitted, html/html_header/html_footer are used.',
    type: [CreateTemplateHtmlDocumentDto],
  })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplateHtmlDocumentDto[];
}
