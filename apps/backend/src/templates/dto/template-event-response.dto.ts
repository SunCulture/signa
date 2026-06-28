import { ApiProperty } from '@nestjs/swagger';

export class TemplateEventUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  first_name!: string | null;

  @ApiProperty({ nullable: true })
  last_name!: string | null;
}

export class TemplateEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  template_id!: string;

  @ApiProperty()
  event_type!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  event_timestamp!: Date;

  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;

  @ApiProperty({ nullable: true, type: TemplateEventUserResponseDto })
  user!: TemplateEventUserResponseDto | null;
}

export class TemplateEventsListResponseDto {
  @ApiProperty({ type: [TemplateEventResponseDto] })
  data!: TemplateEventResponseDto[];
}
