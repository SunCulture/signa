import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class MfaCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^[0-9\s-]{6,12}$/)
  otp_attempt!: string;
}

export class MfaSetupResponseDto {
  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  secret!: string;

  @ApiProperty({
    example:
      'otpauth://totp/Signa%20Docs:ada@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Signa%20Docs',
  })
  provisioning_uri!: string;

  @ApiProperty({ example: true })
  otp_required_for_login!: boolean;
}

export class MfaStatusResponseDto {
  @ApiProperty({ example: true })
  otp_required_for_login!: boolean;
}
