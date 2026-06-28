import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class MergeTemplatesDto {
  @ApiProperty({
    description: 'Template ids to merge into a new combined template.',
    example: ['321', '432'],
    type: [String],
  })
  @IsArray()
  template_ids: string[];

  @ApiPropertyOptional({
    description:
      'Template name. Existing name with (Merged) suffix is used when omitted.',
    example: 'Merged Template',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Folder name where the merged template should be placed.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;

  @ApiPropertyOptional({
    description: 'Application-specific unique key.',
    example: 'crm-merged-template',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to expose a shared template link.',
  })
  @IsOptional()
  @IsBoolean()
  shared_link?: boolean;

  @ApiPropertyOptional({
    description: 'Submitter role names to apply to the merged template.',
    example: ['Agent', 'Customer'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  roles?: string[];
}
