import { ApiProperty } from '@nestjs/swagger';

export class TeamResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'd9b04f28-00e1-4cc0-94dc-bb40b6f706f9' })
  uuid!: string;

  @ApiProperty({ example: 'Legal' })
  name!: string;

  @ApiProperty({ example: 'legal' })
  slug!: string;

  @ApiProperty({ example: 'Users who manage legal templates.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 3 })
  members_count!: number;

  @ApiProperty({ example: null, nullable: true })
  archived_at!: Date | null;

  @ApiProperty({ example: '2026-06-20T08:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-06-20T08:00:00.000Z' })
  updated_at!: Date;
}
