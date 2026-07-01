import { ApiProperty } from '@nestjs/swagger';
import { TemplateEventUserResponseDto } from './template-event-response.dto';

export class TemplateVersionResponseDto {
  @ApiProperty({ description: 'Template version id.', example: '12' })
  id!: string;

  @ApiProperty({
    description: 'Template id this version belongs to.',
    example: '7',
  })
  template_id!: string;

  @ApiProperty({
    description: 'SHA-1 fingerprint of the version payload.',
    example: '4f2f2c7f4df2d742d1e2c1d94b8f2e95d9f0a111',
  })
  sha1!: string;

  @ApiProperty({
    description: 'UTC timestamp when the version snapshot was created.',
    example: '2026-06-30T12:00:00.000Z',
  })
  created_at!: Date;

  @ApiProperty({
    description:
      'Snapshot payload containing fields, submitters, preferences, schema, and related template state.',
    example: { fields: [], submitters: [{ name: 'First Party' }] },
    type: Object,
  })
  data!: Record<string, unknown>;

  @ApiProperty({
    description:
      'User that authored this version, or null for system snapshots.',
    nullable: true,
    type: TemplateEventUserResponseDto,
  })
  author!: TemplateEventUserResponseDto | null;
}

export class TemplateVersionsListResponseDto {
  @ApiProperty({
    description: 'Template version snapshots ordered newest first.',
    type: [TemplateVersionResponseDto],
  })
  data!: TemplateVersionResponseDto[];
}
