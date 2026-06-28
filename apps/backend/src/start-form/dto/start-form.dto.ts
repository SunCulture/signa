import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class StartFormSubmitterDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+14155552671' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class SubmitStartFormDto extends StartFormSubmitterDto {
  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  one_time_code?: string;
}

export class SendStartFormEmailVerificationDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+14155552671' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class VerifyStartFormEmailVerificationDto extends StartFormSubmitterDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  one_time_code!: string;
}

export class StartFormResponseDto {
  @ApiProperty()
  account_name!: string;

  @ApiProperty()
  template_name!: string;

  @ApiProperty({ example: true })
  shared_link!: boolean;

  @ApiProperty({ example: false })
  require_email_2fa!: boolean;

  @ApiProperty({ example: ['email'] })
  link_form_fields!: string[];
}

export class StartFormSubmitResponseDto {
  @ApiProperty({ example: 'submitter-slug' })
  signing_slug!: string;

  @ApiProperty({ example: '/s/submitter-slug' })
  signing_url!: string;
}

export class StartFormVerificationResponseDto {
  @ApiProperty({ example: 'ada@example.com' })
  email!: string;

  @ApiProperty({ example: 'sent' })
  status!: 'sent';
}
