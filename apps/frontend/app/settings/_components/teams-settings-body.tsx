"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { type AuthUser, listUsers } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/http"
import {
  addTeamMember,
  archiveTeam,
  createTeam,
  createTeamInvitation,
  listTeamInvitations,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  revokeTeamInvitation,
  type Team,
  type TeamInvitation,
  type TeamMember,
  type TeamRole,
  updateTeam,
  updateTeamMember,
} from "@/lib/api/teams"
import { SettingsSidebar } from "./settings-sidebar"
import {
  TeamDetails,
  TeamForm,
  type TeamFormState,
  TeamList,
  TeamsHeader,
} from "./team-settings-sections"

const emptyTeamForm = { description: "", name: "" }

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
  const status = searchParams.get("status") === "archived" ? "archived" : "active"
  const [activeUsers, setActiveUsers] = useState<AuthUser[]>([])
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [form, setForm] = useState<TeamFormState>(emptyTeamForm)
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [isSavingTeam, setIsSavingTeam] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null,
    [selectedTeamId, teams]
  )

  useEffect(() => {
    Promise.all([listTeams(status), listUsers("active")])
      .then(([loadedTeams, loadedUsers]) => {
        setTeams(loadedTeams)
        setActiveUsers(loadedUsers)
        setSelectedTeamId((current) => current ?? loadedTeams[0]?.id ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login")
          return
        }

        toast.error("Teams could not be loaded", {
          description: getErrorMessage(error),
          classNames: { icon: "text-destructive" },
        })
      })
  }, [router, status])

  useEffect(() => {
    if (!selectedTeam) {
      return
    }

    Promise.all([
      listTeamMembers(selectedTeam.id),
      listTeamInvitations(selectedTeam.id),
    ])
      .then(([loadedMembers, loadedInvitations]) => {
        setMembers(loadedMembers)
        setInvitations(loadedInvitations)
      })
      .catch((error) =>
        toast.error("Team details could not be loaded", {
          description: getErrorMessage(error),
          classNames: { icon: "text-destructive" },
        })
      )
  }, [selectedTeam])

  function openCreateDialog() {
    setEditingTeam(null)
    setForm(emptyTeamForm)
    setIsTeamDialogOpen(true)
  }

  function openEditDialog(team: Team) {
    setEditingTeam(team)
    setForm({ description: team.description ?? "", name: team.name })
    setIsTeamDialogOpen(true)
  }

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingTeam(true)

    try {
      const input = {
        description: form.description || undefined,
        name: form.name,
      }
      const savedTeam = editingTeam
        ? await updateTeam(editingTeam.id, input)
        : await createTeam(input)

      setTeams((current) => upsertTeam(current, savedTeam))
      setSelectedTeamId(savedTeam.id)
      setIsTeamDialogOpen(false)
      toast.success(editingTeam ? "Team updated" : "Team created")
    } catch (error) {
      toast.error("Team could not be saved", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSavingTeam(false)
    }
  }

  async function archiveSelectedTeam(team: Team) {
    try {
      await archiveTeam(team.id)
      setTeams((current) => current.filter((item) => item.id !== team.id))
      setInvitations([])
      setMembers([])
      setSelectedTeamId(null)
      toast.success("Team archived")
    } catch (error) {
      toast.error("Team could not be archived", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function addMember(userId: string) {
    if (!selectedTeam) return

    try {
      const member = await addTeamMember(selectedTeam.id, {
        role: "member",
        user_id: userId,
      })
      setMembers((current) => upsertMember(current, member))
      toast.success("Member added")
    } catch (error) {
      toast.error("Member could not be added", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function changeMemberRole(member: TeamMember, role: TeamRole) {
    if (!selectedTeam) return

    try {
      const updatedMember = await updateTeamMember(selectedTeam.id, member.id, {
        role,
      })
      setMembers((current) => upsertMember(current, updatedMember))
    } catch (error) {
      toast.error("Member role could not be updated", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function removeMember(member: TeamMember) {
    if (!selectedTeam) return

    try {
      await removeTeamMember(selectedTeam.id, member.id)
      setMembers((current) => current.filter((item) => item.id !== member.id))
      toast.success("Member removed")
    } catch (error) {
      toast.error("Member could not be removed", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function inviteMember(email: string, role: TeamRole) {
    if (!selectedTeam) return

    try {
      const invitation = await createTeamInvitation(selectedTeam.id, {
        email,
        role,
      })
      setInvitations((current) => [invitation, ...current])
      toast.success("Invitation created")
    } catch (error) {
      toast.error("Invitation could not be created", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  async function revokeInvitation(invitation: TeamInvitation) {
    if (!selectedTeam) return

    try {
      const revokedInvitation = await revokeTeamInvitation(
        selectedTeam.id,
        invitation.id
      )
      setInvitations((current) =>
        current.map((item) =>
          item.id === revokedInvitation.id ? revokedInvitation : item
        )
      )
      toast.success("Invitation revoked")
    } catch (error) {
      toast.error("Invitation could not be revoked", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <TeamsHeader
        isDialogOpen={isTeamDialogOpen}
        onDialogOpenChange={setIsTeamDialogOpen}
        onOpenCreateDialog={openCreateDialog}
      >
        <TeamForm
          form={form}
          isSaving={isSavingTeam}
          mode={editingTeam ? "edit" : "create"}
          onChange={setForm}
          onSubmit={submitTeam}
        />
      </TeamsHeader>

      <div className="mt-5 grid gap-5">
        <TeamList
          onArchiveTeam={archiveSelectedTeam}
          onOpenEditDialog={openEditDialog}
          selectedTeamId={selectedTeam?.id ?? null}
          status={status}
          teams={teams}
          onSelectTeam={setSelectedTeamId}
        />
        {selectedTeam ? (
          <TeamDetails
            activeUsers={activeUsers}
            invitations={invitations}
            members={members}
            team={selectedTeam}
            onAddMember={addMember}
            onArchiveTeam={archiveSelectedTeam}
            onChangeMemberRole={changeMemberRole}
            onInviteMember={inviteMember}
            onOpenEditDialog={openEditDialog}
            onRemoveMember={removeMember}
            onRevokeInvitation={revokeInvitation}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            No {status} teams yet.
          </div>
        )}
      </div>
    </section>
  )
}

function upsertTeam(teams: Team[], team: Team): Team[] {
  return teams.some((item) => item.id === team.id)
    ? teams.map((item) => (item.id === team.id ? team : item))
    : [team, ...teams]
}

function upsertMember(
  members: TeamMember[],
  member: TeamMember
): TeamMember[] {
  return members.some((item) => item.id === member.id)
    ? members.map((item) => (item.id === member.id ? member : item))
    : [...members, member]
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}
