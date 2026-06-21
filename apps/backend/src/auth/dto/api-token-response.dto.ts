import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { apiTokenPermissions } from '../api-token-permissions';

export class ApiTokenResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'sgna_4f8**************************x2a' })
  token!: string;

  @ApiProperty({ example: 'admin' })
  role!: string;

  @ApiProperty({ type: [String], enum: apiTokenPermissions })
  permissions!: string[];

  @ApiProperty({
    example:
      'API token belongs to this user and can be constrained below the user role.',
  })
  permissions_note!: string;

  @ApiProperty({ example: '2026-06-21T08:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-06-21T08:00:00.000Z' })
  updated_at!: Date;

  @ApiPropertyOptional({ example: '2026-06-21T08:00:00.000Z', nullable: true })
  last_used_at!: Date | null;
}

export class ApiTokenRevealResponseDto extends ApiTokenResponseDto {
  @ApiProperty({ example: 'sgna_4f8c1e4cbb8a4a1aa5d3b7c86ff9a2a1' })
  revealed_token!: string;
}

export class RevealApiTokenDto {
  @ApiProperty({ example: 'correct horse battery staple' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class UpdateApiTokenPermissionsDto {
  @ApiProperty({ type: [String], enum: apiTokenPermissions })
  @IsArray()
  @ArrayUnique()
  @IsIn(apiTokenPermissions, { each: true })
  permissions!: string[];
}

export class RotateApiTokenDto extends RevealApiTokenDto {
  @ApiProperty({ type: [String], enum: apiTokenPermissions, required: false })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(apiTokenPermissions, { each: true })
  permissions?: string[];
}
