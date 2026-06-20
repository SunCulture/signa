import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TemplateField,
  TemplateSchemaItem,
  TemplateSubmitter,
} from '../types/template-json';
import type { TemplatePreferences } from '../types/template-json';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'NDA' })
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
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  shared_link?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({ example: ['First Party', 'Second Party'] })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({ example: [{ name: 'First Party' }] })
  @IsOptional()
  @IsArray()
  submitters?: TemplateSubmitter[];

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];

  @ApiPropertyOptional({
    example: [{ attachment_uuid: 'uuid', name: 'NDA' }],
  })
  @IsOptional()
  @IsArray()
  schema?: TemplateSchemaItem[];

  @ApiPropertyOptional({
    example: {
      bcc_completed: 'legal@example.com',
      default_expire_at_duration: '7_days',
    },
  })
  @IsOptional()
  @IsObject()
  preferences?: TemplatePreferences;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  template?: UpdateTemplateDto;
}
