import { ApiProperty } from '@nestjs/swagger';

export class TemplateEventUserResponseDto {
  @ApiProperty({ description: 'User id that caused the event.', example: '1' })
  id!: string;

  @ApiProperty({
    description: 'User email address that caused the event.',
    example: 'ada@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User first name when available.',
    example: 'Ada',
    nullable: true,
  })
  first_name!: string | null;

  @ApiProperty({
    description: 'User last name when available.',
    example: 'Lovelace',
    nullable: true,
  })
  last_name!: string | null;
}

export class TemplateEventResponseDto {
  @ApiProperty({ description: 'Template event id.', example: '42' })
  id!: string;

  @ApiProperty({
    description: 'Template id associated with this event.',
    example: '7',
  })
  template_id!: string;

  @ApiProperty({
    description:
      'Machine-readable event type such as template.created, template.updated, or template.archived.',
    example: 'template.updated',
  })
  event_type!: string;

  @ApiProperty({
    description: 'Human-readable summary for timeline displays.',
    example: 'Changed template fields',
  })
  summary!: string;

  @ApiProperty({
    description: 'UTC timestamp when the event was recorded.',
    example: '2026-06-30T12:00:00.000Z',
  })
  event_timestamp!: Date;

  @ApiProperty({
    description:
      'Structured event payload with changed keys, resource ids, or provider metadata.',
    example: { changed: ['fields'] },
    type: Object,
  })
  data!: Record<string, unknown>;

  @ApiProperty({
    description:
      'User that caused the event. Null for system/provider generated events.',
    nullable: true,
    type: TemplateEventUserResponseDto,
  })
  user!: TemplateEventUserResponseDto | null;
}

export class TemplateEventsListResponseDto {
  @ApiProperty({
    description: 'Template events ordered newest first.',
    type: [TemplateEventResponseDto],
  })
  data!: TemplateEventResponseDto[];
}
