import { apiFetch } from "./http";
import { signingFetch } from "./signing-gate";
import type {
  TemplateDocumentPreviewImage,
  TemplateSchemaItem,
} from "./templates";

export type SigningDocument = {
  id: string;
  uuid: string;
  filename: string;
  name: string;
  url: string;
  preview_images: TemplateDocumentPreviewImage[];
};

export type SigningSubmitter = {
  id: string;
  slug: string;
  uuid: string;
  name: string | null;
  email: string | null;
  role: string;
  completed_at: string | null;
  declined_at: string | null;
};

export type SigningFieldArea = {
  attachment_uuid?: string;
  cell_w?: number;
  h?: number;
  option_uuid?: string;
  page?: number;
  w?: number;
  x?: number;
  y?: number;
};

export type SigningField = {
  areas?: SigningFieldArea[];
  default_value?: unknown;
  description?: string;
  name?: string;
  options?: unknown[];
  preferences?: Record<string, unknown>;
  readonly?: boolean;
  required?: boolean;
  submitter_uuid?: string;
  title?: string;
  type?: string;
  uuid?: string;
  validation?: Record<string, unknown>;
};

export type SigningForm = {
  attachments: SigningAttachment[];
  submission_id: string;
  title: string;
  submitter: SigningSubmitter;
  documents: SigningDocument[];
  fields: SigningField[];
  values: Record<string, unknown>;
  readonly_values: Record<string, unknown>;
  schema?: TemplateSchemaItem[];
  configs: SigningFormConfig;
};

export type SigningFormConfig = {
  with_confetti: boolean;
  with_typed_signature: boolean;
  with_decline: boolean;
  with_delegate: boolean;
  require_signing_reason: boolean;
  with_signature_id: boolean;
  prefill_signature: boolean;
  download_links_expire: boolean;
  download_links_auth: boolean;
  combine_pdf_result: boolean;
  flatten_result_pdf: boolean;
  force_mfa: boolean;
  completed_message: {
    title?: string;
    body?: string;
  };
  completed_button: {
    title?: string;
    url?: string;
  };
  policy_links?: string;
};

export type SigningAttachment = {
  uuid: string;
  filename: string;
  content_type: string | null;
  url: string;
};

export type SigningFieldValue = {
  value: unknown;
  attachment: SigningAttachment | null;
};

/** What an AMT-owned signer gets before entering the code AMT sent: no documents, fields or values. */
export type SigningGatedForm = {
  amt_otp_gate: { required: true };
  submitter: { slug: string; name: string | null };
  template: { name: string | null };
};

export function isGatedSigningForm(
  form: SigningForm | SigningGatedForm,
): form is SigningGatedForm {
  return "amt_otp_gate" in form && form.amt_otp_gate?.required === true;
}

export function getSigningForm(
  slug: string,
  trackingParam?: string,
): Promise<SigningForm | SigningGatedForm> {
  const path = trackingParam
    ? `/signing/${slug}?${new URLSearchParams({ t: trackingParam })}`
    : `/signing/${slug}`;

  return signingFetch<SigningForm | SigningGatedForm>(slug, path);
}

export function uploadSigningAttachment(
  slug: string,
  file: File,
  type: string,
): Promise<SigningAttachment> {
  const formData = new FormData();

  formData.set("type", type);
  formData.set("file", file, file.name);

  return signingFetch<SigningAttachment>(slug, `/signing/${slug}/attachments`, {
    body: formData,
    method: "POST",
  });
}

export function getSigningFieldValue(
  slug: string,
  fieldUuid: string,
  after?: string,
): Promise<SigningFieldValue> {
  const params = new URLSearchParams({ field_uuid: fieldUuid });

  if (after) {
    params.set("after", after);
  }

  return signingFetch<SigningFieldValue>(
    slug,
    `/signing/${slug}/values?${params}`,
  );
}

export function updateSigningValues(
  slug: string,
  values: Record<string, unknown>,
): Promise<SigningForm> {
  return signingFetch<SigningForm>(slug, `/signing/${slug}/values`, {
    body: JSON.stringify({ values }),
    method: "PUT",
  });
}

export function completeSigningForm(
  slug: string,
  values: Record<string, unknown>,
): Promise<SigningForm> {
  return signingFetch<SigningForm>(slug, `/signing/${slug}/complete`, {
    body: JSON.stringify({ values }),
    method: "POST",
  });
}

export function declineSigningForm(
  slug: string,
  reason = "",
): Promise<SigningForm> {
  return signingFetch<SigningForm>(slug, `/signing/${slug}/decline`, {
    body: JSON.stringify({ reason }),
    method: "POST",
  });
}

export function resubmitSigningForm(slug: string): Promise<SigningForm> {
  return signingFetch<SigningForm>(slug, `/signing/${slug}/resubmit`, {
    method: "POST",
  });
}

export function sendSigningPhoneVerification(
  slug: string,
  input: { field_uuid?: string; phone?: string },
): Promise<{ phone: string; status: string }> {
  return signingFetch<{ phone: string; status: string }>(
    slug,
    `/signing/${slug}/phone-verification/send`,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
}

export function validateSigningPhoneNumber(
  slug: string,
  input: { field_uuid?: string; phone?: string },
): Promise<{ phone: string; valid: boolean }> {
  return signingFetch<{ phone: string; valid: boolean }>(
    slug,
    `/signing/${slug}/phone-verification/validate`,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
}

export function verifySigningPhoneCode(
  slug: string,
  input: { code: string; field_uuid?: string; phone?: string },
): Promise<SigningForm> {
  return signingFetch<SigningForm>(
    slug,
    `/signing/${slug}/phone-verification/check`,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
}

export function getSigningDownload(
  slug: string,
): Promise<{ documents: SigningDocument[] }> {
  return signingFetch<{ documents: SigningDocument[] }>(
    slug,
    `/signing/${slug}/download`,
  );
}

export function sendSigningCompletedCopy(
  slug: string,
): Promise<{ status?: string }> {
  return apiFetch<{ status?: string }>("/send_submission_email", {
    body: JSON.stringify({ submitter_slug: slug }),
    method: "POST",
  });
}
