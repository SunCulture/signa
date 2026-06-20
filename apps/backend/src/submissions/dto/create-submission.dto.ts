import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { TemplateField } from '../../templates/types/template-json';

export class CreateSubmissionSubmitterDto {
  @ApiPropertyOptional({ example: '884d545b-3396-49f1-8c07-05b8b2a78755' })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiPropertyOptional({ example: 'First Party' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: ['First Party', 'Second Party'] })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

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
  completed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  send_sms?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  index?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @ApiPropertyOptional({ example: ['email'] })
  @IsOptional()
  @IsArray()
  readonly_fields?: string[];

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://example.test/completed' })
  @IsOptional()
  @IsString()
  completed_redirect_url?: string;

  @ApiPropertyOptional({ example: 'reply@example.com' })
  @IsOptional()
  @IsString()
  reply_to?: string;
}

export class CreateSubmissionDto {
  @ApiProperty({ example: '1000001' })
  @IsString()
  template_id: string;

  @ApiProperty({ type: [CreateSubmissionSubmitterDto] })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({ example: 'Test Submission Document' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  send_sms?: boolean;

  @ApiPropertyOptional({ enum: ['preserved', 'random'], default: 'preserved' })
  @IsOptional()
  @IsIn(['preserved', 'random'])
  order?: 'preserved' | 'random';

  @ApiPropertyOptional({ enum: ['preserved', 'random'], default: 'preserved' })
  @IsOptional()
  @IsIn(['preserved', 'random'])
  submitters_order?: 'preserved' | 'random';

  @ApiPropertyOptional({ example: '2026-09-01T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  expire_at?: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'completed@example.com' })
  @IsOptional()
  @IsString()
  bcc_completed?: string;

  @ApiPropertyOptional({ example: 'https://example.test/completed' })
  @IsOptional()
  @IsString()
  completed_redirect_url?: string;

  @ApiPropertyOptional({ example: 'reply@example.com' })
  @IsOptional()
  @IsString()
  reply_to?: string;

  @ApiPropertyOptional({ example: 'fields' })
  @IsOptional()
  @IsString()
  include?: string;
}
