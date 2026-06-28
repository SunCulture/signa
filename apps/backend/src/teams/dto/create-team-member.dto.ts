import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { teamRoles } from '../team-roles';

export class CreateTeamMemberDto {
  @ApiProperty({ example: '1' })
  @Transform(({ value }: { value: unknown }) =>
    value === null || value === undefined ? value : stringifyId(value),
  )
  @IsString()
  user_id!: string;

  @ApiPropertyOptional({ enum: teamRoles, example: 'member' })
  @IsOptional()
  @IsIn(teamRoles)
  role?: string;
}

function stringifyId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}
