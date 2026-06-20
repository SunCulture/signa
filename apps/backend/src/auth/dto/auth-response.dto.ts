import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Ada' })
  first_name!: string | null;

  @ApiProperty({ example: 'Lovelace' })
  last_name!: string | null;

  @ApiProperty({ example: 'ada@example.com' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  role!: string;
}

export class AuthAccountDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Signa Inc.' })
  name!: string;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiProperty({ example: 'en-US' })
  locale!: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Bearer token for web-app authentication.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthAccountDto })
  account!: AuthAccountDto;
}
