import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from the reset password email.',
  })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8, example: 'correct horse battery staple' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ minLength: 8, example: 'correct horse battery staple' })
  @IsString()
  @MinLength(8)
  password_confirmation!: string;
}
