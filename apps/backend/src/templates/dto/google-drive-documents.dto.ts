import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GoogleDriveDocumentDto {
  @ApiProperty({ example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ example: 'Contract.pdf' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mime_type?: string;
}

export class ImportGoogleDriveDocumentsDto {
  @ApiProperty({
    description: 'OAuth access token with Google Drive file access.',
  })
  @IsString()
  access_token!: string;

  @ApiProperty({ type: [GoogleDriveDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleDriveDocumentDto)
  files!: GoogleDriveDocumentDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  merge?: boolean;
}
