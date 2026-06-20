"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CircleAlertIcon, HelpCircleIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { ApiError } from "@/lib/api/http"
import {
  type AccountPreferences,
  deleteAccount,
  getAccount,
  getAccountPreferences,
  getAuthSession,
  updateAccount,
  updateAccountPreferences,
  type AuthAccount,
} from "@/lib/api/auth"
import { SettingsSidebar } from "./settings-sidebar"

type AccountFormState = {
  locale: string
  name: string
  timezone: string
}

type PreferenceItem = {
  description?: string
  key: keyof AccountPreferences
  label: string
  mark?: string
  tooltip: string
}

const timezones = [
  { label: "(GMT+03:00) Nairobi", value: "Africa/Nairobi" },
  { label: "(GMT+00:00) UTC", value: "UTC" },
  { label: "(GMT+00:00) London", value: "Europe/London" },
  { label: "(GMT+01:00) Paris", value: "Europe/Paris" },
  { label: "(GMT-05:00) New York", value: "America/New_York" },
]

const languages = [
  { label: "English (United States)", value: "en-US" },
  { label: "Swahili (Kenya)", value: "sw-KE" },
  { label: "French (France)", value: "fr-FR" },
]

const preferenceItems: PreferenceItem[] = [
  {
    key: "force_mfa",
    label: "Force 2FA with Authenticator App",
    tooltip: "Require team members to use two-factor authentication.",
  },
  {
    key: "with_signature_id",
    label: "Add signature ID to the documents",
    tooltip: "Add a unique signature ID and timestamp to each signature.",
  },
  {
    key: "require_signing_reason",
    label: "Require signing reason",
    tooltip: "Ask signers to provide a reason before completing a signature.",
  },
  {
    key: "allow_typed_signature",
    label: "Allow typed text signatures",
    tooltip: "Allow signers to type their signature instead of drawing it.",
  },
  {
    key: "allow_to_resubmit",
    label: "Allow to resubmit completed forms",
    tooltip: "Allow recipients to submit a completed shared form again.",
  },
  {
    key: "allow_to_decline",
    label: "Allow to decline documents",
    tooltip: "Allow recipients to decline a signature request.",
  },
  {
    key: "allow_to_delegate",
    label: "Allow to delegate documents",
    tooltip: "Allow recipients to delegate signing to another person.",
  },
  {
    key: "form_prefill_signature",
    label: "Remember and pre-fill signatures",
    tooltip: "Reuse saved signature data where the signer is recognized.",
  },
  {
    key: "download_links_expire",
    label: "Expirable file download links",
    tooltip: "Generate document download links with an expiration window.",
  },
  {
    key: "download_links_auth",
    label: "Require authentication for file download links",
    tooltip: "Require authentication before generated document links can be opened.",
  },
  {
    key: "combine_pdf_result_key",
    label: "Combine completed documents and Audit Log",
    tooltip: "Generate one combined result containing signed documents and audit log.",
  },
]

const complianceItems: PreferenceItem[] = [
  {
    description: "Sign BAA to enter a HIPAA compliance agreement.",
    key: "hipaa",
    label: "HIPAA",
    mark: "HIPAA",
    tooltip: "Track whether HIPAA compliance mode is enabled for this account.",
  },
  {
    description: "Enable 21 CFR Part 11 compliance features.",
    key: "cfr_part_11",
    label: "21 CFR Part 11",
    mark: "FDA",
    tooltip: "Enable controls aligned with 21 CFR Part 11 workflows.",
  },
  {
    description: "Enable Knowledge-based authentication.",
    key: "knowledge_based_authentication",
    label: "Knowledge-based Authentication",
    mark: "KBA",
    tooltip: "Require identity verification questions before signing.",
  },
]

export function AccountSettingsBody() {
  return (
    <div className="flex flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Account" />
      <AccountPanel />
      <div className="hidden w-52 shrink-0 md:block" />
    </div>
  )
}

function AccountPanel() {
  const router = useRouter()
  const [form, setForm] = useState<AccountFormState>(() =>
    getFormState(getInitialAccount())
  )
  const [preferences, setPreferences] = useState<AccountPreferences | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savingPreference, setSavingPreference] = useState<
    keyof AccountPreferences | null
  >(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const languageLabel = useMemo(
    () =>
      languages.find((language) => language.value === form.locale)?.label ??
      "English (United States)",
    [form.locale]
  )

  useEffect(() => {
    Promise.all([getAccount(), getAccountPreferences()])
      .then(([account, accountPreferences]) => {
        setForm(getFormState(account))
        setPreferences(accountPreferences)
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiError && loadError.status === 401) {
          router.push("/auth/login")
          return
        }

        setError(getErrorMessage(loadError))
        toast.error("Account settings could not be loaded", {
          description: getErrorMessage(loadError),
          classNames: { icon: "text-destructive" },
        })
      })
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const account = await updateAccount(form)

      setForm(getFormState(account))
      toast.success("Account updated", {
        description: "Your account settings have been saved.",
        classNames: { icon: "text-green-500" },
      })
    } catch (submitError) {
      const message = getErrorMessage(submitError)

      setError(message)
      toast.error("Account update failed", {
        description: message,
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePreferenceChange(
    key: keyof AccountPreferences,
    value: boolean
  ) {
    if (!preferences) {
      return
    }

    const nextPreferences = {
      ...preferences,
      [key]: value,
    }

    setPreferences(nextPreferences)
    setSavingPreference(key)
    setError(null)

    try {
      setPreferences(await updateAccountPreferences({ [key]: value }))
      toast.success("Preference updated", {
        description: `${getPreferenceLabel(key)} is now ${value ? "enabled" : "disabled"}.`,
        classNames: { icon: "text-green-500" },
      })
    } catch (preferenceError) {
      const message = getErrorMessage(preferenceError)

      setPreferences(preferences)
      setError(message)
      toast.error("Preference update failed", {
        description: message,
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setSavingPreference(null)
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteAccount()
      toast.success("Account deleted", {
        description: "You have been signed out.",
        classNames: { icon: "text-green-500" },
      })
      router.push("/auth/register")
    } catch (deleteError) {
      const message = getErrorMessage(deleteError)

      setError(message)
      toast.error("Account deletion failed", {
        description: message,
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-[36rem] flex-1">
      <h1 className="mb-6 text-4xl font-bold tracking-normal">Account</h1>
      <form
        autoComplete="off"
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="company-name">Company name</FieldLabel>
            <Input
              className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
              id="company-name"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              value={form.name}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Field>
              <FieldLabel>Time zone</FieldLabel>
              <Select
                onValueChange={(timezone) =>
                  setForm((current) => ({ ...current, timezone }))
                }
                value={form.timezone}
              >
                <SelectTrigger className="!h-12 w-full rounded-full border-[var(--auth-input-border)] bg-card px-5">
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {timezones.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Language</FieldLabel>
              <Select
                onValueChange={(locale) =>
                  setForm((current) => ({ ...current, locale }))
                }
                value={form.locale}
              >
                <SelectTrigger className="!h-12 w-full rounded-full border-[var(--auth-input-border)] bg-card px-5">
                  <SelectValue placeholder={languageLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {languages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            className="h-12 rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "UPDATING" : "UPDATE"}
          </Button>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
      </form>

      <AccountSection title="Preferences">
        <div className="flex flex-col gap-4">
          {preferenceItems.map((item) => (
            <PreferenceRow
              checked={preferences?.[item.key] ?? false}
              disabled={savingPreference === item.key}
              item={item}
              key={item.key}
              onCheckedChange={(checked) =>
                handlePreferenceChange(item.key, checked)
              }
            />
          ))}
        </div>
      </AccountSection>

      <AccountSection title="Compliance">
        <div className="flex flex-col gap-4">
          {complianceItems.map((item) => (
            <ComplianceCard
              checked={preferences?.[item.key] ?? false}
              disabled={savingPreference === item.key}
              item={item}
              key={item.key}
              onCheckedChange={(checked) =>
                handlePreferenceChange(item.key, checked)
              }
            />
          ))}
        </div>
      </AccountSection>

      <DangerZone
        disabled={isDeleting}
        onDeleteAccount={handleDeleteAccount}
      />
    </section>
    </TooltipProvider>
  )
}

function AccountSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
      {children}
    </section>
  )
}

function PreferenceRow({
  checked,
  disabled,
  item,
  onCheckedChange,
}: {
  checked: boolean
  disabled: boolean
  item: PreferenceItem
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-4">
      <label
        className="flex items-center gap-1.5 text-base"
        htmlFor={`account-preference-${item.key}`}
      >
        {item.label}
        <Tooltip>
          <TooltipTrigger
            aria-label={`${item.label} help`}
            className="inline-flex text-[var(--auth-label)] transition-colors hover:text-[var(--auth-primary)]"
            type="button"
          >
            <HelpCircleIcon aria-hidden="true" className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="right">{item.tooltip}</TooltipContent>
        </Tooltip>
      </label>
      <Switch
        checked={checked}
        disabled={disabled}
        id={`account-preference-${item.key}`}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function ComplianceCard({
  checked,
  disabled,
  item,
  onCheckedChange,
}: {
  checked: boolean
  disabled: boolean
  item: PreferenceItem
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--auth-input-border)] bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[var(--auth-input-border)] bg-[var(--auth-muted)] px-2 text-center text-sm font-extrabold leading-none text-[var(--auth-primary)]">
          {item.mark}
        </div>
        <div>
          <h3 className="text-lg font-bold">{item.label}</h3>
          {item.description ? (
            <p className="text-sm text-[var(--auth-label)]">
              {item.description}{" "}
              <span className="underline underline-offset-4">Learn more</span>
            </p>
          ) : null}
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        id={`account-preference-${item.key}`}
        onCheckedChange={onCheckedChange}
      />
    </article>
  )
}

function DangerZone({
  disabled,
  onDeleteAccount,
}: {
  disabled: boolean
  onDeleteAccount: () => void
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-normal">Danger Zone</h2>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="h-12 w-fit rounded-full border border-destructive bg-transparent px-5 font-bold text-destructive hover:bg-destructive/10"
            type="button"
            variant="destructive"
          >
            DELETE MY ACCOUNT
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <div className="flex items-start gap-3 py-1">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <CircleAlertIcon className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col justify-center gap-1">
              <AlertDialogTitle className="text-sm font-semibold">
                Delete your account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This archives your account and locks the current user. You will
                be signed out immediately.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep My Account</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={onDeleteAccount}
              variant="destructive"
            >
              {disabled ? "Deleting" : "Delete Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function getInitialAccount(): AuthAccount | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  return getAuthSession()?.account
}

function getFormState(
  account?: Pick<AuthAccount, "locale" | "name" | "timezone">
): AccountFormState {
  return {
    locale: account?.locale ?? "en-US",
    name: account?.name ?? "",
    timezone: account?.timezone ?? "Africa/Nairobi",
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

function getPreferenceLabel(key: keyof AccountPreferences): string {
  return (
    [...preferenceItems, ...complianceItems].find((item) => item.key === key)
      ?.label ?? "Preference"
  )
}
