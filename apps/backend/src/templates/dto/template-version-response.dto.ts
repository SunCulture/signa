import { ApiProperty } from '@nestjs/swagger';
import { TemplateEventUserResponseDto } from './template-event-response.dto';

export class TemplateVersionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  template_id!: string;

  @ApiProperty()
  sha1!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;

  @ApiProperty({ nullable: true, type: TemplateEventUserResponseDto })
  author!: TemplateEventUserResponseDto | null;
}

export class TemplateVersionsListResponseDto {
  @ApiProperty({ type: [TemplateVersionResponseDto] })
  data!: TemplateVersionResponseDto[];
}
