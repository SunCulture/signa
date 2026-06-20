import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { teamRoles } from '../team-roles';

export class UpdateTeamMemberDto {
  @ApiProperty({ enum: teamRoles, example: 'manager' })
  @IsIn(teamRoles)
  role!: string;
}
