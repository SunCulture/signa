import { ApiProperty } from '@nestjs/swagger';

export class ProfileAssetResponseDto {
  @ApiProperty({ example: 'a453be1e-ad7c-4001-8521-ca90d0920956' })
  uuid!: string;

  @ApiProperty({ example: 'signature.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png', nullable: true })
  content_type!: string | null;

  @ApiProperty({
    example: 'http://localhost:3001/api/storage/blobs/token/signature.png',
  })
  url!: string;
}
