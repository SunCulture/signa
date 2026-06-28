import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSigningValuesDto {
  @ApiProperty({ example: { 'field-uuid': 'Ada Lovelace' } })
  @IsObject()
  values!: Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class DeclineSigningDto {
  @ApiPropertyOptional({ example: 'I am not the right signer.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SendPhoneVerificationDto {
  @ApiPropertyOptional({ example: '+14155552671' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'field-uuid' })
  @IsOptional()
  @IsString()
  field_uuid?: string;
}

export class VerifyPhoneCodeDto extends SendPhoneVerificationDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}

export class SendEmailVerificationDto {
  @ApiPropertyOptional({ example: 'field-uuid' })
  @IsOptional()
  @IsString()
  field_uuid?: string;
}

export class VerifyEmailCodeDto extends SendEmailVerificationDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}

export class CreatePaymentAttemptDto {
  @ApiProperty({ example: 'field-uuid' })
  @IsString()
  field_uuid!: string;

  @ApiPropertyOptional({ example: 'stripe' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'pi_123' })
  @IsOptional()
  @IsString()
  provider_reference?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['pending', 'processing', 'succeeded', 'failed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class CreateIdentityVerificationDto {
  @ApiProperty({ example: 'field-uuid' })
  @IsString()
  field_uuid!: string;

  @ApiPropertyOptional({ example: 'kba' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'provider' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'kyc_123' })
  @IsOptional()
  @IsString()
  provider_reference?: string;

  @ApiPropertyOptional({ enum: ['pending', 'verified', 'failed', 'expired'] })
  @IsOptional()
  @IsIn(['pending', 'verified', 'failed', 'expired'])
  status?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class DelegateSigningDto {
  @ApiProperty({ example: 'legal@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Legal Reviewer' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+14155552671' })
  @IsOptional()
  @IsString()
  phone?: string;
}
