import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'admin', default: 'admin' })
  @IsOptional()
  @IsString()
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
