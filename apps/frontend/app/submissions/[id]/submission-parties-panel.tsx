"use client"

import { MailIcon, SignatureIcon, UserRoundIcon } from "lucide-react"

import type { SigningField } from "@/lib/api/signing"
import type {
  SubmissionResponse,
  SubmissionSubmitterResponse,
} from "@/lib/api/submissions"
import { cn } from "@/lib/utils"
import {
  buildSingleSubmitterSubmission,
  SubmissionFieldValue,
} from "./submission-field-display"

type SubmissionPartiesPanelProps = {
  fields: SigningField[]
  submission: SubmissionResponse
}

export function SubmissionPartiesPanel({
  fields,
  submission,
}: SubmissionPartiesPanelProps) {
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto pl-1 pt-1 md:block">
      <div className="flex flex-col gap-4">
        {submission.submitters.map((submitter, index) => (
          <SubmitterCard
            fields={fields}
            index={index}
            key={submitter.id}
            submitter={submitter}
          />
        ))}
      </div>
    </aside>
  )
}

function SubmitterCard({
  fields,
  index,
  submitter,
}: {
  fields: SigningField[]
  index: number
  submitter: SubmissionSubmitterResponse
}) {
  const submitterFields = fields.filter(
    (field) => field.submitter_uuid === submitter.uuid,
  )

  return (
    <section className="rounded-md border border-[var(--auth-input-border)] p-3">
      <div className="flex items-center gap-2 text-lg">
        <span
          className={cn(
            "size-3 rounded-full",
            index % 2 === 0 ? "bg-red-500" : "bg-sky-500",
          )}
        />
        <span>{submitter.role || `${index + 1} Submitter`}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        {submitter.name ? (
          <span className="flex items-center gap-2">
            <UserRoundIcon className="size-4" />
            {submitter.name}
          </span>
        ) : null}
        {submitter.email ? (
          <span className="flex items-center gap-2">
            <MailIcon className="size-4" />
            {submitter.email}
          </span>
        ) : null}
        <span className="flex items-center gap-2">
          <SignatureIcon className="size-4" />
          {formatSubmitterStatus(submitter)}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {submitterFields.map((field) => (
          <FieldSummary
            field={field}
            key={field.uuid ?? field.name}
            submitter={submitter}
          />
        ))}
      </div>
    </section>
  )
}

function FieldSummary({
  field,
  submitter,
}: {
  field: SigningField
  submitter: SubmissionSubmitterResponse
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase">{field.name ?? field.title}</p>
      <div className="mt-1 rounded bg-[var(--auth-muted)] p-2 text-sm">
        <SubmissionFieldValue
          field={field}
          submission={buildSingleSubmitterSubmission(submitter)}
        />
      </div>
    </div>
  )
}

function formatSubmitterStatus(submitter: SubmissionSubmitterResponse): string {
  if (submitter.completed_at) {
    return `Completed ${formatDate(submitter.completed_at)}`
  }

  if (submitter.declined_at) {
    return `Declined ${formatDate(submitter.declined_at)}`
  }

  return "Not completed yet"
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
