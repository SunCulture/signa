import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBase64,
  IsOptional,
  IsString,
} from 'class-validator';

export class MergePdfsDto {
  @ApiProperty({ isArray: true })
  @IsArray()
  @ArrayMinSize(2)
  @IsBase64({}, { each: true })
  files!: string[];
}

export class MergePdfsResponseDto {
  @ApiProperty()
  data!: string;
}

export class VerifyPdfDto {
  @ApiPropertyOptional({
    description:
      'Base64-encoded PDF. Browser clients should prefer multipart file uploads.',
  })
  @IsOptional()
  @IsString()
  @IsBase64()
  file?: string;
}

export class VerifyPdfSignatureDto {
  @ApiProperty({ type: [String] })
  verification_result!: string[];

  @ApiProperty({ nullable: true })
  signer_name!: string | null;

  @ApiProperty({ nullable: true })
  signing_reason!: string | null;

  @ApiProperty({ nullable: true })
  signing_time!: string | null;

  @ApiProperty({ nullable: true })
  signature_type!: string | null;
}

export class VerifyPdfResponseDto {
  @ApiProperty({ enum: ['verified', 'not_found'] })
  checksum_status!: 'verified' | 'not_found';

  @ApiProperty({
    description: 'SHA-256 checksum checked against completed Signa documents.',
  })
  sha256!: string;

  @ApiProperty({ type: VerifyPdfSignatureDto, isArray: true })
  signatures!: VerifyPdfSignatureDto[];

  @ApiProperty({
    description:
      'True when Signa performed full cryptographic certificate verification.',
    example: false,
  })
  cryptographic_verification!: boolean;
}
