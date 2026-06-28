import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "error", "shutting_down"]),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export type ApiResponse<T> = {
  data: T;
  error: string | null;
};

export const signaRoles = [
  "admin",
  "editor",
  "member",
  "viewer",
  "agent",
] as const;

export type SignaRole = (typeof signaRoles)[number];

export const signaRoleLabels: Record<SignaRole, string> = {
  admin: "Admin",
  editor: "Editor",
  member: "Member",
  viewer: "Viewer",
  agent: "Agent",
};

export function isSignaRole(role: unknown): role is SignaRole {
  return typeof role === "string" && signaRoles.includes(role as SignaRole);
}

export const docusealPaginationSchema = z.object({
  count: z.number(),
  next: z.union([z.string(), z.number()]).nullable(),
  prev: z.union([z.string(), z.number()]).nullable(),
});

export const templateAuthorSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
});

export const templateDocumentPreviewImageSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string().url(),
  filename: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export const templateDocumentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  uuid: z.string(),
  url: z.string().url(),
  preview_image_url: z.string().url().nullable(),
  preview_images: z.array(templateDocumentPreviewImageSchema),
  filename: z.string(),
});

export const templateSchemaItemSchema = z
  .object({
    attachment_uuid: z.string().optional(),
    name: z.string().optional(),
    dynamic: z.boolean().optional(),
    pending_fields: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const templateFieldAreaSchema = z
  .object({
    attachment_uuid: z.string().optional(),
    h: z.number().optional(),
    page: z.number().optional(),
    w: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  })
  .catchall(z.unknown());

export const templateFieldSchema = z
  .object({
    uuid: z.string().optional(),
    submitter_uuid: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    readonly: z.boolean().optional(),
    default_value: z.unknown().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    prefillable: z.boolean().optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    areas: z.array(templateFieldAreaSchema).optional(),
  })
  .catchall(z.unknown());

export const templateSubmitterSchema = z
  .object({
    name: z.string(),
    uuid: z.string().optional(),
    email: z.string().email().optional(),
    order: z.number().optional(),
  })
  .catchall(z.unknown());

export const templateResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  archived_at: z.coerce.date().nullable(),
  fields: z.array(templateFieldSchema),
  name: z.string(),
  preferences: z.record(z.string(), z.unknown()),
  schema: z.array(templateSchemaItemSchema),
  slug: z.string(),
  source: z.string(),
  submitters: z.array(templateSubmitterSchema),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  author_id: z.union([z.string(), z.number()]),
  external_id: z.string().nullable(),
  folder_id: z.union([z.string(), z.number()]),
  shared_link: z.boolean(),
  application_key: z.string().nullable(),
  folder_name: z.string(),
  variables_schema: z.unknown().nullable(),
  author: templateAuthorSchema,
  documents: z.array(templateDocumentSchema),
});

export const templatesListResponseSchema = z.object({
  data: z.array(templateResponseSchema),
  pagination: docusealPaginationSchema,
});

export const submissionDocumentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

export const submissionDocumentsResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  documents: z.array(submissionDocumentSchema),
});

export const submitterValueSchema = z.record(z.string(), z.unknown());

export const submitterResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    uuid: z.string().optional(),
    slug: z.string(),
    email: z.string().email().nullable(),
    name: z.string().nullable(),
    phone: z.string().nullable().optional(),
    status: z.string().optional(),
    values: submitterValueSchema.optional(),
    documents: z.array(submissionDocumentSchema).optional(),
  })
  .catchall(z.unknown());

export const submittersListResponseSchema = z.object({
  data: z.array(submitterResponseSchema),
  pagination: docusealPaginationSchema,
});

export const submissionResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    archived_at: z.coerce.date().nullable().optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
    status: z.string().optional(),
    submitters: z.array(submitterResponseSchema).optional(),
    documents: z.array(submissionDocumentSchema).optional(),
  })
  .catchall(z.unknown());

export const submissionsListResponseSchema = z.object({
  data: z.array(submissionResponseSchema),
  pagination: docusealPaginationSchema,
});

export type DocusealPagination = z.infer<typeof docusealPaginationSchema>;
export type TemplateResponse = z.infer<typeof templateResponseSchema>;
export type TemplatesListResponse = z.infer<typeof templatesListResponseSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type SubmissionsListResponse = z.infer<
  typeof submissionsListResponseSchema
>;
export type SubmitterResponse = z.infer<typeof submitterResponseSchema>;
export type SubmittersListResponse = z.infer<typeof submittersListResponseSchema>;
