import { apiFetch } from "./http"
import type {
  TemplateDocumentPreviewImage,
  TemplateSchemaItem,
} from "./templates"

export type SigningDocument = {
  id: string
  uuid: string
  filename: string
  name: string
  url: string
  preview_images: TemplateDocumentPreviewImage[]
}

export type SigningSubmitter = {
  id: string
  slug: string
  uuid: string
  name: string | null
  email: string | null
  role: string
  completed_at: string | null
  declined_at: string | null
}

export type SigningFieldArea = {
  attachment_uuid?: string
  cell_w?: number
  h?: number
  page?: number
  w?: number
  x?: number
  y?: number
}

export type SigningField = {
  areas?: SigningFieldArea[]
  default_value?: unknown
  description?: string
  name?: string
  options?: Array<{ uuid?: string; value?: string }>
  preferences?: Record<string, unknown>
  readonly?: boolean
  required?: boolean
  submitter_uuid?: string
  title?: string
  type?: string
  uuid?: string
  validation?: Record<string, unknown>
}

export type SigningForm = {
  attachments: SigningAttachment[]
  submission_id: string
  title: string
  submitter: SigningSubmitter
  documents: SigningDocument[]
  fields: SigningField[]
  values: Record<string, unknown>
  readonly_values: Record<string, unknown>
  schema?: TemplateSchemaItem[]
}

export type SigningAttachment = {
  uuid: string
  filename: string
  content_type: string | null
  url: string
}

export type SigningFieldValue = {
  value: unknown
  attachment: SigningAttachment | null
}

export function getSigningForm(slug: string): Promise<SigningForm> {
  return apiFetch<SigningForm>(`/signing/${slug}`)
}

export function uploadSigningAttachment(
  slug: string,
  file: File,
  type: string
): Promise<SigningAttachment> {
  const formData = new FormData()

  formData.set("type", type)
  formData.set("file", file, file.name)

  return apiFetch<SigningAttachment>(`/signing/${slug}/attachments`, {
    body: formData,
    method: "POST",
  })
}

export function getSigningFieldValue(
  slug: string,
  fieldUuid: string,
  after?: string
): Promise<SigningFieldValue> {
  const params = new URLSearchParams({ field_uuid: fieldUuid })

  if (after) {
    params.set("after", after)
  }

  return apiFetch<SigningFieldValue>(`/signing/${slug}/values?${params}`)
}

export function updateSigningValues(
  slug: string,
  values: Record<string, unknown>
): Promise<SigningForm> {
  return apiFetch<SigningForm>(`/signing/${slug}/values`, {
    body: JSON.stringify({ values }),
    method: "PUT",
  })
}

export function completeSigningForm(
  slug: string,
  values: Record<string, unknown>
): Promise<SigningForm> {
  return apiFetch<SigningForm>(`/signing/${slug}/complete`, {
    body: JSON.stringify({ values }),
    method: "POST",
  })
}

export function declineSigningForm(
  slug: string,
  reason = ""
): Promise<SigningForm> {
  return apiFetch<SigningForm>(`/signing/${slug}/decline`, {
    body: JSON.stringify({ reason }),
    method: "POST",
  })
}

export function getSigningDownload(
  slug: string
): Promise<{ documents: SigningDocument[] }> {
  return apiFetch<{ documents: SigningDocument[] }>(`/signing/${slug}/download`)
}
