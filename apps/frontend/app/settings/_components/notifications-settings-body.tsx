"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  type AccountPreferences,
  getAccountPreferences,
  updateAccountPreferences,
} from "@/lib/api/auth"
import { ApiError } from "@/lib/api/http"
import { getChangedFields } from "@/lib/object-diff"
import { SettingsSidebar } from "./settings-sidebar"

type NotificationFormState = {
  bccEmails: string
  receiveCompletedEmail: boolean
}

type ReminderKey =
  | "first_duration"
  | "second_duration"
  | "third_duration"

type ReminderFormState = Record<ReminderKey, string | null>

const reminderDurations = [
  { label: "None", value: "none" },
  { label: "1 hour", value: "one_hour" },
  { label: "2 hours", value: "two_hours" },
  { label: "4 hours", value: "four_hours" },
  { label: "8 hours", value: "eight_hours" },
  { label: "12 hours", value: "twelve_hours" },
  { label: "24 hours", value: "twenty_four_hours" },
  { label: "2 days", value: "two_days" },
  { label: "3 days", value: "three_days" },
  { label: "4 days", value: "four_days" },
  { label: "5 days", value: "five_days" },
  { label: "6 days", value: "six_days" },
  { label: "7 days", value: "seven_days" },
  { label: "8 days", value: "eight_days" },
  { label: "15 days", value: "fifteen_days" },
  { label: "21 days", value: "twenty_one_days" },
  { label: "30 days", value: "thirty_days" },
]

export function NotificationsSettingsBody() {
  return (
    <div className="flex flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Notifications" />
      <NotificationsPanel />
      <div className="hidden w-52 shrink-0 md:block" />
    </div>
  )
}

function NotificationsPanel() {
  const router = useRouter()
  const [form, setForm] = useState<NotificationFormState>({
    bccEmails: "",
    receiveCompletedEmail: true,
  })
  const [initialForm, setInitialForm] = useState<NotificationFormState>(form)
  const [reminders, setReminders] = useState<ReminderFormState>({
    first_duration: null,
    second_duration: null,
    third_duration: null,
  })
  const [initialReminders, setInitialReminders] =
    useState<ReminderFormState>(reminders)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [isSavingReminders, setIsSavingReminders] = useState(false)

  useEffect(() => {
    getAccountPreferences()
      .then((preferences) => {
        const nextForm = toNotificationForm(preferences)

        setForm(nextForm)
        setInitialForm(nextForm)
        setReminders(preferences.submitter_reminders)
        setInitialReminders(preferences.submitter_reminders)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login")
          return
        }

        toast.error("Notification settings could not be loaded", {
          description: getErrorMessage(error),
          classNames: { icon: "text-destructive" },
        })
      })
  }, [router])

  async function saveNotifications(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const patch = getNotificationPatch(form, initialForm)

    if (Object.keys(patch).length === 0) {
      return
    }

    setIsSavingNotifications(true)

    try {
      const preferences = await updateAccountPreferences(patch)
      const nextForm = toNotificationForm(preferences)

      setForm(nextForm)
      setInitialForm(nextForm)
      toast.success("Notification settings saved")
    } catch (error) {
      toast.error("Notification settings failed to save", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSavingNotifications(false)
    }
  }

  async function saveReminders(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextReminders = getChangedFields(reminders, initialReminders)

    if (Object.keys(nextReminders).length === 0) {
      return
    }

    setIsSavingReminders(true)

    try {
      const preferences = await updateAccountPreferences({
        submitter_reminders: {
          ...initialReminders,
          ...nextReminders,
        },
      })

      setReminders(preferences.submitter_reminders)
      setInitialReminders(preferences.submitter_reminders)
      toast.success("Email reminders saved")
    } catch (error) {
      toast.error("Email reminders failed to save", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSavingReminders(false)
    }
  }

  function setReminder(key: ReminderKey, value: string) {
    setReminders((current) => ({
      ...current,
      [key]: value === "none" ? null : value,
    }))
  }

  const notificationPatch = getNotificationPatch(form, initialForm)
  const hasNotificationChanges = Object.keys(notificationPatch).length > 0
  const reminderPatch = getChangedFields(reminders, initialReminders)
  const hasReminderChanges = Object.keys(reminderPatch).length > 0

  return (
    <section className="w-full max-w-xl">
      <h1 className="text-4xl font-bold tracking-normal">Email Notifications</h1>

      <form className="mt-5 flex flex-col gap-7" onSubmit={saveNotifications}>
        <label className="flex items-center justify-between gap-4 text-base">
          <span>Receive notification emails on completed submission</span>
          <Switch
            checked={form.receiveCompletedEmail}
            onCheckedChange={(value) =>
              setForm((current) => ({
                ...current,
                receiveCompletedEmail: value,
              }))
            }
          />
        </label>

        <div className="grid gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="bcc-emails">
              Completed documents notification BCC address
            </Label>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Send email copy with completed documents to specified BCC
                  addresses.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            className="h-12 rounded-full"
            id="bcc-emails"
            inputMode="email"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bccEmails: event.target.value,
              }))
            }
            placeholder="admin@example.com, legal@example.com"
            value={form.bccEmails}
          />
        </div>

        <Button
          className="h-12 rounded-full"
          disabled={isSavingNotifications || !hasNotificationChanges}
          type="submit"
        >
          {isSavingNotifications ? "SAVING…" : "SAVE"}
        </Button>
      </form>

      <form className="mt-9 flex flex-col gap-6" onSubmit={saveReminders}>
        <h2 className="text-3xl font-bold tracking-normal">
          Sign Request Email Reminders
        </h2>

        <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(10.5rem,1fr))]">
          <ReminderSelect
            label="First reminder in"
            onValueChange={(value) => setReminder("first_duration", value)}
            value={reminders.first_duration}
          />
          <ReminderSelect
            label="Second reminder in"
            onValueChange={(value) => setReminder("second_duration", value)}
            value={reminders.second_duration}
          />
          <ReminderSelect
            label="Third reminder in"
            onValueChange={(value) => setReminder("third_duration", value)}
            value={reminders.third_duration}
          />
        </div>

        <Button
          className="h-12 rounded-full"
          disabled={isSavingReminders || !hasReminderChanges}
          type="submit"
        >
          {isSavingReminders ? "SAVING…" : "SAVE"}
        </Button>
      </form>
    </section>
  )
}

function ReminderSelect({
  label,
  onValueChange,
  value,
}: {
  label: string
  onValueChange: (value: string) => void
  value: string | null
}) {
  const id = useId()

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={onValueChange} value={value ?? "none"}>
        <SelectTrigger
          className="h-12 min-h-12 w-full rounded-full px-5 py-3 text-base leading-none"
          id={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {reminderDurations.map((duration) => (
            <SelectItem key={duration.value} value={duration.value}>
              {duration.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function toNotificationForm(
  preferences: AccountPreferences
): NotificationFormState {
  return {
    bccEmails: preferences.bcc_emails,
    receiveCompletedEmail: preferences.receive_completed_email,
  }
}

function getNotificationPatch(
  form: NotificationFormState,
  initialForm: NotificationFormState,
): Partial<AccountPreferences> {
  const changes = getChangedFields(form, initialForm)
  const patch: Partial<AccountPreferences> = {}

  if (changes.bccEmails !== undefined) {
    patch.bcc_emails = changes.bccEmails
  }

  if (changes.receiveCompletedEmail !== undefined) {
    patch.receive_completed_email = changes.receiveCompletedEmail
  }

  return patch
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}
