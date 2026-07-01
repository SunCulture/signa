import { ApiProperty } from '@nestjs/swagger';

export class TeamInvitationResponseDto {
  @ApiProperty({ description: 'Invitation id.', example: '1' })
  id!: string;

  @ApiProperty({ description: 'Team id for the invitation.', example: '1' })
  team_id!: string;

  @ApiProperty({
    description: 'Email address invited to join the team.',
    example: 'teammate@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Team role that will be assigned after acceptance.',
    example: 'member',
  })
  role!: string;

  @ApiProperty({
    description: 'Invitation state such as pending, accepted, or revoked.',
    example: 'pending',
  })
  status!: string;

  @ApiProperty({
    description: 'Only returned immediately after invitation creation.',
    example: 'raw-invitation-token',
    required: false,
  })
  accept_token?: string;

  @ApiProperty({
    description: 'UTC timestamp when the invitation expires.',
    example: '2026-06-27T08:00:00.000Z',
  })
  expires_at!: Date;

  @ApiProperty({
    description: 'UTC timestamp when the invitation was accepted.',
    example: null,
    nullable: true,
  })
  accepted_at!: Date | null;

  @ApiProperty({
    description: 'UTC timestamp when the invitation was created.',
    example: '2026-06-20T08:00:00.000Z',
  })
  created_at!: Date;
}
