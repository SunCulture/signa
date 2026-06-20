import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListSubmissionsQueryDto {
  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  template_id?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'completed', 'declined', 'expired'],
  })
  @IsOptional()
  @IsIn(['pending', 'completed', 'declined', 'expired'])
  status?: 'pending' | 'completed' | 'declined' | 'expired';

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'NtLDQM7eJX2ZMd' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  template_folder?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({ example: '51' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ example: 'fields' })
  @IsOptional()
  @IsString()
  include?: string;
}
