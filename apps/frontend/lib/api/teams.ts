import { authenticatedApiFetch } from "./auth"

export type TeamRole = "manager" | "member" | "viewer"
export type TeamStatus = "active" | "archived"

export type Team = {
  id: string
  uuid: string
  name: string
  slug: string
  description: string | null
  members_count: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type TeamMember = {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  archived_at: string | null
  created_at: string
  user: {
    id: string
    account_role: string
    email: string
    first_name: string | null
    last_name: string | null
  }
}

export type TeamInvitation = {
  id: string
  team_id: string
  email: string
  role: TeamRole
  status: "pending" | "accepted" | "revoked" | "expired"
  accept_token?: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type CreateTeamInput = {
  description?: string
  name: string
}

export type UpdateTeamInput = Partial<CreateTeamInput>

export type AddTeamMemberInput = {
  role?: TeamRole
  user_id: string
}

export type UpdateTeamMemberInput = {
  role: TeamRole
}

export type CreateTeamInvitationInput = {
  email: string
  role?: TeamRole
}

export function listTeams(status: TeamStatus = "active"): Promise<Team[]> {
  return authenticatedApiFetch<Team[]>(`/teams?status=${status}`)
}

export function createTeam(input: CreateTeamInput): Promise<Team> {
  return authenticatedApiFetch<Team>("/teams", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<Team> {
  return authenticatedApiFetch<Team>(`/teams/${teamId}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  })
}

export function archiveTeam(teamId: string): Promise<Team> {
  return authenticatedApiFetch<Team>(`/teams/${teamId}`, {
    method: "DELETE",
  })
}

export function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  return authenticatedApiFetch<TeamMember[]>(`/teams/${teamId}/members`)
}

export function addTeamMember(
  teamId: string,
  input: AddTeamMemberInput
): Promise<TeamMember> {
  return authenticatedApiFetch<TeamMember>(`/teams/${teamId}/members`, {
    body: JSON.stringify({
      ...input,
      user_id: String(input.user_id),
    }),
    method: "POST",
  })
}

export function updateTeamMember(
  teamId: string,
  memberId: string,
  input: UpdateTeamMemberInput
): Promise<TeamMember> {
  return authenticatedApiFetch<TeamMember>(
    `/teams/${teamId}/members/${memberId}`,
    {
      body: JSON.stringify(input),
      method: "PATCH",
    }
  )
}

export function removeTeamMember(
  teamId: string,
  memberId: string
): Promise<TeamMember> {
  return authenticatedApiFetch<TeamMember>(
    `/teams/${teamId}/members/${memberId}`,
    {
      method: "DELETE",
    }
  )
}

export function listTeamInvitations(
  teamId: string
): Promise<TeamInvitation[]> {
  return authenticatedApiFetch<TeamInvitation[]>(
    `/teams/${teamId}/invitations`
  )
}

export function createTeamInvitation(
  teamId: string,
  input: CreateTeamInvitationInput
): Promise<TeamInvitation> {
  return authenticatedApiFetch<TeamInvitation>(
    `/teams/${teamId}/invitations`,
    {
      body: JSON.stringify(input),
      method: "POST",
    }
  )
}

export function revokeTeamInvitation(
  teamId: string,
  invitationId: string
): Promise<TeamInvitation> {
  return authenticatedApiFetch<TeamInvitation>(
    `/teams/${teamId}/invitations/${invitationId}`,
    {
      method: "DELETE",
    }
  )
}
