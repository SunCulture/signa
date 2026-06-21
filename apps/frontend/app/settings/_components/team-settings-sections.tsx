"use client"

import type React from "react"
import {
  ArchiveIcon,
  EditIcon,
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
  selectedTeamId,
  status,
  teams,
  onSelectTeam,
}: {
  selectedTeamId: string | null
  status: string
  teams: Team[]
  onSelectTeam: (teamId: string) => void
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-[var(--auth-muted)] p-1">
          <a
            className={getStatusClassName(status === "active")}
            href="/settings/teams"
          >
            Active
          </a>
          <a
            className={getStatusClassName(status === "archived")}
            href="/settings/teams?status=archived"
          >
            Archived
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {teams.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            No {status} teams.
          </p>
        ) : (
          teams.map((team) => (
            <button
              className={
                team.id === selectedTeamId
                  ? "grid w-full items-center gap-4 border-b border-border bg-[var(--auth-muted)] px-5 py-4 text-left last:border-b-0 md:grid-cols-[1fr_auto_auto]"
                  : "grid w-full items-center gap-4 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-[color-mix(in_srgb,var(--auth-muted),transparent_55%)] md:grid-cols-[1fr_auto_auto]"
              }
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-bold">
                  {team.name}
                </span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {team.slug}
                </span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {team.members_count}{" "}
                {team.members_count === 1 ? "member" : "members"}
              </span>
              <span className="flex justify-start md:justify-end">
                <span
                  className={
                    team.archived_at
                      ? "rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
                      : "rounded-full border border-[var(--auth-primary)] px-3 py-1 text-xs font-bold text-[var(--auth-primary)]"
                  }
                >
                  {team.archived_at ? "Archived" : "Active"}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

export function TeamDetails({
  activeUsers,
  members,
  team,
  onAddMember,
  onArchiveTeam,
  onChangeMemberRole,
  onOpenEditDialog,
  onRemoveMember,
}: {
  activeUsers: AuthUser[]
  members: TeamMember[]
  team: Team
  onAddMember: (userId: string) => void
  onArchiveTeam: (team: Team) => void
  onChangeMemberRole: (member: TeamMember, role: TeamRole) => void
  onOpenEditDialog: (team: Team) => void
  onRemoveMember: (member: TeamMember) => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">{team.name}</h2>
            <span
              className={
                team.archived_at
                  ? "rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
                  : "rounded-full border border-[var(--auth-primary)] px-3 py-1 text-xs font-bold text-[var(--auth-primary)]"
              }
            >
              {team.archived_at ? "Archived" : "Active"}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {team.description || "No description yet."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span className="rounded-full bg-[var(--auth-muted)] px-3 py-1">
              {team.slug}
            </span>
            <span className="rounded-full bg-[var(--auth-muted)] px-3 py-1">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
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

      <div className="border-t border-border">
        <MembersSection
          activeUsers={activeUsers}
          members={members}
          onAddMember={onAddMember}
          onChangeMemberRole={onChangeMemberRole}
          onRemoveMember={onRemoveMember}
        />
      </div>
    </section>
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
    <section className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Members</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign team members and adjust their team role.
          </p>
        </div>
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
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        {members.length ? (
          members.map((member) => (
            <div
              className="grid items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1fr_150px_auto]"
              key={member.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{getMemberName(member)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Select
                onValueChange={(role) =>
                  onChangeMemberRole(member, role as TeamRole)
                }
                value={member.role}
              >
                <SelectTrigger
                  className="rounded-full px-4 data-[size=default]:h-10"
                  size="default"
                >
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
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No members assigned yet.
          </p>
        )}
      </div>
    </section>
  )
}

function getStatusClassName(isActive: boolean): string {
  return isActive
    ? "rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
    : "rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
}

function getUserName(user: AuthUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
}

function getMemberName(member: TeamMember): string {
  const user = member.user
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
}
