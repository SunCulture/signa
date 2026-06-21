import { authenticatedApiFetch, getAuthToken } from "./auth";
import { ApiError, apiUrl } from "./http";
import type { SigningField } from "./signing";

export type CreateSubmissionSubmitterInput = {
  email?: string;
  message?: CreateSubmissionMessageInput;
  name?: string;
  phone?: string;
  role?: string;
  send_email?: boolean;
  send_sms?: boolean;
};

export type CreateSubmissionMessageInput = {
  body?: string;
  subject?: string;
};

export type CreateSubmissionInput = {
  message?: CreateSubmissionMessageInput;
  name?: string;
  send_email?: boolean;
  send_sms?: boolean;
  submitters_order?: "preserved" | "random";
  template_id: string;
  submitters: CreateSubmissionSubmitterInput[];
};

export type SubmissionSubmitterResponse = {
  id: string;
  submission_id: string;
  uuid: string;
  email: string | null;
  slug: string;
  name: string | null;
  phone?: string | null;
  role: string;
  sent_at?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  declined_at?: string | null;
  status: string;
  values?: SubmissionFieldValue[];
  embed_src?: string;
};

export type SubmissionFieldValue = {
  field: string;
  value: unknown;
};

export type SubmissionTemplateResponse = {
  id: string;
  name: string;
  external_id: string | null;
  folder_name: string;
  created_at: string;
  updated_at: string;
};

export type SubmissionUserResponse = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type SubmissionDocumentResponse = {
  name: string;
  url: string;
};

export type SubmissionResponse = {
  id: string;
  name: string | null;
  slug: string;
  source: string;
  submitters_order: string;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  status: "completed" | "declined" | "expired" | "pending";
  completed_at: string | null;
  audit_log_url: string | null;
  combined_document_url: string | null;
  variables: Record<string, unknown>;
  submitters: SubmissionSubmitterResponse[];
  template: SubmissionTemplateResponse | null;
  created_by_user: SubmissionUserResponse | null;
  submission_events?: SubmissionEventResponse[];
  documents?: SubmissionDocumentResponse[];
  fields?: SigningField[];
};

export type SubmissionEventResponse = {
  id: string;
  submitter_id: string | null;
  event_type: string;
  event_timestamp: string;
  data: Record<string, unknown>;
};

export type SubmissionEventLogItem = {
  id: string;
  event_type: string;
  event_timestamp: string;
  submitter_id: string | null;
  icon: string;
  title: string;
  actor: string | null;
  device: string | null;
  message: string;
  data: Record<string, unknown>;
};

export type SubmissionEventLogResponse = {
  data: SubmissionEventLogItem[];
};

export type SubmissionsListResponse = {
  data: SubmissionResponse[];
  pagination: {
    count: number;
    next: string | null;
    prev: string | null;
  };
};

export type ListSubmissionsInput = {
  archived?: boolean;
  include?: string;
  limit?: number;
  q?: string;
  status?: "pending" | "completed" | "declined" | "expired";
  template_id?: string;
};

export type ExportTemplateSubmissionsInput = ListSubmissionsInput & {
  format: "csv" | "xlsx";
  template_id: string;
};

export function createSubmission(
  input: CreateSubmissionInput,
): Promise<SubmissionSubmitterResponse[]> {
  return authenticatedApiFetch<SubmissionSubmitterResponse[]>("/submissions", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function createTemplateSubmission(
  templateId: string,
  input: Omit<CreateSubmissionInput, "template_id">,
): Promise<SubmissionSubmitterResponse[]> {
  return authenticatedApiFetch<SubmissionSubmitterResponse[]>(
    `/templates/${templateId}/submissions`,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
}

export function listSubmissions(
  input: ListSubmissionsInput = {},
): Promise<SubmissionsListResponse> {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return authenticatedApiFetch<SubmissionsListResponse>(
    `/submissions${params.size ? `?${params.toString()}` : ""}`,
  );
}

export function buildTemplateSubmissionsExportUrl(
  input: ExportTemplateSubmissionsInput,
): string {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (
      key === "template_id" ||
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    params.set(key, String(value));
  });

  return `/templates/${input.template_id}/submissions/export?${params.toString()}`;
}

export async function downloadTemplateSubmissionsExport(
  input: ExportTemplateSubmissionsInput,
): Promise<{ blob: Blob; filename: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const response = await fetch(
    `${apiUrl}${buildTemplateSubmissionsExportUrl(input)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new ApiError(response.statusText || "Export failed", response.status);
  }

  return {
    blob: await response.blob(),
    filename: getExportFilename(response, input),
  };
}

export function getSubmission(
  id: string,
  include = "fields",
): Promise<SubmissionResponse> {
  const params = new URLSearchParams();

  if (include) {
    params.set("include", include);
  }

  return authenticatedApiFetch<SubmissionResponse>(
    `/submissions/${id}${params.size ? `?${params.toString()}` : ""}`,
  );
}

export function getSubmissionEvents(
  id: string,
): Promise<SubmissionEventLogResponse> {
  return authenticatedApiFetch<SubmissionEventLogResponse>(
    `/submissions/${id}/events`,
  );
}

export function getSubmissionDocuments(
  id: string,
  merge = false,
): Promise<{ id: string; documents: SubmissionDocumentResponse[] }> {
  return authenticatedApiFetch<{
    id: string;
    documents: SubmissionDocumentResponse[];
  }>(`/submissions/${id}/documents${merge ? "?merge=true" : ""}`);
}

export function archiveSubmission(
  id: string,
): Promise<{ archived_at: string | null; id: string }> {
  return authenticatedApiFetch<{ archived_at: string | null; id: string }>(
    `/submissions/${id}`,
    { method: "DELETE" },
  );
}

function getExportFilename(
  response: Response,
  input: ExportTemplateSubmissionsInput,
): string {
  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1];

  return filename ?? `submissions.${input.format}`;
}
