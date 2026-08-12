import { authenticatedApiFetch } from "./auth";

export type TemplateDocument = {
  id: string;
  uuid: string;
  url: string;
  preview_image_url: string | null;
  preview_images: TemplateDocumentPreviewImage[];
  filename: string;
};

export type TemplateDocumentPreviewImage = {
  id: string;
  url: string;
  filename: string;
  metadata: {
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
};

export type TemplateSchemaItem = {
  attachment_uuid?: string;
  name?: string;
  dynamic?: boolean;
  pending_fields?: boolean;
  [key: string]: unknown;
};

export type TemplateAuthor = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type TemplateEventUser = TemplateAuthor;

export type TemplateEventResponse = {
  id: string;
  template_id: string;
  event_type: string;
  summary: string;
  event_timestamp: string;
  data: Record<string, unknown>;
  user: TemplateEventUser | null;
};

export type TemplateEventsListResponse = {
  data: TemplateEventResponse[];
};

export type TemplateVersionResponse = {
  id: string;
  template_id: string;
  sha1: string;
  created_at: string;
  data: Record<string, unknown>;
  author: TemplateEventUser | null;
};

export type TemplateVersionsListResponse = {
  data: TemplateVersionResponse[];
};

export type TemplateSubmitter = {
  email?: string;
  name?: string;
  uuid: string;
};

export type TemplateResponse = {
  id: string;
  archived_at: string | null;
  fields: unknown[];
  name: string;
  preferences: Record<string, unknown>;
  schema: TemplateSchemaItem[];
  slug: string;
  source: string;
  submitters: TemplateSubmitter[];
  created_at: string;
  updated_at: string;
  author_id: string;
  external_id: string | null;
  folder_id: string;
  shared_link: boolean;
  shared_with_test_mode: boolean;
  application_key: string | null;
  folder_name: string;
  variables_schema: unknown;
  author: TemplateAuthor;
  documents: TemplateDocument[];
};

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
  archived?: boolean;
  folder_name?: string;
  roles?: string[];
};

export type CloneTemplateInput = {
  application_key?: string;
  external_id?: string;
  folder_name?: string;
  name?: string;
  team_id?: string;
};

export type TemplateDocumentsUpdateResponse = {
  schema: TemplateSchemaItem[];
  fields: unknown[] | null;
  submitters: unknown[] | null;
  documents: TemplateDocument[];
};

export type GoogleDrivePickedFile = {
  id: string;
  mime_type?: string;
  name?: string;
};

export type TemplatesListResponse = {
  data: TemplateResponse[];
  pagination: {
    count: number;
    next: string | null;
    prev: string | null;
  };
};

export type ListTemplatesInput = {
  after?: string;
  archived?: boolean;
  before?: string;
  folder?: string;
  limit?: number;
  q?: string;
  slug?: string;
};

export type TemplateFolderResponse = {
  id: string;
  name: string;
  full_name: string;
  parent_folder_id: string | null;
  templates_count: number;
  subfolders_count: number;
  created_at: string;
  updated_at: string;
};

export type ListTemplateFoldersInput = {
  parent?: string;
  q?: string;
};

export type CreateTemplateFolderInput = {
  name: string;
  parent?: string;
};

export type UpdateTemplateFolderInput = {
  name?: string;
  parent?: string;
};

export type DeleteTemplateFolderMode = "folder_only" | "with_contents";

export type CreateTemplateInput = {
  external_id?: string;
  folder_name?: string;
  name?: string;
  shared_link?: boolean;
};

export type BlankTemplatePageSize = "a4" | "legal" | "letter";

export type AddBlankTemplatePageInput = {
  name?: string;
  position?: number;
  size?: BlankTemplatePageSize;
};

export type AccountCustomFieldsResponse = {
  value: Record<string, unknown>[];
};

export function createTemplate(
  input: CreateTemplateInput,
): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>("/templates", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function createTemplateFromPdf(
  file: File,
  folderName?: string,
): Promise<TemplateResponse> {
  const formData = new FormData();

  formData.set("name", removeExtension(file.name));
  if (folderName) {
    formData.set("folder_name", folderName);
  }
  formData.append("documents", file, file.name);

  return authenticatedApiFetch<TemplateResponse>("/templates/pdf", {
    body: formData,
    method: "POST",
  });
}

export function createTemplateFromDocx(
  file: File,
  folderName?: string,
): Promise<TemplateResponse> {
  const formData = new FormData();

  formData.set("name", removeExtension(file.name));
  if (folderName) {
    formData.set("folder_name", folderName);
  }
  formData.append("documents", file, file.name);

  return authenticatedApiFetch<TemplateResponse>("/templates/docx", {
    body: formData,
    method: "POST",
  });
}

export function createTemplateFromDocument(
  file: File,
  folderName?: string,
): Promise<TemplateResponse> {
  if (isPdfFile(file)) {
    return createTemplateFromPdf(file, folderName);
  }

  if (isDocxFile(file)) {
    return createTemplateFromDocx(file, folderName);
  }

  return Promise.reject(
    new Error("Only PDF and DOCX documents are supported."),
  );
}

export function listTemplates(
  input: ListTemplatesInput = {},
): Promise<TemplatesListResponse> {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return authenticatedApiFetch<TemplatesListResponse>(
    `/templates${params.size ? `?${params.toString()}` : ""}`,
  );
}

export function listTemplateFolders(
  input: ListTemplateFoldersInput = {},
): Promise<TemplateFolderResponse[]> {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return authenticatedApiFetch<TemplateFolderResponse[]>(
    `/templates/folders${params.size ? `?${params.toString()}` : ""}`,
  );
}

export function getTemplateEvents(
  templateId: string,
): Promise<TemplateEventsListResponse> {
  return authenticatedApiFetch<TemplateEventsListResponse>(
    `/templates/${templateId}/events`,
  );
}

export function getTemplateVersions(
  templateId: string,
): Promise<TemplateVersionsListResponse> {
  return authenticatedApiFetch<TemplateVersionsListResponse>(
    `/templates/${templateId}/versions`,
  );
}

export function createTemplateFolder(
  input: CreateTemplateFolderInput,
): Promise<TemplateFolderResponse> {
  return authenticatedApiFetch<TemplateFolderResponse>("/templates/folders", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updateTemplateFolder(
  id: string,
  input: UpdateTemplateFolderInput,
): Promise<TemplateFolderResponse> {
  return authenticatedApiFetch<TemplateFolderResponse>(
    `/templates/folders/${id}`,
    {
      body: JSON.stringify(input),
      method: "PUT",
    },
  );
}

export function deleteTemplateFolder(
  id: string,
  mode: DeleteTemplateFolderMode,
): Promise<null> {
  const params = new URLSearchParams({ mode });

  return authenticatedApiFetch<null>(
    `/templates/folders/${id}?${params.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export function getTemplate(id: string): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>(`/templates/${id}`, {
    cache: "no-store",
  });
}

export function getAccountCustomFields(): Promise<AccountCustomFieldsResponse> {
  return authenticatedApiFetch<AccountCustomFieldsResponse>(
    "/account_custom_fields",
  );
}

export function saveAccountCustomFields(
  value: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  return authenticatedApiFetch<Record<string, unknown>[]>(
    "/account_custom_fields",
    {
      body: JSON.stringify({ value }),
      method: "POST",
    },
  );
}

export function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
): Promise<{ id: string; updated_at: string }> {
  return authenticatedApiFetch<{ id: string; updated_at: string }>(
    `/templates/${id}`,
    {
      body: JSON.stringify(input),
      method: "PUT",
    },
  );
}

export function updateTemplatePreferences(
  id: string,
  preferences: Record<string, unknown>,
): Promise<{ id: string; updated_at: string }> {
  return updateTemplate(id, { preferences });
}

export function updateTemplateTestingSharing(
  id: string,
  value: boolean,
): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>(
    `/templates/${id}/testing-sharing`,
    {
      body: JSON.stringify({ value }),
      method: "POST",
    },
  );
}

export async function getTemplateDocumentDownloads(
  id: string,
): Promise<string[]> {
  return authenticatedApiFetch<string[]>(`/templates/${id}/documents`);
}

export function cloneTemplate(
  id: string,
  input: CloneTemplateInput = {},
): Promise<TemplateResponse> {
  return authenticatedApiFetch<TemplateResponse>(`/templates/${id}/clone`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function addTemplateDocument(
  id: string,
  file: File,
): Promise<TemplateDocumentsUpdateResponse> {
  if (isDocxFile(file)) {
    return addTemplateDocxDocument(id, file);
  }

  const formData = new FormData();

  formData.set("merge", "true");
  formData.append("documents", file, file.name);

  return authenticatedApiFetch<TemplateDocumentsUpdateResponse>(
    `/templates/${id}/documents`,
    {
      body: formData,
      method: "PUT",
    },
  );
}

export function addTemplateGoogleDriveDocuments(
  id: string,
  input: {
    access_token: string;
    files: GoogleDrivePickedFile[];
    merge?: boolean;
  },
): Promise<TemplateDocumentsUpdateResponse> {
  return authenticatedApiFetch<TemplateDocumentsUpdateResponse>(
    `/templates/${id}/google-drive-documents`,
    {
      body: JSON.stringify(input),
      method: "PUT",
    },
  );
}

export function addBlankTemplatePage(
  id: string,
  input: AddBlankTemplatePageInput = {},
): Promise<TemplateDocumentsUpdateResponse> {
  return authenticatedApiFetch<TemplateDocumentsUpdateResponse>(
    `/templates/${id}/documents`,
    {
      body: JSON.stringify({
        documents: [
          {
            name: input.name ?? "Blank Page",
            position: input.position,
            size: input.size ?? "letter",
            type: "blank",
          },
        ],
        merge: true,
      }),
      method: "PUT",
    },
  );
}

function addTemplateDocxDocument(
  id: string,
  file: File,
): Promise<TemplateDocumentsUpdateResponse> {
  const formData = new FormData();

  formData.set("merge", "true");
  formData.append("documents", file, file.name);

  return authenticatedApiFetch<TemplateDocumentsUpdateResponse>(
    `/templates/${id}/documents`,
    {
      body: formData,
      method: "PUT",
    },
  );
}

export function archiveTemplate(
  id: string,
): Promise<{ archived_at: string; id: string }> {
  return authenticatedApiFetch<{ archived_at: string; id: string }>(
    `/templates/${id}`,
    { method: "DELETE" },
  );
}

export function deleteTemplatePermanently(
  id: string,
): Promise<{ archived_at: string | null; id: string }> {
  return authenticatedApiFetch<{ archived_at: string | null; id: string }>(
    `/templates/${id}?permanently=true`,
    { method: "DELETE" },
  );
}

function removeExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isDocxFile(file: File): boolean {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}
