import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionSubmitterResponseDto } from './submission-response.dto';

export class SubmissionInitResponseDto {
  @ApiPropertyOptional({ example: '1' })
  id?: string;

  @ApiPropertyOptional({ example: '2026-09-01T12:00:00.000Z', nullable: true })
  expire_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-06-20T00:00:00.000Z' })
  created_at?: Date;

  @ApiProperty({ type: [SubmissionSubmitterResponseDto] })
  submitters!: SubmissionSubmitterResponseDto[];
}
