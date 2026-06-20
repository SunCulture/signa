import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
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
}
