"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { InfoIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/http"
import {
  getAuthSession,
  getProfile,
  type AuthUser,
  updateProfile,
} from "@/lib/api/auth"
import { SettingsSidebar } from "./settings-sidebar"

type ProfileFormState = {
  firstName: string
  lastName: string
  email: string
}

export function ProfileSettingsBody() {
  return (
    <div className="flex flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Profile" />
      <ProfilePanel />
      <div className="hidden w-52 shrink-0 md:block" />
    </div>
  )
}

function ProfilePanel() {
  const router = useRouter()
  const [form, setForm] = useState<ProfileFormState>(() =>
    getFormState(getInitialUser())
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getProfile()
      .then((user) => {
        setForm(getFormState(user))
      })
      .catch((profileError: unknown) => {
        if (profileError instanceof ApiError && profileError.status === 401) {
          router.push("/auth/login")
          return
        }

        setError(getErrorMessage(profileError))
        toast.error("Profile could not be loaded", {
          description: getErrorMessage(profileError),
          classNames: { icon: "text-destructive" },
        })
      })
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const user = await updateProfile({
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
      })

      setForm(getFormState(user))
      toast.success("Profile updated", {
        description: "Your profile details have been saved.",
        classNames: { icon: "text-green-500" },
      })
    } catch (submitError) {
      const message = getErrorMessage(submitError)

      setError(message)
      toast.error("Profile update failed", {
        description: message,
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl flex-1">
      <h1 className="mb-6 text-4xl font-bold tracking-normal">Profile</h1>
      <form
        autoComplete="off"
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="first-name">First name</FieldLabel>
              <Input
                className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
                id="first-name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                required
                value={form.firstName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="last-name">Last name</FieldLabel>
              <Input
                className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
                id="last-name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                value={form.lastName}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
              id="email"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
              type="email"
              value={form.email}
            />
          </Field>
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

      <ProfileSection
        description="Send signature request to your recipients directly from your email"
        title="Email Integration"
      >
        <IntegrationButton provider="google" />
        <IntegrationButton provider="microsoft" />
      </ProfileSection>

      <ProfileSection title="Signature">
        <Button className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]">
          UPDATE SIGNATURE
        </Button>
      </ProfileSection>

      <ProfileSection title="Initials">
        <Button className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]">
          UPDATE INITIALS
        </Button>
      </ProfileSection>

      <ProfileSection title="Change Password">
        <Field>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
            id="new-password"
            type="password"
          />
        </Field>
      </ProfileSection>

      <ProfileSection title="Two-Factor Authentication">
        <p className="flex items-center gap-2 text-base">
          <InfoIcon data-icon="inline-start" />
          2FA is not configured
        </p>
        <Button className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]">
          <LockIcon data-icon="inline-start" />
          SET UP 2FA
        </Button>
      </ProfileSection>
    </section>
  )
}

function ProfileSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description?: string
  title: string
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
        {description ? <p className="mt-2">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function IntegrationButton({ provider }: { provider: "google" | "microsoft" }) {
  return (
    <Button
      className="h-12 w-full rounded-full border-2 border-[var(--auth-primary)] bg-card font-bold text-[var(--auth-foreground)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
      type="button"
      variant="outline"
    >
      {provider === "google" ? <GoogleMark /> : <MicrosoftMark />}
      {provider === "google" ? "CONNECT GMAIL" : "CONNECT MICROSOFT"}
    </Button>
  )
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="-0.5 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" fill="#FBBC05" />
      <path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" fill="#EB4335" />
      <path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" fill="#34A853" />
      <path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" fill="#4285F4" />
    </svg>
  )
}

function MicrosoftMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 6H22V22H6z" fill="#ff5722" transform="rotate(-180 14 14)" />
      <path d="M26 6H42V22H26z" fill="#4caf50" transform="rotate(-180 34 14)" />
      <path d="M26 26H42V42H26z" fill="#ffc107" transform="rotate(-180 34 34)" />
      <path d="M6 26H22V42H6z" fill="#03a9f4" transform="rotate(-180 14 34)" />
    </svg>
  )
}

function getInitialUser(): AuthUser | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  return getAuthSession()?.user
}

function getFormState(
  user?: Pick<AuthUser, "email" | "first_name" | "last_name">
): ProfileFormState {
  return {
    email: user?.email ?? "",
    firstName: user?.first_name ?? "",
    lastName: user?.last_name ?? "",
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Something went wrong. Please try again."
}
