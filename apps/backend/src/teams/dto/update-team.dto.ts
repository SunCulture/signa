import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Legal Operations' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Users who manage legal templates and submissions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
