"use client"

import type React from "react"
import { useState } from "react"
import {
  ArchiveIcon,
  EditIcon,
  MailPlusIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AuthUser } from "@/lib/api/auth"
import type {
  Team,
  TeamInvitation,
  TeamMember,
  TeamRole,
} from "@/lib/api/teams"

export type TeamFormState = {
  description: string
  name: string
}

const teamRoles: TeamRole[] = ["manager", "member", "viewer"]

export function TeamsHeader({
  children,
  isDialogOpen,
  onDialogOpenChange,
  onOpenCreateDialog,
}: {
  children: React.ReactNode
  isDialogOpen: boolean
  onDialogOpenChange: (open: boolean) => void
  onOpenCreateDialog: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-4xl font-bold tracking-normal">Teams</h1>
        <p className="mt-2 text-muted-foreground">
          Organize account users into groups with team-level roles.
        </p>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="h-12 rounded-full bg-[var(--auth-muted)] px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
            onClick={onOpenCreateDialog}
            type="button"
            variant="ghost"
          >
            <PlusIcon data-icon="inline-start" />
            Create Team
          </Button>
        </DialogTrigger>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    </div>
  )
}

export function TeamForm({
  form,
  isSaving,
  mode,
  onChange,
  onSubmit,
}: {
  form: TeamFormState
  isSaving: boolean
  mode: "create" | "edit"
  onChange: (form: TeamFormState) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Team" : "Create Team"}</DialogTitle>
      </DialogHeader>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input
            className="h-11 rounded-full"
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            value={form.description}
          />
        </div>
        <Button className="h-11 rounded-full" disabled={isSaving} type="submit">
          {isSaving ? "SAVING..." : "SAVE"}
        </Button>
      </form>
    </>
  )
}

export function TeamList({
  onArchiveTeam,
  onOpenEditDialog,
  selectedTeamId,
  status,
  teams,
  onSelectTeam,
}: {
  onArchiveTeam: (team: Team) => void
  onOpenEditDialog: (team: Team) => void
  selectedTeamId: string | null
  status: string
  teams: Team[]
  onSelectTeam: (teamId: string) => void
}) {
  return (
    <section>
      <div className="mb-5 flex gap-2">
        <a className={getStatusClassName(status === "active")} href="/settings/teams">
          Active
        </a>
        <a
          className={getStatusClassName(status === "archived")}
          href="/settings/teams?status=archived"
        >
          Archived
        </a>
      </div>
      <div className="overflow-hidden">
        <div className="grid grid-cols-[1.25fr_1fr_0.75fr_0.75fr_1fr] rounded-t-2xl bg-[var(--auth-muted)] px-6 py-4 text-xs font-bold uppercase tracking-normal text-[var(--auth-primary)]">
          <span>Name</span>
          <span>Slug</span>
          <span>Members</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {teams.length === 0 ? (
          <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
            No {status} teams.
          </p>
        ) : (
          teams.map((team) => (
            <div
              className={
                team.id === selectedTeamId
                  ? "grid min-h-14 grid-cols-[1.25fr_1fr_0.75fr_0.75fr_1fr] items-center gap-3 border-b border-[var(--auth-primary)] bg-[color-mix(in_srgb,var(--auth-muted),transparent_45%)] px-6 py-3"
                  : "grid min-h-14 grid-cols-[1.25fr_1fr_0.75fr_0.75fr_1fr] items-center gap-3 border-b border-border px-6 py-3 hover:bg-[color-mix(in_srgb,var(--auth-muted),transparent_55%)]"
              }
              key={team.id}
            >
              <button
                className="text-left font-semibold"
                onClick={() => onSelectTeam(team.id)}
                type="button"
              >
                {team.name}
              </button>
              <span className="truncate text-sm text-muted-foreground">
                {team.slug}
              </span>
              <span className="text-sm">{team.members_count}</span>
              <span>
                <span className="rounded-full border border-sky-400 px-2.5 py-0.5 text-sm text-sky-500">
                  {team.archived_at ? "Archived" : "Active"}
                </span>
              </span>
              <div className="flex justify-end gap-2">
                <Button
                  className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold"
                  onClick={() => onOpenEditDialog(team)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Edit
                </Button>
                <Button
                  className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold"
                  onClick={() => onArchiveTeam(team)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Archive
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function TeamDetails({
  activeUsers,
  invitations,
  members,
  team,
  onAddMember,
  onArchiveTeam,
  onChangeMemberRole,
  onInviteMember,
  onOpenEditDialog,
  onRemoveMember,
  onRevokeInvitation,
}: {
  activeUsers: AuthUser[]
  invitations: TeamInvitation[]
  members: TeamMember[]
  team: Team
  onAddMember: (userId: string) => void
  onArchiveTeam: (team: Team) => void
  onChangeMemberRole: (member: TeamMember, role: TeamRole) => void
  onInviteMember: (email: string, role: TeamRole) => void
  onOpenEditDialog: (team: Team) => void
  onRemoveMember: (member: TeamMember) => void
  onRevokeInvitation: (invitation: TeamInvitation) => void
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{team.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {team.description || "No description yet."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="h-10 rounded-full"
              onClick={() => onOpenEditDialog(team)}
              type="button"
              variant="outline"
            >
              <EditIcon data-icon="inline-start" />
              Edit
            </Button>
            <Button
              className="h-10 rounded-full"
              onClick={() => onArchiveTeam(team)}
              type="button"
              variant="outline"
            >
              <ArchiveIcon data-icon="inline-start" />
              Archive
            </Button>
          </div>
        </div>
      </section>

      <MembersSection
        activeUsers={activeUsers}
        members={members}
        onAddMember={onAddMember}
        onChangeMemberRole={onChangeMemberRole}
        onRemoveMember={onRemoveMember}
      />
      <InvitationsSection
        invitations={invitations}
        onInviteMember={onInviteMember}
        onRevokeInvitation={onRevokeInvitation}
      />
    </div>
  )
}

function MembersSection({
  activeUsers,
  members,
  onAddMember,
  onChangeMemberRole,
  onRemoveMember,
}: {
  activeUsers: AuthUser[]
  members: TeamMember[]
  onAddMember: (userId: string) => void
  onChangeMemberRole: (member: TeamMember, role: TeamRole) => void
  onRemoveMember: (member: TeamMember) => void
}) {
  const memberUserIds = new Set(members.map((member) => member.user_id))
  const availableUsers = activeUsers.filter((user) => !memberUserIds.has(user.id))

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold">Members</h3>
        <Select onValueChange={onAddMember}>
          <SelectTrigger className="h-10 w-56 rounded-full">
            <UserPlusIcon data-icon="inline-start" />
            <SelectValue placeholder="Add member" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {getUserName(user)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 grid gap-2">
        {members.map((member) => (
          <div
            className="grid items-center gap-3 rounded-xl border border-border px-4 py-3 md:grid-cols-[1fr_160px_auto]"
            key={member.id}
          >
            <div>
              <p className="font-semibold">{getMemberName(member)}</p>
              <p className="text-sm text-muted-foreground">
                {member.user.email}
              </p>
            </div>
            <Select
              onValueChange={(role) =>
                onChangeMemberRole(member, role as TeamRole)
              }
              value={member.role}
            >
              <SelectTrigger className="h-10 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-10 rounded-full"
              onClick={() => onRemoveMember(member)}
              type="button"
              variant="outline"
            >
              <TrashIcon data-icon="inline-start" />
              Remove
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function InvitationsSection({
  invitations,
  onInviteMember,
  onRevokeInvitation,
}: {
  invitations: TeamInvitation[]
  onInviteMember: (email: string, role: TeamRole) => void
  onRevokeInvitation: (invitation: TeamInvitation) => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<TeamRole>("member")

  function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onInviteMember(email, role)
    setEmail("")
    setRole("member")
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xl font-bold">Invitations</h3>
      <form
        className="mt-4 grid gap-2 md:grid-cols-[1fr_150px_auto]"
        onSubmit={submitInvitation}
      >
        <Input
          className="h-11 rounded-full"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          required
          type="email"
          value={email}
        />
        <Select onValueChange={(value) => setRole(value as TeamRole)} value={role}>
          <SelectTrigger className="h-11 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teamRoles.map((teamRole) => (
              <SelectItem key={teamRole} value={teamRole}>
                {teamRole}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="h-11 rounded-full" type="submit">
          <MailPlusIcon data-icon="inline-start" />
          Invite
        </Button>
      </form>
      <div className="mt-4 grid gap-2">
        {invitations.map((invitation) => (
          <div
            className="grid items-center gap-3 rounded-xl border border-border px-4 py-3 md:grid-cols-[1fr_110px_110px_auto]"
            key={invitation.id}
          >
            <span className="font-semibold">{invitation.email}</span>
            <span className="text-sm capitalize">{invitation.role}</span>
            <span className="text-sm capitalize text-muted-foreground">
              {invitation.status}
            </span>
            <Button
              className="h-9 rounded-full"
              disabled={invitation.status !== "pending"}
              onClick={() => onRevokeInvitation(invitation)}
              type="button"
              variant="outline"
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function getStatusClassName(isActive: boolean): string {
  return isActive
    ? "rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
    : "rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-[var(--auth-muted)]"
}

function getUserName(user: AuthUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
}

function getMemberName(member: TeamMember): string {
  const user = member.user
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
}
