import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTemplateFolderDto {
  @ApiPropertyOptional({ example: 'Signed contracts' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description:
      'New parent folder full path. Send an empty string to move to root.',
    example: 'Clients',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  parent?: string;
}
