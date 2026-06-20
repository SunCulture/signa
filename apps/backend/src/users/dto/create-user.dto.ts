import { signaRoles } from '@repo/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'grace@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Grace' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Hopper' })
  @IsString()
  last_name!: string;

  @ApiPropertyOptional({
    enum: signaRoles,
    example: 'member',
    default: 'member',
  })
  @IsOptional()
  @IsIn(signaRoles)
  role?: string;

  @ApiPropertyOptional({
    minLength: 8,
    description:
      'Optional initial password. A random password is generated when omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
