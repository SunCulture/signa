import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
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

  @ApiProperty({ example: null, nullable: true })
  archived_at!: Date | null;
}
