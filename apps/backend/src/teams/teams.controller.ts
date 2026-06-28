import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { AuthService } from '../auth/auth.service';
import { ApiTokenRevealResponseDto } from '../auth/dto/api-token-response.dto';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { AuthorizationAction } from '../authorization/authorization-actions';
import { CheckPolicies } from '../authorization/check-policies.decorator';
import { PoliciesGuard } from '../authorization/policies.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { AcceptTeamInvitationResponseDto } from './dto/accept-team-invitation-response.dto';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamInvitationResponseDto } from './dto/team-invitation-response.dto';
import { TeamMemberResponseDto } from './dto/team-member-response.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller()
@UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(AuthorizationAction.Read, 'Team'))
@ApiTags('Teams')
@ApiBearerAuth()
export class TeamsController {
  constructor(
    private readonly authService: AuthService,
    private readonly teamsService: TeamsService,
  ) {}

  @Get('teams')
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'archived'] })
  @ApiOkResponse({ type: TeamResponseDto, isArray: true })
  listTeams(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.listTeams({
      accountId: user.accountId,
      status,
    });
  }

  @Post('teams')
  @ApiCreatedResponse({ type: TeamResponseDto })
  createTeam(
    @CurrentUser() user: User,
    @Body() body: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.createTeam({
      accountId: user.accountId,
      input: body,
      user,
    });
  }

  @Get('teams/:id')
  @ApiOkResponse({ type: TeamResponseDto })
  getTeam(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<TeamResponseDto> {
    return this.teamsService.getTeam({
      accountId: user.accountId,
      teamId,
    });
  }

  @Patch('teams/:id')
  @ApiOkResponse({ type: TeamResponseDto })
  updateTeam(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Body() body: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.updateTeam({
      accountId: user.accountId,
      actor: user,
      input: body,
      teamId,
    });
  }

  @Delete('teams/:id')
  @ApiOkResponse({ type: TeamResponseDto })
  archiveTeam(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<TeamResponseDto> {
    return this.teamsService.archiveTeam({
      accountId: user.accountId,
      actor: user,
      teamId,
    });
  }

  @Get('teams/:id/members')
  @ApiOkResponse({ type: TeamMemberResponseDto, isArray: true })
  listMembers(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamsService.listMembers({
      accountId: user.accountId,
      teamId,
    });
  }

  @Post('teams/:id/members')
  @ApiCreatedResponse({ type: TeamMemberResponseDto })
  addMember(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Body() body: CreateTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.addMember({
      accountId: user.accountId,
      actor: user,
      input: body,
      teamId,
    });
  }

  @Patch('teams/:id/members/:memberId')
  @ApiOkResponse({ type: TeamMemberResponseDto })
  updateMember(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.updateMember({
      accountId: user.accountId,
      actor: user,
      input: body,
      memberId,
      teamId,
    });
  }

  @Delete('teams/:id/members/:memberId')
  @ApiOkResponse({ type: TeamMemberResponseDto })
  removeMember(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.removeMember({
      accountId: user.accountId,
      actor: user,
      memberId,
      teamId,
    });
  }

  @Get('teams/:id/invitations')
  @ApiOkResponse({ type: TeamInvitationResponseDto, isArray: true })
  listInvitations(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<TeamInvitationResponseDto[]> {
    return this.teamsService.listInvitations({
      accountId: user.accountId,
      teamId,
    });
  }

  @Post('teams/:id/invitations')
  @ApiCreatedResponse({ type: TeamInvitationResponseDto })
  createInvitation(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Body() body: CreateTeamInvitationDto,
  ): Promise<TeamInvitationResponseDto> {
    return this.teamsService.createInvitation({
      accountId: user.accountId,
      actor: user,
      input: body,
      teamId,
    });
  }

  @Post('teams/:id/impersonate')
  @ApiOkResponse({ type: AuthResponseDto })
  async impersonateTeam(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<AuthResponseDto> {
    await this.teamsService.assertCanUseTeamAction({
      accountId: user.accountId,
      actor: user,
      teamId,
    });

    return this.authService.createTeamImpersonationResponse({
      account: user.account,
      teamId,
      user,
    });
  }

  @Post('teams/:id/api-token')
  @ApiOkResponse({ type: ApiTokenRevealResponseDto })
  async issueTeamApiToken(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
  ): Promise<ApiTokenRevealResponseDto> {
    await this.teamsService.assertCanUseTeamAction({
      accountId: user.accountId,
      actor: user,
      teamId,
    });

    return this.authService.issueTeamApiToken({ teamId, user });
  }

  @Delete('teams/:id/invitations/:invitationId')
  @ApiOkResponse({ type: TeamInvitationResponseDto })
  revokeInvitation(
    @CurrentUser() user: User,
    @Param('id') teamId: string,
    @Param('invitationId') invitationId: string,
  ): Promise<TeamInvitationResponseDto> {
    return this.teamsService.revokeInvitation({
      accountId: user.accountId,
      actor: user,
      invitationId,
      teamId,
    });
  }

  @Post('team-invitations/:token/accept')
  @ApiOkResponse({ type: AcceptTeamInvitationResponseDto })
  async acceptInvitation(
    @CurrentUser() user: User,
    @Param('token') token: string,
  ): Promise<AcceptTeamInvitationResponseDto> {
    return {
      member: await this.teamsService.acceptInvitation({ token, user }),
    };
  }
}
