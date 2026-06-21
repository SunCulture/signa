import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBase64, IsString } from 'class-validator';

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
  @ApiProperty()
  @IsString()
  @IsBase64()
  file!: string;
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

  @ApiProperty({ type: VerifyPdfSignatureDto, isArray: true })
  signatures!: VerifyPdfSignatureDto[];
}
