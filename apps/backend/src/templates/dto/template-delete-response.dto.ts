import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateDeleteResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiPropertyOptional({ example: '2026-06-19T00:00:00.000Z', nullable: true })
  archived_at: Date | null;
}
