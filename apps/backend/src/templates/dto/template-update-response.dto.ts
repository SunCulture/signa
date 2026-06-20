import { ApiProperty } from '@nestjs/swagger';

export class TemplateUpdateResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  updated_at: Date;
}
