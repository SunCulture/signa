import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Legal' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: 'Users who manage legal templates and submissions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
