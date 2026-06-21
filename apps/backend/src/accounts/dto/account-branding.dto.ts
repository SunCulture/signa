import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountLogoResponseDto {
  @ApiProperty({ example: '77d8b59b-1741-4c25-b95e-f8cd7a22a302' })
  uuid!: string;

  @ApiProperty({ example: 'logo.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png', nullable: true })
  content_type!: string | null;

  @ApiProperty({ example: 'http://localhost:3001/api/storage/blobs/...' })
  url!: string;
}

export class SigningCertificateResponseDto {
  @ApiProperty({ example: 'production-cert' })
  name!: string;

  @ApiPropertyOptional({ example: 'certificate.p12' })
  filename?: string;

  @ApiProperty({ example: 'default' })
  status!: 'default' | 'active';

  @ApiProperty({ example: null, nullable: true })
  valid_to!: string | null;
}

export class SigningCertificateListResponseDto {
  @ApiProperty({ type: [SigningCertificateResponseDto] })
  data!: SigningCertificateResponseDto[];
}
