import { signaRoles } from '@repo/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportUserRowDto {
  @ApiProperty({ example: 'grace@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Grace' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Hopper' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ enum: signaRoles, example: 'member' })
  @IsOptional()
  @IsIn(signaRoles)
  role?: string;

  @ApiPropertyOptional({ example: 'Legal' })
  @IsOptional()
  @IsString()
  team?: string;
}

export class ImportUsersDto {
  @ApiProperty({ type: ImportUserRowDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportUserRowDto)
  users!: ImportUserRowDto[];
}
