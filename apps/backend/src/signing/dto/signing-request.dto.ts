import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
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
