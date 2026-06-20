import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Signa Inc.' })
  @IsString()
  account_name!: string;

  @ApiPropertyOptional({ example: 'UTC', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'en-US', default: 'en-US' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ example: 'Ada' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  last_name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(8)
  password!: string;
}
