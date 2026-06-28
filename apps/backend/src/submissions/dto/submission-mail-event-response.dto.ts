import { ApiProperty } from '@nestjs/swagger';

export class SubmissionMailEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  template!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  recipients!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  message_id!: string | null;

  @ApiProperty({ nullable: true })
  submitter_id!: string | null;

  @ApiProperty()
  attempt!: number;

  @ApiProperty({ nullable: true })
  job_id!: string | null;

  @ApiProperty({ nullable: true })
  last_error_message!: string | null;

  @ApiProperty({ nullable: true })
  provider_response!: string | null;

  @ApiProperty({ nullable: true })
  sent_at!: Date | null;

  @ApiProperty({ nullable: true })
  skipped_at!: Date | null;

  @ApiProperty({ nullable: true })
  failed_at!: Date | null;

  @ApiProperty()
  created_at!: Date;
}

export class SubmissionMailEventsResponseDto {
  @ApiProperty({ type: [SubmissionMailEventResponseDto] })
  data!: SubmissionMailEventResponseDto[];
}
