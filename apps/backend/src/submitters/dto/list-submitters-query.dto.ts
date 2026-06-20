import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListSubmittersQueryDto {
  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  submission_id?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'zAyL9fH36Havvm' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: '2024-03-05T09:32:20.000Z' })
  @IsOptional()
  @IsDateString()
  completed_after?: string;

  @ApiPropertyOptional({ example: '2024-03-06T19:32:20.000Z' })
  @IsOptional()
  @IsDateString()
  completed_before?: string;

  @ApiPropertyOptional({ example: '2321' })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ example: '2321' })
  @IsOptional()
  @IsString()
  application_key?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  template_id?: string;

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
