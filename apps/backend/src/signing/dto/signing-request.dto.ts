import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSigningValuesDto {
  @ApiProperty({ example: { 'field-uuid': 'Ada Lovelace' } })
  @IsObject()
  values!: Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class DeclineSigningDto {
  @ApiPropertyOptional({ example: 'I am not the right signer.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
