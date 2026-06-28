import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateFolderDto {
  @ApiProperty({ example: 'Contracts' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Parent folder full path, for example "Clients / Acme".',
    example: 'Clients',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  parent?: string;
}
