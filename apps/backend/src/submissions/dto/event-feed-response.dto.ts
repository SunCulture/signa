import { ApiProperty } from '@nestjs/swagger';

export class EventFeedItemDto {
  @ApiProperty({ example: 'form.completed' })
  event_type!: string;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  timestamp!: Date;

  @ApiProperty({ example: {} })
  data!: Record<string, unknown>;
}

export class EventFeedPaginationDto {
  @ApiProperty({ example: 10 })
  count!: number;

  @ApiProperty({ example: 1781918194, nullable: true })
  next!: number | null;

  @ApiProperty({ example: 1781918294, nullable: true })
  prev!: number | null;
}

export class EventFeedResponseDto {
  @ApiProperty({ type: [EventFeedItemDto] })
  data!: EventFeedItemDto[];

  @ApiProperty({ type: EventFeedPaginationDto })
  pagination!: EventFeedPaginationDto;
}
