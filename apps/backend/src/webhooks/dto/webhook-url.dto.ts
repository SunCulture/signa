import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { webhookEventTypes } from '../webhook-events';

export class CreateWebhookUrlDto {
  @ApiProperty({ example: 'https://example.com/docuseal-webhooks' })
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiPropertyOptional({ enum: webhookEventTypes, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(webhookEventTypes, { each: true })
  events?: string[];

  @ApiPropertyOptional({
    example: { 'X-Custom-Header': 'secret-value' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  secret?: Record<string, string>;
}

export class UpdateWebhookUrlDto {
  @ApiPropertyOptional({ example: 'https://example.com/docuseal-webhooks' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({ enum: webhookEventTypes, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(webhookEventTypes, { each: true })
  events?: string[];

  @ApiPropertyOptional({
    example: { 'X-Custom-Header': 'secret-value' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  secret?: Record<string, string>;
}

export class ListWebhookEventsQueryDto {
  @ApiPropertyOptional({ enum: ['success', 'error', 'pending'] })
  @IsOptional()
  @IsIn(['success', 'error', 'pending'])
  status?: 'success' | 'error' | 'pending';

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number;
}

export class WebhookAttemptResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  attempt!: number;

  @ApiProperty()
  response_status_code!: number;

  @ApiProperty({ nullable: true })
  response_body!: string | null;

  @ApiProperty()
  created_at!: Date;
}

export class WebhookEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  event_type!: string;

  @ApiProperty()
  record_type!: string;

  @ApiProperty()
  record_id!: string;

  @ApiProperty({ enum: ['pending', 'success', 'error'] })
  status!: string;

  @ApiProperty({ nullable: true, type: Object })
  payload!: Record<string, unknown> | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ type: WebhookAttemptResponseDto, isArray: true })
  attempts!: WebhookAttemptResponseDto[];
}

export class WebhookUrlResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: webhookEventTypes, isArray: true })
  events!: string[];

  @ApiProperty()
  hmac_secret!: string;

  @ApiProperty({ type: Object })
  secret!: Record<string, string>;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}

export class WebhookUrlsListResponseDto {
  @ApiProperty({ type: WebhookUrlResponseDto, isArray: true })
  data!: WebhookUrlResponseDto[];
}

export class WebhookEventsListResponseDto {
  @ApiProperty({ type: WebhookEventResponseDto, isArray: true })
  data!: WebhookEventResponseDto[];
}

export class WebhookTestResponseDto {
  @ApiProperty()
  queued!: boolean;
}
