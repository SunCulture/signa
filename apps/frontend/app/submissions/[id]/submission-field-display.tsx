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
  const value = findSubmissionFieldValue(field, submission)

  if (field.type === "checkbox") {
    return <span className="text-lg font-bold">{value ? "✓" : ""}</span>
  }

  if (field.type === "signature" || field.type === "initials") {
    return (
      <span className="text-sm font-bold">
        {isBlank(value) ? field.name ?? "Sign Here" : "Signed"}
      </span>
    )
  }

  if (field.type === "file" || field.type === "image") {
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
): unknown {
  for (const submitter of submission.submitters) {
    const match = submitter.values?.find(
      (item) => item.field === field.name || item.field === field.uuid,
    )

    if (match) {
      return match.value
    }
  }

  return null
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
