import { ApiProperty } from '@nestjs/swagger';

export class AccountPreferencesResponseDto {
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
