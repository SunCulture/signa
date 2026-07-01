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
  @ApiPropertyOptional({
    description:
      'Email subject override for this submitter. Supports DocuSeal-style variables such as {template.name}.',
    example: 'Please sign {{template.name}}',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description:
      'Email body override for this submitter. Markdown and DocuSeal-style variables are rendered before delivery.',
    example: 'Open {{submitter.link}} to sign.',
  })
  @IsOptional()
  @IsString()
  body?: string;
}

export class UpdateSubmitterDto {
  @ApiPropertyOptional({
    description: 'Submitter display name used in emails, audit logs, and PDFs.',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Submitter email address used for signature request delivery.',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Submitter phone number in E.164 format.',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Field values keyed by field name or UUID. File/image/signature values can reference uploaded attachment UUIDs.',
    example: { 'Full Name': 'John Doe', Approved: true },
  })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Application-specific id for correlating this submitter.',
    example: '2321',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description: 'DocuSeal-compatible alias for external_id.',
    example: '2321',
  })
  @IsOptional()
  @IsString()
  application_key?: string;

  @ApiPropertyOptional({
    description:
      'When true, queues a signature request email after updating the submitter.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, queues a signature request SMS after updating the submitter.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  send_sms?: boolean;

  @ApiPropertyOptional({
    description: 'Reply-To address for submitter emails.',
    example: 'reply@example.com',
  })
  @IsOptional()
  @IsString()
  reply_to?: string;

  @ApiPropertyOptional({
    description:
      'Marks the submitter completed using the supplied values. Completed/declined submitters cannot be edited.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description:
      'Arbitrary submitter metadata returned in API responses and webhook payloads.',
    example: { crm_contact_id: 'contact_123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Redirect URL after this submitter completes signing.',
    example: 'https://example.test/completed',
  })
  @IsOptional()
  @IsString()
  completed_redirect_url?: string;

  @ApiPropertyOptional({
    description:
      'Require phone verification before this submitter can complete signing.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  require_phone_2fa?: boolean;

  @ApiPropertyOptional({
    description:
      'Require email verification before this submitter can complete signing.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  require_email_2fa?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, the public form opens at the last incomplete field where possible.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  go_to_last?: boolean;

  @ApiPropertyOptional({ type: UpdateSubmitterMessageDto })
  @IsOptional()
  @IsObject()
  message?: UpdateSubmitterMessageDto;

  @ApiPropertyOptional({
    description: 'Field names/UUIDs that should become read-only.',
    example: ['Full Name'],
  })
  @IsOptional()
  @IsArray()
  readonly_fields?: string[];

  @ApiPropertyOptional({
    description:
      'Submitter-specific field overrides using DocuSeal field JSON shape.',
    example: [],
  })
  @IsOptional()
  @IsArray()
  fields?: TemplateField[];
}
