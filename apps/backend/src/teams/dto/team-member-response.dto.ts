import { ApiProperty } from '@nestjs/swagger';

export class TeamMemberUserResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Ada', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: 'Lovelace', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'ada@example.com' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  account_role!: string;
}

export class TeamMemberResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  team_id!: string;

  @ApiProperty({ example: '1' })
  user_id!: string;

  @ApiProperty({ example: 'manager' })
  role!: string;

  @ApiProperty({ type: TeamMemberUserResponseDto })
  user!: TeamMemberUserResponseDto;

  @ApiProperty({ example: null, nullable: true })
  archived_at!: Date | null;

  @ApiProperty({ example: '2026-06-20T08:00:00.000Z' })
  created_at!: Date;
}
