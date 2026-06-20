import { authenticatedApiFetch } from "./auth"

export type TemplateDocument = {
  id: string
  uuid: string
  url: string
  preview_image_url: string | null
  preview_images: TemplateDocumentPreviewImage[]
  filename: string
}

export type TemplateDocumentPreviewImage = {
  id: string
  url: string
  filename: string
  metadata: {
    width?: number
    height?: number
    [key: string]: unknown
  }
}

export type TemplateSchemaItem = {
  attachment_uuid?: string
  name?: string
  dynamic?: boolean
  pending_fields?: boolean
  [key: string]: unknown
}

export type TemplateAuthor = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

export type TemplateResponse = {
  id: string
  archived_at: string | null
  fields: unknown[]
  name: string
  preferences: Record<string, unknown>
  schema: TemplateSchemaItem[]
  slug: string
  source: string
  submitters: unknown[]
  created_at: string
  updated_at: string
  author_id: string
  external_id: string | null
  folder_id: string
  shared_link: boolean
  application_key: string | null
  folder_name: string
  variables_schema: unknown
  author: TemplateAuthor
  documents: TemplateDocument[]
}

export type UpdateTemplateInput = Partial<
  Pick<
    TemplateResponse,
    | "external_id"
    | "fields"
    | "name"
    | "preferences"
    | "schema"
    | "shared_link"
    | "submitters"
  >
> & {
  archived?: boolean
  folder_name?: string
  roles?: string[]
}

export type CloneTemplateInput = {
  application_key?: string
  external_id?: string
  folder_name?: string
  name?: string
}

export type TemplateDocumentsUpdateResponse = {
  schema: TemplateSchemaItem[]
  fields: unknown[] | null
  submitters: unknown[] | null
  documents: TemplateDocument[]
}

export type TemplatesListResponse = {
  data: TemplateResponse[]
  pagination: {
    count: number
    next: string | null
    prev: string | null
  }
}

export type ListTemplatesInput = {
  after?: string
  archived?: boolean
  before?: string
  folder?: string
  limit?: number
  q?: string
  slug?: string
}

export function createTemplateFromPdf(file: File): Promise<TemplateResponse> {
  const formData = new FormData()

  formData.set("name", removeExtension(file.name))
  formData.append("documents", file, file.name)

  return authenticatedApiFetch<TemplateResponse>("/templates/pdf", {
    body: formData,
    method: "POST",
  })
}

export function listTemplates(
  input: ListTemplatesInput = {}
): Promise<TemplatesListResponse> {
  const params = new URLSearchParams()

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return
    }

    params.set(key, String(value))
  })

  return authenticatedApiFetch<TemplatesListResponse>(
    `/templates${params.size ? `?${params.toString()}` : ""}`
  )
}

export function getTemplate(id: string): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>(`/templates/${id}`)
}

export function updateTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<{ id: string; updated_at: string }> {
  return authenticatedApiFetch<{ id: string; updated_at: string }>(
    `/templates/${id}`,
    {
      body: JSON.stringify(input),
      method: "PUT",
    }
  )
}

export function updateTemplatePreferences(
  id: string,
  preferences: Record<string, unknown>
): Promise<{ id: string; updated_at: string }> {
  return updateTemplate(id, { preferences })
}

export async function getTemplateDocumentDownloads(
  id: string
): Promise<string[]> {
  return authenticatedApiFetch<string[]>(`/templates/${id}/documents`)
}

export function cloneTemplate(
  id: string,
  input: CloneTemplateInput = {}
): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>(`/templates/${id}/clone`, {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function addTemplateDocument(
  id: string,
  file: File
): Promise<TemplateDocumentsUpdateResponse> {
  const formData = new FormData()

  formData.set("merge", "true")
  formData.append("documents", file, file.name)

  return authenticatedApiFetch<TemplateDocumentsUpdateResponse>(
    `/templates/${id}/documents`,
    {
      body: formData,
      method: "PUT",
    }
  )
}

export function archiveTemplate(
  id: string
): Promise<{ archived_at: string; id: string }> {
  return authenticatedApiFetch<{ archived_at: string; id: string }>(
    `/templates/${id}`,
    { method: "DELETE" }
  )
}

export function deleteTemplatePermanently(
  id: string
): Promise<{ archived_at: string | null; id: string }> {
  return authenticatedApiFetch<{ archived_at: string | null; id: string }>(
    `/templates/${id}?permanently=true`,
    { method: "DELETE" }
  )
}

function removeExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "")
}
