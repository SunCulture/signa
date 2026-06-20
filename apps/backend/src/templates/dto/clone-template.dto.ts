import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CloneTemplateDto {
  @ApiPropertyOptional({
    description:
      'Template name. Existing name with a clone suffix is used when omitted.',
    example: 'Cloned Template',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "The folder's name to which the template should be cloned.",
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({
    description:
      'Application-specific unique string key to identify this template.',
    example: 'crm-template-2',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description: 'DocuSeal-compatible alias for external_id.',
    example: 'crm-template-2',
  })
  @IsOptional()
  @IsString()
  application_key?: string;
}
