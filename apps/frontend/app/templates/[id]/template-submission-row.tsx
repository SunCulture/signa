"use client"

import Link from "next/link"
import { ArchiveIcon, SignatureIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SubmissionResponse } from "@/lib/api/submissions"
import { cn } from "@/lib/utils"
import { TemplateActionButton } from "./template-detail-action-button"

type TemplateSubmissionRowProps = {
  disabled: boolean
  onArchive: () => void
  submission: SubmissionResponse
}

export function TemplateSubmissionRow({
  disabled,
  onArchive,
  submission,
}: TemplateSubmissionRowProps) {
  const submitter = submission.submitters[0]
  const displayName =
    submitter?.name ?? submitter?.email ?? submitter?.phone ?? "Recipient"
  const status = submitter?.status ?? submission.status

  return (
    <article className="flex min-h-[72px] flex-col gap-4 rounded-2xl bg-[var(--auth-muted)] px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <StatusPill status={status} />
        <Link
          className="min-w-0 truncate text-lg hover:underline"
          href={`/submissions/${submission.id}`}
        >
          {displayName}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {submitter?.slug && status !== "completed" && status !== "declined" ? (
          <TemplateActionButton asChild variant="outline">
            <Link href={`/s/${submitter.slug}`} target="_blank">
              <SignatureIcon data-icon="inline-start" />
              SIGN NOW
            </Link>
          </TemplateActionButton>
        ) : null}
        <TemplateActionButton asChild variant="outline">
          <Link href={`/submissions/${submission.id}`}>VIEW</Link>
        </TemplateActionButton>
        <Button
          aria-label="Archive submission"
          className="rounded-full border-[var(--auth-primary)] text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
          disabled={disabled}
          onClick={onArchive}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArchiveIcon />
        </Button>
      </div>
    </article>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "min-w-32 rounded-full px-6 py-1 text-center text-xs font-bold uppercase",
        status === "completed"
          ? "bg-[var(--status-success)] text-[var(--status-success-foreground)]"
          : status === "declined"
            ? "bg-destructive/20 text-destructive"
            : "bg-[var(--auth-upgrade)] text-[var(--auth-primary)]"
      )}
    >
      {status}
    </span>
  )
}
