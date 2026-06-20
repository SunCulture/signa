import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateAuthorResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'owner@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Ada', nullable: true })
  first_name: string | null;

  @ApiPropertyOptional({ example: 'Lovelace', nullable: true })
  last_name: string | null;
}
