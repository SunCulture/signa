import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

const reminderDurations = [
  'one_hour',
  'two_hours',
  'four_hours',
  'eight_hours',
  'twelve_hours',
  'twenty_four_hours',
  'two_days',
  'three_days',
  'four_days',
  'five_days',
  'six_days',
  'seven_days',
  'eight_days',
  'fifteen_days',
  'twenty_one_days',
  'thirty_days',
] as const;

export class UpdateSubmitterRemindersDto {
  @ApiPropertyOptional({ enum: reminderDurations, nullable: true })
  @IsOptional()
  @IsIn(reminderDurations)
  first_duration?: string | null;

  @ApiPropertyOptional({ enum: reminderDurations, nullable: true })
  @IsOptional()
  @IsIn(reminderDurations)
  second_duration?: string | null;

  @ApiPropertyOptional({ enum: reminderDurations, nullable: true })
  @IsOptional()
  @IsIn(reminderDurations)
  third_duration?: string | null;
}

export class UpdateAccountEmailTemplateDto {
  @ApiPropertyOptional({ example: 'You are invited to sign a document' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'Hi there,\n\nPlease sign {template.name}.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: 'reply@example.com', nullable: true })
  @IsOptional()
  @IsString()
  reply_to?: string | null;
}

export class UpdateDocumentsCopyEmailDto extends UpdateAccountEmailTemplateDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  attach_audit_log?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  attach_documents?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateCompletedEmailDto extends UpdateAccountEmailTemplateDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  attach_audit_log?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  attach_documents?: boolean;
}

export class UpdateCompletedMessageDto {
  @ApiPropertyOptional({ example: 'Thank you' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Your document has been completed.' })
  @IsOptional()
  @IsString()
  body?: string;
}

export class UpdateCompletedButtonDto {
  @ApiPropertyOptional({ example: 'Back to website' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;
}

export class UpdateAccountPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  receive_completed_email?: boolean;

  @ApiPropertyOptional({
    description: 'Comma-separated BCC email addresses for completed documents.',
    example: 'admin@example.com, legal@example.com',
  })
  @IsOptional()
  @IsString()
  bcc_emails?: string;

  @ApiPropertyOptional({ type: UpdateSubmitterRemindersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSubmitterRemindersDto)
  submitter_reminders?: UpdateSubmitterRemindersDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  force_mfa?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  with_signature_id?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  require_signing_reason?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_typed_signature?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_to_resubmit?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_to_decline?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allow_to_delegate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  form_prefill_signature?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  download_links_expire?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  download_links_auth?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  combine_pdf_result_key?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enforce_signing_order?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  with_file_links?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hipaa?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  cfr_part_11?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  knowledge_based_authentication?: boolean;

  @ApiPropertyOptional({ enum: ['single', 'multiple'] })
  @IsOptional()
  @IsIn(['single', 'multiple'])
  esigning_preference?: 'single' | 'multiple';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  flatten_result_pdf?: boolean;

  @ApiPropertyOptional({
    enum: [
      '{document.name}',
      '{document.name} - {submission.status}',
      '{document.name} - {submission.submitters}',
      '{document.name} - {submission.submitters} - {submission.completed_at}',
    ],
  })
  @IsOptional()
  @IsIn([
    '{document.name}',
    '{document.name} - {submission.status}',
    '{document.name} - {submission.submitters}',
    '{document.name} - {submission.submitters} - {submission.completed_at}',
  ])
  document_filename_format?: string;

  @ApiPropertyOptional({ type: UpdateAccountEmailTemplateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAccountEmailTemplateDto)
  submitter_invitation_email?: UpdateAccountEmailTemplateDto;

  @ApiPropertyOptional({ type: UpdateDocumentsCopyEmailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDocumentsCopyEmailDto)
  submitter_documents_copy_email?: UpdateDocumentsCopyEmailDto;

  @ApiPropertyOptional({ type: UpdateCompletedEmailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompletedEmailDto)
  submitter_completed_email?: UpdateCompletedEmailDto;

  @ApiPropertyOptional({ type: UpdateCompletedMessageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompletedMessageDto)
  form_completed_message?: UpdateCompletedMessageDto;

  @ApiPropertyOptional({ type: UpdateCompletedButtonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompletedButtonDto)
  form_completed_button?: UpdateCompletedButtonDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  form_with_confetti?: boolean;

  @ApiPropertyOptional({
    example: '[Privacy Policy](https://example.com/privacy)',
  })
  @IsOptional()
  @IsString()
  policy_links?: string;
}
