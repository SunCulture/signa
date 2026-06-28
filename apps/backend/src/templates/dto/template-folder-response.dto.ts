import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateFolderResponseDto {
  @ApiProperty({ example: '12' })
  id: string;

  @ApiProperty({ example: 'Contracts' })
  name: string;

  @ApiProperty({ example: 'Clients / Acme / Contracts' })
  full_name: string;

  @ApiPropertyOptional({ example: '7', nullable: true })
  parent_folder_id: string | null;

  @ApiProperty({ example: 3 })
  templates_count: number;

  @ApiProperty({ example: 1 })
  subfolders_count: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
