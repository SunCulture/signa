import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { TemplateField } from '../../templates/types/template-json';

export class UpdateSubmitterMessageDto {
  @ApiPropertyOptional({ example: 'Please sign {{template.name}}' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'Open {{submitter.link}} to sign.' })
  @IsOptional()
  @IsString()
  body?: string;
}

export class UpdateSubmitterDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2321' })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ example: '2321' })
  @IsOptional()
  @IsString()
  application_key?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  send_sms?: boolean;

  @ApiPropertyOptional({ example: 'reply@example.com' })
  @IsOptional()
  @IsString()
  reply_to?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://example.test/completed' })
  @IsOptional()
  @IsString()
  completed_redirect_url?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  require_phone_2fa?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  require_email_2fa?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  go_to_last?: boolean;

  @ApiPropertyOptional({ type: UpdateSubmitterMessageDto })
  @IsOptional()
  @IsObject()
  message?: UpdateSubmitterMessageDto;

  @ApiPropertyOptional({ example: ['Full Name'] })
  @IsOptional()
  @IsArray()
  readonly_fields?: string[];

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];
}
