import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { teamRoles } from '../team-roles';

export class CreateTeamInvitationDto {
  @ApiProperty({ example: 'teammate@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: teamRoles, example: 'member' })
  @IsOptional()
  @IsIn(teamRoles)
  role?: string;
}
