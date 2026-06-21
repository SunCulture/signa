"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { signaRoleLabels, signaRoles, type SignaRole } from "@repo/shared"
import {
  ArchiveIcon,
  EditIcon,
  RotateCcwIcon,
  UserPlusIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import {
  type AuthUser,
  archiveUser,
  createUser,
  getAuthSession,
  listUsers,
  updateUser,
  type UserStatus,
} from "@/lib/api/auth"
import { ApiError } from "@/lib/api/http"
import {
  addTeamMember,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  type Team,
  type TeamMember,
} from "@/lib/api/teams"
import { SettingsSidebar } from "./settings-sidebar"
import { UsersImportDialog } from "./users-import-dialog"

type UserFormState = {
  email: string
  firstName: string
  lastName: string
  role: SignaRole
}

const emptyUserForm: UserFormState = {
  email: "",
  firstName: "",
  lastName: "",
  role: "admin",
}

export function UsersSettingsBody() {
  return (
    <div className="flex w-full flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Users" />
      <UsersPanel />
    </div>
  )
}

function UsersPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = getStatus(searchParams.get("status"))
  const [users, setUsers] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyUserForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teamMembersByTeamId, setTeamMembersByTeamId] = useState<
    Record<string, TeamMember[]>
  >({})
  const [teams, setTeams] = useState<Team[]>([])
  const currentUserId = useMemo(() => getAuthSession()?.user.id ?? null, [])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)

    await Promise.all([listUsers(status), loadTeamsWithMembers()])
      .then(([loadedUsers, teamState]) => {
        setUsers(loadedUsers)
        setTeams(teamState.teams)
        setTeamMembersByTeamId(teamState.membersByTeamId)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login")
          return
        }

        toast.error("Users could not be loaded", {
          description: getErrorMessage(error),
          classNames: { icon: "text-destructive" },
        })
      })
      .finally(() => setIsLoading(false))
  }, [router, status])

  useEffect(() => {
    void Promise.resolve().then(loadUsers)
  }, [loadUsers])

  function openCreateDialog() {
    setEditingUser(null)
    setForm(emptyUserForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(user: AuthUser) {
    setEditingUser(user)
    setForm({
      email: user.email,
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      role: user.role,
    })
    setIsDialogOpen(true)
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        email: form.email,
        first_name: form.firstName.trim() || undefined,
        last_name: form.lastName.trim() || undefined,
        role: form.role,
      }
      const savedUser = editingUser
        ? await updateUser(editingUser.id, payload)
        : await createUser(payload)

      setUsers((current) => upsertUser(current, savedUser))
      setIsDialogOpen(false)
      toast.success(editingUser ? "User updated" : "User added")
    } catch (error) {
      toast.error(editingUser ? "User update failed" : "User invite failed", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleUserTeam(team: Team, user: AuthUser, isMember: boolean) {
    try {
      if (isMember) {
        const member = teamMembersByTeamId[team.id]?.find(
          (item) => item.user_id === user.id
        )

        if (member) {
          await removeTeamMember(team.id, member.id)
        }
      } else {
        await addTeamMember(team.id, { role: "member", user_id: user.id })
      }

      const members = await listTeamMembers(team.id)
      setTeamMembersByTeamId((current) => ({
        ...current,
        [team.id]: members,
      }))
      toast.success(isMember ? "User removed from team" : "User added to team")
    } catch (error) {
      toast.error("Team membership could not be updated", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function removeUser(user: AuthUser) {
    try {
      const archivedUser = await archiveUser(user.id)

      setUsers((current) =>
        current.filter((currentUser) => currentUser.id !== archivedUser.id)
      )
      toast.success("User archived")
    } catch (error) {
      toast.error("User could not be archived", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function restoreUser(user: AuthUser) {
    try {
      const restoredUser = await createUser({
        email: user.email,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        role: user.role,
      })

      setUsers((current) =>
        current.filter((currentUser) => currentUser.id !== restoredUser.id)
      )
      toast.success("User restored")
    } catch (error) {
      toast.error("User could not be restored", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-normal">
          {status === "archived" ? "Archived Users" : "Users"}
        </h1>
        <div className="flex flex-wrap justify-end gap-2">
          <UsersImportDialog onImported={loadUsers} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="h-12 rounded-full bg-[var(--auth-muted)] px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
                onClick={openCreateDialog}
                type="button"
                variant="ghost"
              >
                <UserPlusIcon data-icon="inline-start" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "New User"}
                </DialogTitle>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={submitUser}>
                <UserForm form={form} onChange={setForm} />
                {editingUser ? (
                  <UserTeamAssignments
                    teamMembersByTeamId={teamMembersByTeamId}
                    teams={teams}
                    user={editingUser}
                    onToggleTeam={toggleUserTeam}
                  />
                ) : null}
                <Button
                  className="h-11 rounded-full"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "SAVING..." : "SAVE"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <StatusLink href="/settings/users" isActive={status === "active"}>
          Active
        </StatusLink>
        <StatusLink
          href="/settings/users?status=archived"
          isActive={status === "archived"}
        >
          Archived
        </StatusLink>
      </div>

      <div className="mt-5 overflow-hidden">
        <div className="grid grid-cols-[1.1fr_1.35fr_1fr_0.7fr_0.85fr_1fr] rounded-t-2xl bg-[var(--auth-muted)] px-6 py-4 text-xs font-bold uppercase tracking-normal text-[var(--auth-primary)]">
          <span>Name</span>
          <span>Email</span>
          <span>Teams</span>
          <span>Role</span>
          <span>Last Session</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
            Loading...
          </p>
        ) : users.length === 0 ? (
          <p className="border-b border-border px-6 py-6 text-sm text-muted-foreground">
            No {status} users.
          </p>
        ) : (
          users.map((user) => (
            <div
              className="grid min-h-14 grid-cols-[1.1fr_1.35fr_1fr_0.7fr_0.85fr_1fr] items-center gap-3 border-b border-border px-6 py-3"
              key={user.id}
            >
              <span>{getUserName(user)}</span>
              <span className="truncate text-sm text-muted-foreground">
                {user.email}
              </span>
              <TeamChips
                teamMembersByTeamId={teamMembersByTeamId}
                teams={teams}
                userId={user.id}
              />
              <span>
                <span className="rounded-full border border-sky-400 px-2.5 py-0.5 text-sm capitalize text-sky-500">
                  {user.role}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">—</span>
              <div className="flex justify-end gap-2">
                {status === "archived" ? (
                  <Button
                    className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold"
                    onClick={() => restoreUser(user)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Restore
                  </Button>
                ) : (
                  <>
                    <Button
                      className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold"
                      onClick={() => openEditDialog(user)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <EditIcon data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button
                      className="h-8 rounded-full border-[var(--auth-primary)] px-4 text-xs font-bold"
                      disabled={user.id === currentUserId}
                      onClick={() => removeUser(user)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ArchiveIcon data-icon="inline-start" />
                      Archive
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function UserForm({
  form,
  onChange,
}: {
  form: UserFormState
  onChange: (form: UserFormState) => void
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <FieldInput
          label="First name"
          onChange={(firstName) => onChange({ ...form, firstName })}
          value={form.firstName}
        />
        <FieldInput
          label="Last name"
          onChange={(lastName) => onChange({ ...form, lastName })}
          value={form.lastName}
        />
      </div>
      <FieldInput
        label="Email"
        onChange={(email) => onChange({ ...form, email })}
        required
        type="email"
        value={form.email}
      />
      <div className="grid gap-2">
        <Label>Role</Label>
        <Select
          onValueChange={(role) =>
            onChange({ ...form, role: role as SignaRole })
          }
          value={form.role}
        >
          <SelectTrigger className="!h-11 min-h-11 w-full rounded-full px-5 py-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {signaRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {signaRoleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function UserTeamAssignments({
  teamMembersByTeamId,
  teams,
  user,
  onToggleTeam,
}: {
  teamMembersByTeamId: Record<string, TeamMember[]>
  teams: Team[]
  user: AuthUser
  onToggleTeam: (team: Team, user: AuthUser, isMember: boolean) => void
}) {
  return (
    <div className="grid gap-2">
      <Label>Teams</Label>
      <div className="grid gap-2 rounded-2xl border border-border p-3">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams created yet.</p>
        ) : (
          teams.map((team) => {
            const isMember = hasTeamMember(
              teamMembersByTeamId[team.id],
              user.id
            )

            return (
              <label
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-[var(--auth-muted)]"
                key={team.id}
              >
                <span className="font-semibold">{team.name}</span>
                <input
                  checked={isMember}
                  className="size-4 accent-primary"
                  onChange={() => onToggleTeam(team, user, isMember)}
                  type="checkbox"
                />
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}

function TeamChips({
  teamMembersByTeamId,
  teams,
  userId,
}: {
  teamMembersByTeamId: Record<string, TeamMember[]>
  teams: Team[]
  userId: string
}) {
  const userTeams = teams.filter((team) =>
    hasTeamMember(teamMembersByTeamId[team.id], userId)
  )

  if (userTeams.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {userTeams.slice(0, 2).map((team) => (
        <span
          className="rounded-full bg-[var(--auth-muted)] px-2 py-1 text-xs font-bold"
          key={team.id}
        >
          {team.name}
        </span>
      ))}
      {userTeams.length > 2 ? (
        <span className="rounded-full bg-[var(--auth-muted)] px-2 py-1 text-xs font-bold">
          +{userTeams.length - 2}
        </span>
      ) : null}
    </div>
  )
}

function FieldInput({
  label,
  onChange,
  type = "text",
  value,
  required = false,
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
        className="h-11 rounded-full"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </div>
  )
}

function StatusLink({
  children,
  href,
  isActive,
}: {
  children: React.ReactNode
  href: string
  isActive: boolean
}) {
  return (
    <Link
      className={
        isActive
          ? "rounded-full bg-[var(--auth-primary)] px-4 py-2 text-sm font-bold text-[var(--auth-primary-foreground)]"
          : "rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-[var(--auth-muted)]"
      }
      href={href}
    >
      {children}
    </Link>
  )
}

function getStatus(status: string | null): UserStatus {
  return status === "archived" ? "archived" : "active"
}

function getUserName(user: AuthUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ")
  return name || user.email
}

function upsertUser(users: AuthUser[], user: AuthUser): AuthUser[] {
  const existingIndex = users.findIndex((currentUser) => currentUser.id === user.id)

  if (existingIndex === -1) {
    return [user, ...users]
  }

  return users.map((currentUser) =>
    currentUser.id === user.id ? user : currentUser
  )
}

async function loadTeamsWithMembers(): Promise<{
  membersByTeamId: Record<string, TeamMember[]>
  teams: Team[]
}> {
  const teams = await listTeams("active")
  const membersEntries = await Promise.all(
    teams.map(async (team) => [team.id, await listTeamMembers(team.id)] as const)
  )

  return {
    membersByTeamId: Object.fromEntries(membersEntries),
    teams,
  }
}

function hasTeamMember(
  members: TeamMember[] | undefined,
  userId: string
): boolean {
  return members?.some((member) => member.user_id === userId) ?? false
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}
