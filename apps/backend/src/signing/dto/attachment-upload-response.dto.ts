import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachmentUploadResponseDto {
  @ApiProperty({ example: '0954d146-db8c-4772-aafe-2effc7c0e0c0' })
  uuid!: string;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: 'signature.png' })
  filename!: string;

  @ApiPropertyOptional({ example: 'image/png', nullable: true })
  content_type!: string | null;

  @ApiProperty({
    example: 'http://localhost:3001/api/storage/blobs/token/signature.png',
  })
  url!: string;
}
