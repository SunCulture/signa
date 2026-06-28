import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTemplateFoldersQueryDto {
  @ApiPropertyOptional({
    description: 'Direct parent folder full path.',
    example: 'Clients',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  parent?: string;

  @ApiPropertyOptional({ example: 'contract' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
