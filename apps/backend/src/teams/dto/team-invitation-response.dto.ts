import { ApiProperty } from '@nestjs/swagger';

export class TeamInvitationResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  team_id!: string;

  @ApiProperty({ example: 'teammate@example.com' })
  email!: string;

  @ApiProperty({ example: 'member' })
  role!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiProperty({
    description: 'Only returned immediately after invitation creation.',
    example: 'raw-invitation-token',
    required: false,
  })
  accept_token?: string;

  @ApiProperty({ example: '2026-06-27T08:00:00.000Z' })
  expires_at!: Date;

  @ApiProperty({ example: null, nullable: true })
  accepted_at!: Date | null;

  @ApiProperty({ example: '2026-06-20T08:00:00.000Z' })
  created_at!: Date;
}
