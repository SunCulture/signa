import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportUserResultDto {
  @ApiProperty({ example: 1 })
  row!: number;

  @ApiProperty({ example: 'grace@example.com' })
  email!: string;

  @ApiProperty({ enum: ['created', 'restored', 'skipped', 'failed'] })
  status!: 'created' | 'restored' | 'skipped' | 'failed';

  @ApiPropertyOptional({ example: 'Email already exists' })
  message?: string;
}

export class ImportUsersResponseDto {
  @ApiProperty({ type: ImportUserResultDto, isArray: true })
  results!: ImportUserResultDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 2 })
  created!: number;

  @ApiProperty({ example: 1 })
  restored!: number;

  @ApiProperty({ example: 1 })
  skipped!: number;

  @ApiProperty({ example: 0 })
  failed!: number;
}
