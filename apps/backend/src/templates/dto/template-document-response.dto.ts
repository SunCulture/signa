import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateDocumentPreviewImageResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'https://api.example.test/blobs/proxy/...' })
  url: string;

  @ApiProperty({ example: '0.png' })
  filename: string;

  @ApiProperty({
    example: {
      width: 1400,
      height: 1812,
      analyzed: true,
      identified: true,
    },
  })
  metadata: Record<string, unknown>;
}

export class TemplateDocumentResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '3fb60df2-8c58-4ff9-a9df-5e26d90e5c8d' })
  uuid: string;

  @ApiProperty({ example: 'https://api.example.test/blobs/proxy/...' })
  url: string;

  @ApiPropertyOptional({
    example: 'https://api.example.test/blobs/proxy/previews/0.png',
    nullable: true,
  })
  preview_image_url: string | null;

  @ApiProperty({ type: [TemplateDocumentPreviewImageResponseDto] })
  preview_images: TemplateDocumentPreviewImageResponseDto[];

  @ApiProperty({ example: 'contract.pdf' })
  filename: string;
}
