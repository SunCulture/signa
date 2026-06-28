"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { signaRoleLabels, signaRoles, type SignaRole } from "@repo/shared"
import {
  ArchiveIcon,
  EditIcon,
  EyeIcon,
  KeyRoundIcon,
  LinkIcon,
  type LucideIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  type AuthUser,
  listUsers,
  updateUser,
  type UserStatus,
} from "@/lib/api/auth"
import { ApiError } from "@/lib/api/http"
import {
  addTeamMember,
  archiveTeam,
  createTeam,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  type Team,
  type TeamMember,
  type TeamRole,
  updateTeam,
  updateTeamMember,
} from "@/lib/api/teams"
import { SettingsSidebar } from "./settings-sidebar"

type TeamFormState = {
  description: string
  name: string
}

type TeamUserFormState = {
  email: string
  firstName: string
  lastName: string
  role: SignaRole
  teamId: string
  teamRole: TeamRole
}

const emptyTeamForm: TeamFormState = { description: "", name: "" }
const teamRoles: TeamRole[] = ["manager", "member", "viewer"]

export function TeamsSettingsBody() {
  return (
    <div className="flex w-full flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Teams" />
      <TeamsPanel />
    </div>
  )
}

function TeamsPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = getStatus(searchParams.get("status"))
  const viewedTeamId = searchParams.get("team")
  const [users, setUsers] = useState<AuthUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [teamForm, setTeamForm] = useState<TeamFormState>(emptyTeamForm)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [userForm, setUserForm] = useState<TeamUserFormState | null>(null)

  const viewedTeam = useMemo(
    () => teams.find((team) => team.id === viewedTeamId) ?? null,
    [teams, viewedTeamId]
  )

  useEffect(() => {
    void loadTeams()
  }, [status])

  useEffect(() => {
    if (!viewedTeam) {
      setMembers([])
      return
    }

    void loadViewedTeamMembers(viewedTeam.id)
  }, [viewedTeam])

  async function loadTeams() {
    setIsLoading(true)

    try {
      const [loadedTeams, loadedUsers] = await Promise.all([
        listTeams(status),
        listUsers("active"),
      ])

      setTeams(loadedTeams)
      setUsers(loadedUsers)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login")
        return
      }

      toast.error("Teams could not be loaded", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadViewedTeamMembers(teamId: string) {
    try {
      setMembers(await listTeamMembers(teamId))
    } catch (error) {
      toast.error("Team users could not be loaded", {
        description: getErrorMessage(error),
      })
    }
  }

  function openCreateDialog() {
    setEditingTeam(null)
    setTeamForm(emptyTeamForm)
    setIsDialogOpen(true)
  }

  function openEditTeamDialog(team: Team) {
    setEditingTeam(team)
    setTeamForm({ description: team.description ?? "", name: team.name })
    setIsDialogOpen(true)
  }

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const input = {
        description: teamForm.description || undefined,
        name: teamForm.name,
      }
      const savedTeam = editingTeam
        ? await updateTeam(editingTeam.id, input)
        : await createTeam(input)

      setTeams((current) => upsertTeam(current, savedTeam))
      setIsDialogOpen(false)
      toast.success(editingTeam ? "Team updated" : "Team created")
    } catch (error) {
      toast.error("Team could not be saved", {
        description: getErrorMessage(error),
      })
    }
  }

  async function archiveSelectedTeam(team: Team) {
    try {
      await archiveTeam(team.id)
      setTeams((current) => current.filter((item) => item.id !== team.id))
      toast.success("Team removed")

      if (viewedTeamId === team.id) {
        router.push("/settings/teams")
      }
    } catch (error) {
      toast.error("Team could not be removed", {
        description: getErrorMessage(error),
      })
    }
  }

  function openEditUserDialog(member: TeamMember) {
    setEditingMember(member)
    setUserForm({
      email: member.user.email,
      firstName: member.user.first_name ?? "",
      lastName: member.user.last_name ?? "",
      role: member.user.account_role as SignaRole,
      teamId: member.team_id,
      teamRole: member.role,
    })
  }

  async function submitTeamUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingMember || !userForm || !viewedTeam) {
      return
    }

    try {
      await updateUser(editingMember.user_id, {
        email: userForm.email,
        first_name: userForm.firstName || undefined,
        last_name: userForm.lastName || undefined,
        role: userForm.role,
      })

      if (userForm.teamId === editingMember.team_id) {
        await updateTeamMember(viewedTeam.id, editingMember.id, {
          role: userForm.teamRole,
        })
      } else {
        await removeTeamMember(viewedTeam.id, editingMember.id)
        await addTeamMember(userForm.teamId, {
          role: userForm.teamRole,
          user_id: editingMember.user_id,
        })
      }

      setEditingMember(null)
      setUserForm(null)
      await Promise.all([loadTeams(), loadViewedTeamMembers(viewedTeam.id)])
      toast.success("User updated")
    } catch (error) {
      toast.error("User could not be updated", {
        description: getErrorMessage(error),
      })
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <TeamHeader
        isViewingTeam={Boolean(viewedTeam)}
        onCreate={openCreateDialog}
        teamName={viewedTeam?.name}
      />

      {viewedTeam ? (
        <TeamUsersView
          members={members}
          team={viewedTeam}
          onBack={() => router.push("/settings/teams")}
          onEditMember={openEditUserDialog}
          onRemoveTeam={() => void archiveSelectedTeam(viewedTeam)}
        />
      ) : (
        <TeamsTable
          isLoading={isLoading}
          status={status}
          teams={teams}
          onArchiveTeam={(team) => void archiveSelectedTeam(team)}
          onEditTeam={openEditTeamDialog}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Edit Team" : "Create Team"}
            </DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={submitTeam}>
            <FieldInput
              label="Name"
              onChange={(name) => setTeamForm({ ...teamForm, name })}
              required
              value={teamForm.name}
            />
            <FieldInput
              label="Description"
              onChange={(description) =>
                setTeamForm({ ...teamForm, description })
              }
              value={teamForm.description}
            />
            <Button
              className="h-12 rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              type="submit"
            >
              SUBMIT
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingMember)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMember(null)
            setUserForm(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {userForm ? (
            <form className="flex flex-col gap-6" onSubmit={submitTeamUser}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                  label="First name"
                  onChange={(firstName) =>
                    setUserForm({ ...userForm, firstName })
                  }
                  value={userForm.firstName}
                />
                <FieldInput
                  label="Last name"
                  onChange={(lastName) =>
                    setUserForm({ ...userForm, lastName })
                  }
                  value={userForm.lastName}
                />
              </div>
              <FieldInput
                label="Email"
                onChange={(email) => setUserForm({ ...userForm, email })}
                required
                type="email"
                value={userForm.email}
              />
              <p className="-mt-3 text-sm text-muted-foreground">
                {userForm.email} email address is awaiting confirmation. Follow
                the link in the email to confirm.
              </p>
              <SelectField
                label="Role"
                onValueChange={(role) =>
                  setUserForm({ ...userForm, role: role as SignaRole })
                }
                value={userForm.role}
              >
                {signaRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {signaRoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectField>
              <Link
                className="-mt-4 text-sm underline"
                href="/settings/users"
              >
                Click here to learn more about user roles and permissions.
              </Link>
              <SelectField
                label="Team account"
                onValueChange={(teamId) =>
                  setUserForm({ ...userForm, teamId })
                }
                value={userForm.teamId}
              >
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectField>
              <SelectField
                label="Team role"
                onValueChange={(teamRole) =>
                  setUserForm({ ...userForm, teamRole: teamRole as TeamRole })
                }
                value={userForm.teamRole}
              >
                {teamRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectField>
              <Button
                className="h-12 rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
                type="submit"
              >
                SUBMIT
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function TeamHeader({
  isViewingTeam,
  onCreate,
  teamName,
}: {
  isViewingTeam: boolean
  onCreate: () => void
  teamName?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-4xl font-bold tracking-normal">
        {isViewingTeam ? teamName : "Team Accounts"}
      </h1>
      {!isViewingTeam ? (
        <Button
          className="h-12 rounded-full bg-[var(--auth-muted)] px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
          onClick={onCreate}
          type="button"
          variant="ghost"
        >
          <PlusIcon data-icon="inline-start" />
          New Team
        </Button>
      ) : null}
    </div>
  )
}

function TeamsTable({
  isLoading,
  status,
  teams,
  onArchiveTeam,
  onEditTeam,
}: {
  isLoading: boolean
  status: UserStatus
  teams: Team[]
  onArchiveTeam: (team: Team) => void
  onEditTeam: (team: Team) => void
}) {
  return (
    <div className="mt-5 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] rounded-t-2xl bg-[var(--auth-muted)] px-6 py-4 text-xs font-bold uppercase tracking-normal text-[var(--auth-primary)]">
        <span>Name</span>
        <span className="text-right">Actions</span>
      </div>
      {isLoading ? (
        <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
          Loading...
        </p>
      ) : teams.length === 0 ? (
        <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
          No {status} teams.
        </p>
      ) : (
        teams.map((team) => (
          <div
            className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-6 py-3"
            key={team.id}
          >
            <span className="text-lg">{team.name}</span>
            <div className="flex flex-wrap justify-end gap-2">
              {team.members_count > 1 ? (
                <>
                  <ActionButton icon={KeyRoundIcon}>Impersonate</ActionButton>
                  <ActionButton icon={LinkIcon}>API Key</ActionButton>
                </>
              ) : null}
              <ActionButton>Logo</ActionButton>
              <ActionButton onClick={() => onEditTeam(team)}>Edit</ActionButton>
              <ActionButton asChild>
                <Link href={`/settings/teams?team=${team.id}`}>View</Link>
              </ActionButton>
              {status === "active" ? (
                <ActionButton onClick={() => onArchiveTeam(team)}>
                  Remove
                </ActionButton>
              ) : null}
            </div>
          </div>
        ))
      )}
      {status === "active" ? (
        <Link
          className="mt-5 inline-flex text-sm underline"
          href="/settings/teams?status=archived"
        >
          View Archived
        </Link>
      ) : (
        <Link className="mt-5 inline-flex text-sm underline" href="/settings/teams">
          View Active
        </Link>
      )}
    </div>
  )
}

function TeamUsersView({
  members,
  team,
  onBack,
  onEditMember,
  onRemoveTeam,
}: {
  members: TeamMember[]
  team: Team
  onBack: () => void
  onEditMember: (member: TeamMember) => void
  onRemoveTeam: () => void
}) {
  return (
    <div className="mt-5">
      <button className="mb-4 text-sm underline" onClick={onBack} type="button">
        Back to Team Accounts
      </button>
      <div className="grid grid-cols-[1fr_auto] rounded-t-2xl bg-[var(--auth-muted)] px-6 py-4 text-xs font-bold uppercase tracking-normal text-[var(--auth-primary)]">
        <span>{team.name}</span>
        <span className="text-right">Actions</span>
      </div>
      {members.length ? (
        members.map((member) => (
          <div
            className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-6 py-3"
            key={member.id}
          >
            <div className="min-w-0">
              <p className="truncate text-lg">{getMemberName(member)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {member.user.email}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <ActionButton onClick={() => onEditMember(member)}>
                Edit
              </ActionButton>
              <ActionButton asChild>
                <Link href="/templates">View</Link>
              </ActionButton>
            </div>
          </div>
        ))
      ) : (
        <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
          No users in this team.
        </p>
      )}
      <Button
        className="mt-8 h-11 rounded-full border-destructive px-5 font-bold text-destructive"
        onClick={onRemoveTeam}
        type="button"
        variant="outline"
      >
        <ArchiveIcon data-icon="inline-start" />
        Remove Team
      </Button>
    </div>
  )
}

function ActionButton({
  asChild,
  children,
  icon: Icon,
  onClick,
}: {
  asChild?: boolean
  children: React.ReactNode
  icon?: LucideIcon
  onClick?: () => void
}) {
  return (
    <Button
      asChild={asChild}
      className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold uppercase"
      onClick={onClick}
      size="sm"
      type="button"
      variant={Icon ? "default" : "outline"}
    >
      {asChild ? (
        children
      ) : (
        <>
          {Icon ? <Icon data-icon="inline-start" /> : null}
          {children}
        </>
      )}
    </Button>
  )
}

function FieldInput({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-12 rounded-full px-5"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </div>
  )
}

function SelectField({
  children,
  label,
  onValueChange,
  value,
}: {
  children: React.ReactNode
  label: string
  onValueChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="!h-12 min-h-12 w-full rounded-full px-5 py-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

function getStatus(status: string | null): UserStatus {
  return status === "archived" ? "archived" : "active"
}

function getMemberName(member: TeamMember): string {
  const name = [member.user.first_name, member.user.last_name]
    .filter(Boolean)
    .join(" ")

  return name || member.user.email
}

function upsertTeam(teams: Team[], team: Team): Team[] {
  return teams.some((item) => item.id === team.id)
    ? teams.map((item) => (item.id === team.id ? team : item))
    : [team, ...teams]
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}
