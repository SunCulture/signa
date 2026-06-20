"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CopyIcon,
  DownloadIcon,
  ListIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api/http"
import {
  getSubmission,
  getSubmissionDocuments,
  getSubmissionEvents,
  type SubmissionEventLogItem,
  type SubmissionResponse,
} from "@/lib/api/submissions"
import { getTemplate, type TemplateDocument } from "@/lib/api/templates"
import {
  compareFieldsByDocumentPosition,
} from "./submission-field-display"
import {
  SubmissionDocumentPreview,
  SubmissionDocumentThumbnails,
} from "./submission-document-viewer"
import { SubmissionEventLogDialog } from "./submission-event-log-dialog"
import { SubmissionPartiesPanel } from "./submission-parties-panel"

type SubmissionDetailPageProps = {
  submissionId: string
}

export function SubmissionDetailPage({ submissionId }: SubmissionDetailPageProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<TemplateDocument[]>([])
  const [events, setEvents] = useState<SubmissionEventLogItem[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEventsLoading, setIsEventsLoading] = useState(false)
  const [isEventsOpen, setIsEventsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isShareLinkCopied, setIsShareLinkCopied] = useState(false)
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null)
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSubmissionDetail = useCallback(async () => {
    const loadedSubmission = await getSubmission(submissionId, "fields")
    const templateDocuments = loadedSubmission.template
      ? (await getTemplate(loadedSubmission.template.id)).documents
      : []

    return { loadedSubmission, templateDocuments }
  }, [submissionId])

  useEffect(() => {
    let isCancelled = false

    async function loadInitialSubmissionDetail() {
      try {
        const { loadedSubmission, templateDocuments } =
          await fetchSubmissionDetail()

        if (isCancelled) {
          return
        }

        setSubmission(loadedSubmission)
        setDocuments(templateDocuments)
      } catch (error) {
        if (isCancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login")
          return
        }

        toast.error("Submission could not be loaded", {
          description: error instanceof Error ? error.message : "Try again.",
        })
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialSubmissionDetail()

    return () => {
      isCancelled = true
    }
  }, [fetchSubmissionDetail, router])

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  async function openEventLog() {
    setIsEventsOpen(true)
    setIsEventsLoading(true)

    try {
      const response = await getSubmissionEvents(submissionId)

      setEvents(response.data)
    } catch (error) {
      toast.error("Event log could not be loaded", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsEventsLoading(false)
    }
  }

  async function copyShareLink() {
    const submitter = submission?.submitters[0]

    if (!submitter?.slug) {
      toast.info("No signer link is available for this submission.")
      return
    }

    await navigator.clipboard.writeText(`${window.location.origin}/s/${submitter.slug}`)
    setIsShareLinkCopied(true)

    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current)
    }

    copyResetTimeoutRef.current = setTimeout(() => {
      setIsShareLinkCopied(false)
      copyResetTimeoutRef.current = null
    }, 1800)

    toast.success("Share link copied")
  }

  async function downloadDocuments() {
    setIsDownloading(true)

    try {
      const response = await getSubmissionDocuments(submissionId)

      response.documents.forEach((document) => {
        const link = window.document.createElement("a")
        link.href = document.url
        link.target = "_blank"
        link.rel = "noreferrer"
        link.download = document.name
        link.click()
      })
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const fields = useMemo(
    () => [...(submission?.fields ?? [])].sort(compareFieldsByDocumentPosition),
    [submission?.fields],
  )

  if (isLoading) {
    return <SubmissionDetailLoading />
  }

  if (!submission) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)]">
        <p className="text-sm font-semibold text-[var(--auth-muted-foreground)]">
          Submission not found.
        </p>
      </main>
    )
  }

  const title = submission.name ?? submission.template?.name ?? "Submission"

  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-1.5">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-[var(--auth-background)]/95 py-1.5 backdrop-blur">
          <Link
            className="flex min-w-0 items-center gap-3"
            href={submission.template ? `/templates/${submission.template.id}` : "/templates"}
          >
            <Image
              alt="Signa"
              className="h-11 w-auto object-contain"
              height={44}
              src="/images/logo.png"
              width={76}
            />
            <h1 className="truncate text-xl font-semibold md:text-3xl">{title}</h1>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              className="h-11 rounded-full px-5 text-sm font-bold"
              onClick={() => void openEventLog()}
              type="button"
              variant="outline"
            >
              <ListIcon data-icon="inline-start" />
              <span className="hidden md:inline">EVENT LOG</span>
            </Button>
            <Button
              className="h-11 rounded-full px-5 text-sm font-bold"
              onClick={() => void copyShareLink()}
              type="button"
            >
              <CopyIcon data-icon="inline-start" />
              <span className="hidden md:inline">
                {isShareLinkCopied ? "COPIED TO CLIPBOARD" : "COPY SHARE LINK"}
              </span>
            </Button>
            <Button
              aria-label="Download"
              className="size-11 rounded-full p-0 md:h-11 md:w-auto md:px-5"
              disabled={isDownloading}
              onClick={() => void downloadDocuments()}
              type="button"
            >
              {isDownloading ? <Spinner /> : <DownloadIcon />}
              <span className="hidden md:inline">DOWNLOAD</span>
            </Button>
          </div>
        </header>

        <section className="flex max-h-[calc(100vh-60px)] min-h-[calc(100vh-60px)]">
          <SubmissionDocumentThumbnails documents={documents} title={title} />
          <SubmissionDocumentPreview
            documents={documents}
            fields={fields}
            submission={submission}
            title={title}
          />
          <SubmissionPartiesPanel fields={fields} submission={submission} />
        </section>
      </div>

      <SubmissionEventLogDialog
        events={events}
        isLoading={isEventsLoading}
        onOpenChange={setIsEventsOpen}
        open={isEventsOpen}
      />
    </main>
  )
}

function SubmissionDetailLoading() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Spinner />
        Loading submission
      </div>
    </main>
  )
}
