"use client"

import type { SigningField } from "@/lib/api/signing"
import type {
  SubmissionResponse,
  SubmissionSubmitterResponse,
} from "@/lib/api/submissions"

export function SubmissionFieldValue({
  field,
  submission,
}: {
  field: SigningField
  submission: SubmissionResponse
}) {
  const fieldValue = findSubmissionFieldValue(field, submission)
  const value = fieldValue?.value
  const attachment = fieldValue?.attachment

  if (field.type === "checkbox") {
    return <span className="text-lg font-bold">{value ? "✓" : ""}</span>
  }

  if (field.type === "signature" || field.type === "initials") {
    if (attachment) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={attachment.filename}
          className="max-h-20 w-full object-contain"
          height={160}
          src={attachment.url}
          width={320}
        />
      )
    }

    return (
      <span className="text-sm font-bold">
        {isBlank(value) ? field.name ?? "Sign Here" : "Signed"}
      </span>
    )
  }

  if (field.type === "file" || field.type === "image") {
    if (attachment && isImageContentType(attachment.content_type)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={attachment.filename}
          className="max-h-28 w-full rounded-sm object-contain"
          height={224}
          src={attachment.url}
          width={320}
        />
      )
    }

    if (attachment) {
      return (
        <a
          className="truncate text-sm font-semibold underline underline-offset-4"
          href={attachment.url}
          rel="noreferrer"
          target="_blank"
        >
          {attachment.filename}
        </a>
      )
    }

    return (
      <span className="truncate text-sm font-semibold">
        {isBlank(value) ? field.name ?? "Upload" : "Uploaded"}
      </span>
    )
  }

  return (
    <span className="truncate text-sm font-semibold">
      {isBlank(value) ? formatFallbackValue(field) : String(value)}
    </span>
  )
}

export function buildSingleSubmitterSubmission(
  submitter: SubmissionSubmitterResponse,
): SubmissionResponse {
  return { submitters: [submitter] } as SubmissionResponse
}

export function compareFieldsByDocumentPosition(
  firstField: SigningField,
  secondField: SigningField,
): number {
  const firstArea = firstField.areas?.at(0)
  const secondArea = secondField.areas?.at(0)

  if (!firstArea || !secondArea) {
    return firstArea ? -1 : secondArea ? 1 : 0
  }

  if (firstArea.page !== secondArea.page) {
    return (firstArea.page ?? 0) - (secondArea.page ?? 0)
  }

  if (firstArea.y !== secondArea.y) {
    return (firstArea.y ?? 0) - (secondArea.y ?? 0)
  }

  return (firstArea.x ?? 0) - (secondArea.x ?? 0)
}

function findSubmissionFieldValue(
  field: SigningField,
  submission: SubmissionResponse,
): SubmissionFieldValueRecord | null {
  for (const submitter of submission.submitters) {
    const match = submitter.values?.find(
      (item) => item.field === field.name || item.field === field.uuid,
    )

    if (match) {
      return match
    }
  }

  return null
}

type SubmissionFieldValueRecord = NonNullable<
  SubmissionResponse["submitters"][number]["values"]
>[number]

function isImageContentType(contentType: string | null | undefined): boolean {
  return typeof contentType === "string" && contentType.startsWith("image/")
}

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

function formatFallbackValue(field: SigningField): string {
  if (typeof field.default_value === "string") {
    return field.default_value
  }

  if (field.default_value === null || field.default_value === undefined) {
    return field.name ?? ""
  }

  return String(field.default_value)
}
