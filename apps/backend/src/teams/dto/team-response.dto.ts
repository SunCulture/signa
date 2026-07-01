import { ApiProperty } from '@nestjs/swagger';

export class TeamResponseDto {
  @ApiProperty({ description: 'Team id.', example: '1' })
  id!: string;

  @ApiProperty({
    description: 'Public UUID for team references outside numeric ids.',
    example: 'd9b04f28-00e1-4cc0-94dc-bb40b6f706f9',
  })
  uuid!: string;

  @ApiProperty({ description: 'Team display name.', example: 'Legal' })
  name!: string;

  @ApiProperty({
    description: 'URL-safe team slug unique inside the account.',
    example: 'legal',
  })
  slug!: string;

  @ApiProperty({
    description: 'Optional team description shown in settings.',
    example: 'Users who manage legal templates.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Number of active members in the team.',
    example: 3,
  })
  members_count!: number;

  @ApiProperty({
    description: 'Archive timestamp, or null when the team is active.',
    example: null,
    nullable: true,
  })
  archived_at!: Date | null;

  @ApiProperty({
    description: 'UTC timestamp when the team was created.',
    example: '2026-06-20T08:00:00.000Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'UTC timestamp when the team was last updated.',
    example: '2026-06-20T08:00:00.000Z',
  })
  updated_at!: Date;
}
