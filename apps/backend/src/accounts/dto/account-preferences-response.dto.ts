import { ApiProperty } from '@nestjs/swagger';

export class SubmitterRemindersResponseDto {
  @ApiProperty({ example: 'twenty_four_hours', nullable: true })
  first_duration!: string | null;

  @ApiProperty({ example: 'three_days', nullable: true })
  second_duration!: string | null;

  @ApiProperty({ example: 'seven_days', nullable: true })
  third_duration!: string | null;
}

export class AccountEmailTemplateResponseDto {
  @ApiProperty({ example: 'You are invited to sign a document' })
  subject!: string;

  @ApiProperty({ example: 'Hi there,\n\nPlease sign {template.name}.' })
  body!: string;

  @ApiProperty({ example: 'reply@example.com', nullable: true })
  reply_to?: string | null;
}

export class AccountDocumentsCopyEmailResponseDto extends AccountEmailTemplateResponseDto {
  @ApiProperty({ example: true })
  attach_audit_log!: boolean;

  @ApiProperty({ example: true })
  attach_documents!: boolean;

  @ApiProperty({ example: true })
  enabled!: boolean;
}

export class AccountCompletedEmailResponseDto extends AccountEmailTemplateResponseDto {
  @ApiProperty({ example: true })
  attach_audit_log!: boolean;

  @ApiProperty({ example: true })
  attach_documents!: boolean;
}

export class CompletedMessageResponseDto {
  @ApiProperty({ example: 'Thank you', required: false })
  title?: string;

  @ApiProperty({
    example: 'Your document has been completed.',
    required: false,
  })
  body?: string;
}

export class CompletedButtonResponseDto {
  @ApiProperty({ example: 'Back to website', required: false })
  title?: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  url?: string;
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

  @ApiProperty({ enum: ['single', 'multiple'], example: 'single' })
  esigning_preference!: 'single' | 'multiple';

  @ApiProperty({ example: true })
  flatten_result_pdf!: boolean;

  @ApiProperty({ example: '{document.name}' })
  document_filename_format!: string;

  @ApiProperty({ type: AccountEmailTemplateResponseDto })
  submitter_invitation_email!: AccountEmailTemplateResponseDto;

  @ApiProperty({ type: AccountDocumentsCopyEmailResponseDto })
  submitter_documents_copy_email!: AccountDocumentsCopyEmailResponseDto;

  @ApiProperty({ type: AccountCompletedEmailResponseDto })
  submitter_completed_email!: AccountCompletedEmailResponseDto;

  @ApiProperty({ type: CompletedMessageResponseDto })
  form_completed_message!: CompletedMessageResponseDto;

  @ApiProperty({ type: CompletedButtonResponseDto })
  form_completed_button!: CompletedButtonResponseDto;

  @ApiProperty({ example: false })
  form_with_confetti!: boolean;

  @ApiProperty({ example: '[Privacy Policy](https://example.com/privacy)' })
  policy_links!: string;
}
