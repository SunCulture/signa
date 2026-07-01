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
  ApiOperation,
  ApiParam,
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
  @ApiQuery({
    description: 'Filter teams by active or archived status.',
    enum: ['active', 'archived'],
    name: 'status',
    required: false,
  })
  @ApiOperation({
    description:
      'Lists account teams. Teams are account-local collaboration groups used for organization, impersonation, and team-scoped API keys.',
    summary: 'List teams',
  })
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
  @ApiOperation({
    description:
      'Creates an account-local team and optionally assigns the creating user as manager.',
    summary: 'Create team',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description: 'Returns one account-local team by id.',
    summary: 'Get team',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Updates team name, slug, description, or archived state depending on supplied fields.',
    summary: 'Update team',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Archives a team while preserving historical membership and workflow data.',
    summary: 'Archive team',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description: 'Lists active members assigned to a team.',
    summary: 'List team members',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Adds or restores an existing account user as a team member with the selected team role.',
    summary: 'Add team member',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiParam({ description: 'Team member row id.', name: 'memberId' })
  @ApiOperation({
    description:
      'Updates a team member role. Account admins and team managers can manage team roles.',
    summary: 'Update team member',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiParam({ description: 'Team member row id.', name: 'memberId' })
  @ApiOperation({
    description:
      'Removes a member from a team without deleting the underlying account user.',
    summary: 'Remove team member',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description: 'Lists pending invitations for a team.',
    summary: 'List team invitations',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Creates a team invitation and queues an invitation email with an accept token.',
    summary: 'Create team invitation',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Returns a web JWT with the selected team id in the session claims for team-scoped UI workflows.',
    summary: 'Impersonate team context',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiOperation({
    description:
      'Issues a team-scoped API token. The owning user remains the security principal and token permissions still apply.',
    summary: 'Issue team API token',
  })
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
  @ApiParam({ description: 'Team id.', name: 'id' })
  @ApiParam({ description: 'Team invitation id.', name: 'invitationId' })
  @ApiOperation({
    description: 'Revokes a pending team invitation before it is accepted.',
    summary: 'Revoke team invitation',
  })
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
  @ApiParam({
    description: 'Raw invitation token from the emailed invitation link.',
    name: 'token',
  })
  @ApiOperation({
    description:
      'Accepts a pending team invitation for the current signed-in user.',
    summary: 'Accept team invitation',
  })
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
