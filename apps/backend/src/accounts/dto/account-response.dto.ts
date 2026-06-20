import { ApiProperty } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Signa Inc.' })
  name!: string;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiProperty({ example: 'en-US' })
  locale!: string;

  @ApiProperty({ example: null, nullable: true })
  archived_at!: Date | null;
}
