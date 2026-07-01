import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateFolderResponseDto {
  @ApiProperty({ description: 'Template folder id.', example: '12' })
  id: string;

  @ApiProperty({ description: 'Folder display name.', example: 'Contracts' })
  name: string;

  @ApiProperty({
    description: 'Slash-delimited folder path including parent folders.',
    example: 'Clients / Acme / Contracts',
  })
  full_name: string;

  @ApiPropertyOptional({
    description: 'Parent folder id, or null for root-level folders.',
    example: '7',
    nullable: true,
  })
  parent_folder_id: string | null;

  @ApiProperty({
    description: 'Number of templates directly inside this folder.',
    example: 3,
  })
  templates_count: number;

  @ApiProperty({
    description: 'Number of child folders directly inside this folder.',
    example: 1,
  })
  subfolders_count: number;

  @ApiProperty({
    description: 'UTC timestamp when the folder was created.',
    example: '2026-06-30T12:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'UTC timestamp when the folder was last updated.',
    example: '2026-06-30T12:30:00.000Z',
  })
  updated_at: Date;
}
