import { ApiProperty } from '@nestjs/swagger';
import { TemplateResponseDto } from './template-response.dto';

class TemplatesPaginationDto {
  @ApiProperty({ example: 10 })
  count: number;

  @ApiProperty({ example: '42', nullable: true })
  next: string | null;

  @ApiProperty({ example: '51', nullable: true })
  prev: string | null;
}

export class TemplatesListResponseDto {
  @ApiProperty({ type: [TemplateResponseDto] })
  data: TemplateResponseDto[];

  @ApiProperty({ type: TemplatesPaginationDto })
  pagination: TemplatesPaginationDto;
}
