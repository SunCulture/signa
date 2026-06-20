"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  CopyIcon,
  DownloadIcon,
  FolderIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api/http"
import {
  archiveSubmission,
  createSubmission,
  listSubmissions,
  type SubmissionResponse,
} from "@/lib/api/submissions"
import {
  archiveTemplate,
  cloneTemplate,
  getTemplate,
  type TemplateResponse,
  updateTemplate,
  updateTemplatePreferences,
} from "@/lib/api/templates"
import { ThemeModeSwitcher } from "../_components/theme-mode-switcher"
import { UserMenu } from "../_components/user-menu"
import { TemplatePreferencesDialog } from "./edit/template-preferences-dialog"
import { TemplateActionButton } from "./template-detail-action-button"
import { TemplateSubmissionRow } from "./template-submission-row"

type TemplateDetailPageProps = {
  templateId: string
}

export function TemplateDetailPage({ templateId }: TemplateDetailPageProps) {
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateResponse | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [isUpdatingSharedLink, setIsUpdatingSharedLink] = useState(false)

  const fetchTemplateDetail = useCallback(async () => {
    const [templateResponse, submissionsResponse] = await Promise.all([
      getTemplate(templateId),
      listSubmissions({
        include: "fields",
        limit: 100,
        template_id: templateId,
      }),
    ])

    return { submissionsResponse, templateResponse }
  }, [templateId])

  async function loadTemplateDetail() {
    setIsLoading(true)

    try {
      const { submissionsResponse, templateResponse } =
        await fetchTemplateDetail()

      setTemplate(templateResponse)
      setSubmissions(submissionsResponse.data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login")
        return
      }

      toast.error("Template could not be loaded", {
        description:
          error instanceof Error ? error.message : "Open the templates page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function loadInitialTemplateDetail() {
      try {
        const { submissionsResponse, templateResponse } =
          await fetchTemplateDetail()

        if (isCancelled) {
          return
        }

        setTemplate(templateResponse)
        setSubmissions(submissionsResponse.data)
      } catch (error) {
        if (isCancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login")
          return
        }

        toast.error("Template could not be loaded", {
          description:
            error instanceof Error ? error.message : "Open the templates page.",
        })
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialTemplateDetail()

    return () => {
      isCancelled = true
    }
  }, [fetchTemplateDetail, router])

  async function copyTemplateLink() {
    if (!template) {
      return
    }

    await navigator.clipboard.writeText(`${window.location.origin}/d/${template.slug}`)
    toast.success("Template link copied")
  }

  async function archiveCurrentTemplate() {
    if (!template) {
      return
    }

    setIsMutating(true)

    try {
      await archiveTemplate(template.id)
      toast.success("Template archived", { description: template.name })
      router.push("/templates?archived=true")
    } catch (error) {
      toast.error("Template archive failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsMutating(false)
    }
  }

  async function duplicateTemplate() {
    if (!template) {
      return
    }

    setIsMutating(true)

    try {
      const clonedTemplate = await cloneTemplate(template.id, {
        name: `${template.name} (Clone)`,
      })

      toast.success("Template cloned", { description: clonedTemplate.name })
      router.push(`/templates/${clonedTemplate.id}`)
    } catch (error) {
      toast.error("Template clone failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsMutating(false)
    }
  }

  async function addRecipients() {
    if (!template) {
      return
    }

    const email = window.prompt("Recipient email")

    if (!email) {
      return
    }

    setIsMutating(true)

    try {
      await createSubmission({
        template_id: template.id,
        submitters: [{ email }],
      })
      toast.success("Recipient added", { description: email })
      await loadTemplateDetail()
    } catch (error) {
      toast.error("Recipient could not be added", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsMutating(false)
    }
  }

  async function saveTemplatePreferences(preferences: Record<string, unknown>) {
    if (!template) {
      return
    }

    const previousPreferences = template.preferences
    const nextPreferences = {
      ...previousPreferences,
      ...preferences,
    }

    setTemplate({ ...template, preferences: nextPreferences })
    setIsSavingPreferences(true)

    try {
      await updateTemplatePreferences(template.id, preferences)
      toast.success("Preferences saved")
      setIsPreferencesOpen(false)
    } catch (error) {
      setTemplate({ ...template, preferences: previousPreferences })
      toast.error("Preferences update failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsSavingPreferences(false)
    }
  }

  async function updateTemplateSharedLink(sharedLink: boolean) {
    if (!template) {
      return
    }

    const previousSharedLink = template.shared_link

    setTemplate({ ...template, shared_link: sharedLink })
    setIsUpdatingSharedLink(true)

    try {
      await updateTemplate(template.id, { shared_link: sharedLink })
      toast.success(
        sharedLink ? "Shared link enabled" : "Shared link disabled",
      )
    } catch (error) {
      setTemplate({ ...template, shared_link: previousSharedLink })
      toast.error("Shared link update failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsUpdatingSharedLink(false)
    }
  }

  async function archiveRow(submission: SubmissionResponse) {
    setIsMutating(true)

    try {
      await archiveSubmission(submission.id)
      toast.success("Submission archived")
      await loadTemplateDetail()
    } catch (error) {
      toast.error("Submission archive failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsMutating(false)
    }
  }

  const csvExport = useMemo(
    () => buildSubmissionsCsv(template, submissions),
    [submissions, template],
  )

  if (isLoading) {
    return <TemplateDetailLoading />
  }

  if (!template) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)]">
        <p className="text-sm font-semibold text-[var(--auth-muted-foreground)]">
          Template not found.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-4 md:px-2">
        <TemplateDetailTopbar />

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-[2rem] font-semibold leading-tight">
                {template.name}
              </h1>
              <Link
                className="mt-1 flex w-fit items-center gap-1 text-sm text-[var(--auth-primary)] hover:underline"
                href="/templates"
              >
                <FolderIcon data-icon="inline-start" />
                {template.folder_name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button
                aria-label="Preferences"
                className="rounded-full bg-[var(--auth-muted)] text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
                onClick={() => setIsPreferencesOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Settings2Icon />
              </Button>
              <TemplateActionButton onClick={copyTemplateLink}>
                <LinkIcon data-icon="inline-start" />
                LINK
              </TemplateActionButton>
              <TemplateActionButton
                disabled={isMutating}
                onClick={() => void archiveCurrentTemplate()}
                variant="outline"
              >
                <ArchiveIcon data-icon="inline-start" />
                ARCHIVE
              </TemplateActionButton>
              <TemplateActionButton
                disabled={isMutating}
                onClick={() => void duplicateTemplate()}
                variant="outline"
              >
                <CopyIcon data-icon="inline-start" />
                CLONE
              </TemplateActionButton>
              <TemplateActionButton asChild variant="outline">
                <Link href={`/templates/${template.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  EDIT
                </Link>
              </TemplateActionButton>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-3xl font-semibold">Submissions</h2>
            <div className="flex flex-wrap items-center gap-3">
              <DownloadCsvButton csv={csvExport} template={template} />
              <TemplateActionButton
                disabled={isMutating}
                onClick={() => void addRecipients()}
                variant="outline"
              >
                <PlusIcon data-icon="inline-start" />
                ADD RECIPIENTS
              </TemplateActionButton>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {submissions.length ? (
              submissions.map((submission) => (
                <TemplateSubmissionRow
                  disabled={isMutating}
                  key={submission.id}
                  onArchive={() => void archiveRow(submission)}
                  submission={submission}
                />
              ))
            ) : (
              <div className="rounded-2xl bg-[var(--auth-muted)] px-6 py-14 text-center">
                <p className="text-2xl font-semibold">
                  There are no submissions
                </p>
                <p className="mt-2 text-sm text-[var(--auth-muted-foreground)]">
                  Add recipients to send this template for signing.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      {isPreferencesOpen ? (
        <TemplatePreferencesDialog
          isSaving={isSavingPreferences}
          isUpdatingSharedLink={isUpdatingSharedLink}
          onOpenChange={setIsPreferencesOpen}
          onSave={saveTemplatePreferences}
          onSharedLinkChange={updateTemplateSharedLink}
          open={isPreferencesOpen}
          template={template}
        />
      ) : null}
    </main>
  )
}

function TemplateDetailTopbar() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link aria-label="Signa" className="relative block h-16 w-32" href="/templates">
        <Image
          alt="Signa"
          className="object-contain object-left"
          fill
          priority
          sizes="128px"
          src="/images/logo.png"
        />
      </Link>
      <nav className="flex items-center gap-4 text-base font-bold">
        <Button className="h-8 rounded-full bg-[var(--auth-upgrade)] px-4 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-upgrade-hover)]">
          UPGRADE
        </Button>
        <span className="text-[var(--auth-primary)]/70">|</span>
        <Link href="/settings/account">Settings</Link>
        <ThemeModeSwitcher />
        <UserMenu />
      </nav>
    </header>
  )
}

function DownloadCsvButton({
  csv,
  template,
}: {
  csv: string
  template: TemplateResponse
}) {
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`

  return (
    <Button
      asChild
      className="h-9 rounded-full px-5 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
      variant="ghost"
    >
      <a download={`${template.name}-submissions.csv`} href={href}>
        <DownloadIcon data-icon="inline-start" />
        EXPORT
      </a>
    </Button>
  )
}

function TemplateDetailLoading() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Spinner />
        Loading template
      </div>
    </main>
  )
}

function buildSubmissionsCsv(
  template: TemplateResponse | null,
  submissions: SubmissionResponse[],
): string {
  const rows = [
    ["template", "submission_id", "status", "recipient", "created_at"],
    ...submissions.map((submission) => {
      const submitter = submission.submitters[0]

      return [
        template?.name ?? "",
        submission.id,
        submitter?.status ?? submission.status,
        submitter?.name ?? submitter?.email ?? submitter?.phone ?? "",
        submission.created_at,
      ]
    }),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
