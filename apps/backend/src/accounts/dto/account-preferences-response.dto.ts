import { ApiProperty } from '@nestjs/swagger';

export class SubmitterRemindersResponseDto {
  @ApiProperty({ example: 'twenty_four_hours', nullable: true })
  first_duration!: string | null;

  @ApiProperty({ example: 'three_days', nullable: true })
  second_duration!: string | null;

  @ApiProperty({ example: 'seven_days', nullable: true })
  third_duration!: string | null;
}

export class AccountPreferencesResponseDto {
  @ApiProperty({ example: true })
  receive_completed_email!: boolean;

  @ApiProperty({ example: 'admin@example.com' })
  bcc_emails!: string;

  @ApiProperty({ type: SubmitterRemindersResponseDto })
  submitter_reminders!: SubmitterRemindersResponseDto;

  @ApiProperty({ example: false })
  force_mfa!: boolean;

  @ApiProperty({ example: false })
  with_signature_id!: boolean;

  @ApiProperty({ example: false })
  require_signing_reason!: boolean;

  @ApiProperty({ example: true })
  allow_typed_signature!: boolean;

  @ApiProperty({ example: true })
  allow_to_resubmit!: boolean;

  @ApiProperty({ example: true })
  allow_to_decline!: boolean;

  @ApiProperty({ example: false })
  allow_to_delegate!: boolean;

  @ApiProperty({ example: true })
  form_prefill_signature!: boolean;

  @ApiProperty({ example: true })
  download_links_expire!: boolean;

  @ApiProperty({ example: false })
  download_links_auth!: boolean;

  @ApiProperty({ example: false })
  combine_pdf_result_key!: boolean;

  @ApiProperty({ example: false })
  enforce_signing_order!: boolean;

  @ApiProperty({ example: false })
  with_file_links!: boolean;

  @ApiProperty({ example: false })
  hipaa!: boolean;

  @ApiProperty({ example: false })
  cfr_part_11!: boolean;

  @ApiProperty({ example: false })
  knowledge_based_authentication!: boolean;
}
