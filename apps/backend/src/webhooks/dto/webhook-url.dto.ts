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
  @ApiProperty({
    description:
      'HTTPS endpoint that receives webhook POST deliveries. Payloads are signed with X-Docuseal-Signature-compatible HMAC.',
    example: 'https://example.com/docuseal-webhooks',
  })
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiPropertyOptional({
    description:
      'Event types to deliver. When omitted, all supported webhook events are selected.',
    enum: webhookEventTypes,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(webhookEventTypes, { each: true })
  events?: string[];

  @ApiPropertyOptional({
    description:
      'Optional custom headers/secrets saved with the webhook configuration. The generated hmac_secret is returned separately.',
    example: { 'X-Custom-Header': 'secret-value' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  secret?: Record<string, string>;
}

export class UpdateWebhookUrlDto {
  @ApiPropertyOptional({
    description: 'Replacement HTTPS endpoint URL.',
    example: 'https://example.com/docuseal-webhooks',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({
    description: 'Replacement event selection.',
    enum: webhookEventTypes,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(webhookEventTypes, { each: true })
  events?: string[];

  @ApiPropertyOptional({
    description: 'Replacement custom header/secret metadata.',
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
  @ApiProperty({ description: 'Webhook delivery attempt id.', example: '12' })
  id!: string;

  @ApiProperty({ description: 'One-based attempt number.', example: 1 })
  attempt!: number;

  @ApiProperty({
    description: 'HTTP status code returned by the receiving endpoint.',
    example: 200,
  })
  response_status_code!: number;

  @ApiProperty({
    description: 'Truncated response body captured for diagnostics.',
    example: '{"ok":true}',
    nullable: true,
  })
  response_body!: string | null;

  @ApiProperty({
    description: 'Timestamp when the attempt was made.',
    example: '2026-06-30T12:00:00.000Z',
  })
  created_at!: Date;
}

export class WebhookEventResponseDto {
  @ApiProperty({ description: 'Webhook event id.', example: '42' })
  id!: string;

  @ApiProperty({
    description: 'Stable webhook event UUID used for idempotency.',
    example: '0954d146-db8c-4772-aafe-2effc7c0e0c0',
  })
  uuid!: string;

  @ApiProperty({
    description: 'Delivered event type, for example submission.completed.',
    example: 'submission.completed',
  })
  event_type!: string;

  @ApiProperty({
    description: 'Record family serialized into the payload.',
    example: 'Submission',
  })
  record_type!: string;

  @ApiProperty({
    description: 'Record id serialized into the payload.',
    example: '99',
  })
  record_id!: string;

  @ApiProperty({
    description: 'Delivery status across attempts.',
    enum: ['pending', 'success', 'error'],
  })
  status!: string;

  @ApiProperty({
    description:
      'DocuSeal-compatible serialized webhook payload for the event type.',
    nullable: true,
    type: Object,
  })
  payload!: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Timestamp when the event was created.',
    example: '2026-06-30T12:00:00.000Z',
  })
  created_at!: Date;

  @ApiProperty({ type: WebhookAttemptResponseDto, isArray: true })
  attempts!: WebhookAttemptResponseDto[];
}

export class WebhookUrlResponseDto {
  @ApiProperty({ description: 'Webhook URL id.', example: '1' })
  id!: string;

  @ApiProperty({
    description: 'HTTPS endpoint receiving webhook deliveries.',
    example: 'https://example.com/docuseal-webhooks',
  })
  url!: string;

  @ApiProperty({
    description: 'Selected event types delivered to this webhook URL.',
    enum: webhookEventTypes,
    isArray: true,
  })
  events!: string[];

  @ApiProperty({
    description:
      'HMAC secret used to validate X-Docuseal-Signature-compatible delivery headers.',
    example: 'whsec_1234567890abcdef',
  })
  hmac_secret!: string;

  @ApiProperty({
    description: 'Custom secret/header metadata configured by the account.',
    type: Object,
  })
  secret!: Record<string, string>;

  @ApiProperty({ example: '2026-06-30T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-06-30T12:00:00.000Z' })
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
  @ApiProperty({
    description: 'True when the delivery/test/resend job was queued.',
    example: true,
  })
  queued!: boolean;
}
