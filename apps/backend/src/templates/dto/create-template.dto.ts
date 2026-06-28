import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { TemplateSubmitter } from '../types/template-json';

export class CreateTemplateDto {
  @ApiPropertyOptional({ example: 'Untitled Template' })
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

  @ApiPropertyOptional({ type: Array })
  @IsOptional()
  @IsArray()
  submitters?: TemplateSubmitter[];
}
