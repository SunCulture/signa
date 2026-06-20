import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberResponseDto } from './team-member-response.dto';

export class AcceptTeamInvitationResponseDto {
  @ApiProperty({ type: TeamMemberResponseDto })
  member!: TeamMemberResponseDto;
}
