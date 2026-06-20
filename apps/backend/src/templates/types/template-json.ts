export type JsonObject = Record<string, unknown>;

export type TemplatePreferences = JsonObject;
export type TemplateVariablesSchema = JsonObject | JsonObject[];

export type TemplateSubmitter = {
  name: string;
  uuid?: string;
  email?: string;
  order?: number;
  is_requester?: boolean;
  invite_by_uuid?: string;
  invite_via_field_uuid?: string;
  optional_invite_by_uuid?: string;
  linked_to_uuid?: string;
};

export type TemplateField = JsonObject & {
  uuid?: string;
  submitter_uuid?: string;
  name?: string;
  type?: string;
  role?: string;
  required?: boolean;
  readonly?: boolean;
  default_value?: unknown;
  title?: string;
  description?: string;
  prefillable?: boolean;
  preferences?: JsonObject;
  areas?: TemplateFieldArea[];
};

export type TemplateFieldArea = JsonObject & {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  page?: number;
  attachment_uuid?: string;
};

export type TemplateSchemaItem = JsonObject & {
  attachment_uuid?: string;
  name?: string;
  dynamic?: boolean;
  pending_fields?: boolean;
};

export type TemplateDocumentResponse = {
  id: string;
  uuid: string;
  url: string;
  preview_image_url: string | null;
  preview_images: TemplateDocumentPreviewImageResponse[];
  filename: string;
};

export type TemplateDocumentPreviewImageResponse = {
  id: string;
  url: string;
  filename: string;
  metadata: Record<string, unknown>;
};
