import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { teamRoles } from '../team-roles';

export class CreateTeamMemberDto {
  @ApiProperty({ example: '1' })
  @IsString()
  user_id!: string;

  @ApiPropertyOptional({ enum: teamRoles, example: 'member' })
  @IsOptional()
  @IsIn(teamRoles)
  role?: string;
}
