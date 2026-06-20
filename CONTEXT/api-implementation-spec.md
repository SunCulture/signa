# Signa API Implementation Spec

This is the initial implementation scope for recreating DocuSeal's public API in Signa.

Primary sources:

- Hosted API reference: https://www.docuseal.com/docs/api
- Local OpenAPI file: `../../docuseal/docs/openapi.json`
- Local Rails routes: `../../docuseal/config/routes.rb`
- Local API controllers: `../../docuseal/app/controllers/api/*`
- Local tenancy sources:
  - `../../docuseal/lib/docuseal.rb`
  - `../../docuseal/app/models/account.rb`
  - `../../docuseal/app/models/user.rb`
  - `../../docuseal/app/models/account_linked_account.rb`
  - `../../docuseal/lib/ability.rb`
  - `../../docuseal/app/controllers/api/api_base_controller.rb`

## Scope Decision

Implement the public API reference first. The local Rails app exposes additional JSON endpoints under `/api`; those are recorded as secondary/internal scope and should not block the first public compatibility milestone.

Signa currently has a Nest global prefix of `/api`. DocuSeal Cloud examples use base URLs such as `https://api.docuseal.com/templates`, while the Rails monolith exposes these as `/api/templates` inside the web app. For Signa, implement public endpoints under `/api/*` first. We can later add unprefixed aliases if we need cloud-style path compatibility behind a dedicated API domain.

## Cross-Cutting Behavior

- Auth: API requests use `X-Auth-Token: API_KEY`.
- Web-app management routes use bearer JWT issued by `POST /api/auth/login` or `POST /api/auth/register`.
- Unauthorized response: JSON `{ "error": "Not authenticated" }`, HTTP 401.
- Forbidden response: JSON `{ "error": "Not authorized" }`, HTTP 403 unless DocuSeal returns a testing/production API-key mismatch message.
- Validation response: JSON `{ "error": "<message>" }`, HTTP 422.
- Rate limit response: JSON `{ "error": "Too many requests" }`, HTTP 429.
- Pagination: list endpoints return `{ data: [...], pagination: { count, next, prev } }`.
- Pagination defaults: `limit` default 10, maximum 100.
- Pagination cursors: DocuSeal sorts by descending `id`. `after` means IDs lower than the cursor; `before` means IDs greater than the cursor.
- Soft archive: `DELETE` sets `archived_at`.
- Permanent delete: `DELETE ...?permanently=true` destroys the record.
- `application_key` is still accepted in controllers as an alias for `external_id`.

## Tenancy Model

DocuSeal uses account-based row isolation. It does not use separate databases or schemas for tenants in the Rails app.

Core findings from the local clone:

- `MULTITENANT=true` is a runtime mode flag exposed by `Docuseal.multitenant?`.
- `Account` is the tenant root.
- `User` belongs to exactly one `Account`.
- API keys resolve to `User`, and the user's account becomes the API tenant context.
- Most business records carry `account_id`, including templates, submissions, submitters, folders, account configs, encrypted configs, webhooks, search entries, document metadata, email events, and webhook events.
- `current_account` is derived from `current_user.account`.
- Authorization is enforced by CanCan rules that scope resources with `account_id: user.account_id`.
- Self-hosted/non-multitenant mode still uses account IDs internally, but some config lookups can fall back to global/default env config or the first account.
- Multitenant mode avoids many self-hosted fallback behaviors and expects per-account or hosted defaults.
- DocuSeal has linked accounts for production/testing account pairs through `account_linked_accounts`.

Signa implementation rules:

- Model `accounts` as the tenant root from the start.
- Every tenant-owned table must include `account_id`.
- API authentication must resolve `X-Auth-Token` to a user and tenant account before controller/service logic runs.
- Repository/service methods must require tenant context and filter by `account_id`; avoid unscoped `find(id)` for tenant-owned resources.
- Never trust client-supplied `account_id`.
- Create/update flows assign `account_id` from authenticated tenant context only.
- Use account-scoped uniqueness where DocuSeal behavior is account-local.
- Keep testing accounts as separate linked accounts if we want DocuSeal-compatible test/prod API-key behavior.
- Preserve DocuSeal's wrong-environment error behavior where possible: if a production API key accesses a testing record, or vice versa, return a specific not-found/wrong-key style message instead of leaking cross-tenant data.
- Treat global config fallback as an explicit self-hosted mode decision; do not add hidden global fallback behavior by default.

Initial Signa tenancy tables to plan:

- `accounts`: tenant root, `uuid`, `name`, `timezone`, `locale`, `archived_at`.
- `users`: belongs to account, has auth credentials and role.
- `access_tokens`: API keys hashed and linked to users.
- `account_configs`: account-scoped JSON/config values.
- `encrypted_configs`: account-scoped secret config values.
- `account_linked_accounts`: production/testing or future linked-account relationships.
- Tenant-owned business tables: templates, template folders, submissions, submitters, documents/blob metadata, webhooks, events.

Account settings preference scope:

- `GET /api/account/preferences` returns account-level boolean config flags normalized from `account_configs`.
- `PATCH /api/account/preferences` persists supported flags as account-scoped config rows.
- Defaults mirror DocuSeal account settings behavior where practical: typed signatures, resubmission, decline, pre-fill signatures, and expiring download links are enabled unless explicitly disabled; stricter auth/compliance features are opt-in.
- Current supported keys: `force_mfa`, `with_signature_id`, `require_signing_reason`, `allow_typed_signature`, `allow_to_resubmit`, `allow_to_decline`, `allow_to_delegate`, `form_prefill_signature`, `download_links_expire`, `download_links_auth`, `combine_pdf_result_key`, `enforce_signing_order`, `with_file_links`, `hipaa`, and `cfr_part_11`.

## Public Endpoint Inventory

### Submissions

Submissions create signature requests from templates, uploaded PDFs, DOCX files, or HTML.

| Method | Path | Operation | Priority | Status |
| --- | --- | --- | --- | --- |
| GET | `/submissions` | List all submissions | P0 | Done |
| GET | `/submissions/{id}` | Get a submission | P0 | Done |
| GET | `/submissions/{id}/documents` | Get generated submission documents | P0 | Partial |
| POST | `/submissions` | Create a submission from an existing template | P0 | Done |
| POST | `/submissions/emails` | Create submissions from email list | P1 | Todo |
| POST | `/submissions/pdf` | Create a submission from PDF uploads | P0 | Done |
| POST | `/submissions/docx` | Create a submission from DOCX uploads | P1 | Todo |
| POST | `/submissions/html` | Create a submission from HTML | P1 | Todo |
| DELETE | `/submissions/{id}` | Archive or permanently delete a submission | P0 | Done |

#### GET `/submissions`

Purpose: list visible submissions for the authenticated account/user.

Query params:

- `template_id`
- `status`: `pending`, `completed`, `declined`, `expired`
- `q`: submitter name/email/phone search
- `slug`
- `template_folder`
- `archived`
- `limit`
- `after`
- `before`

Response shape:

- `data`: submission summaries.
- `pagination`: `count`, `next`, `prev`.

Submission summary fields observed:

- `id`, `name`, `source`, `submitters_order`, `slug`
- `status`, `audit_log_url`, `combined_document_url`
- `expire_at`, `completed_at`, `created_at`, `updated_at`, `archived_at`
- `submitters[]`
- `template`
- `created_by_user`

#### GET `/submissions/{id}`

Purpose: return full submission details.

Path params:

- `id` required.

Response adds:

- `variables`
- `values` and `documents` under submitters
- `submission_events`
- top-level `documents`
- computed status and completion data

Behavior from Rails:

- If all submitters are completed and audit trail is missing, generate the audit trail before responding.
- If completed submitter documents are missing, generate result documents before responding.
- `include=fields` includes template fields.
- `include=combined_document_url` can trigger combined-document generation.

Signa status:

- Implemented tenant-scoped retrieval with submitters, template, creator, optional events, optional fields, status, completion timestamp, values, and current template-backed documents.
- Pending: audit trail generation, final signed result documents, combined document generation.

#### GET `/submissions/{id}/documents`

Purpose: return partially filled preview documents or final signed documents.

Query params:

- `merge`: when `"true"` and multiple schema documents exist, return one merged PDF.

Response:

- `id`
- `documents[]`: `name`, `url`

Behavior from Rails:

- Completed submission: uses the last completed submitter's result documents.
- Pending submission: generates preview PDFs using current default/prefilled values.
- Merged documents are cached on the submission.

Signa status:

- Implemented current template/backing-template document URL response.
- Pending: generated prefilled preview PDFs, final signed PDFs, merge support, and caching generated submission documents.
- This endpoint is intentionally marked `Partial` until generated preview/result/merged documents are implemented.

#### POST `/submissions`

Purpose: create signature request(s) from an existing template and submitter definitions.

Body fields:

- `template_id` required
- `send_email`, default true
- `send_sms`, default false
- `order`: `preserved` default, or `random`
- `completed_redirect_url`
- `bcc_completed`
- `reply_to`
- `expire_at`
- `variables`
- `message`: `subject`, `body`
- `submitters[]` required

Submitter body fields:

- `name`, `role`, `email`, `phone`
- `values`
- `external_id`
- `completed`: when true, auto-completes and signs via API
- `metadata`
- `send_email`, `send_sms`
- `reply_to`
- `completed_redirect_url`
- `require_phone_2fa`, `require_email_2fa`
- `fields[]`: field overrides and default values

Behavior from Rails:

- Rejects missing, archived, or fieldless templates.
- Creates one or more submissions.
- Enqueues `submission.created` webhook events.
- Sends signature requests unless disabled.
- If submitter is marked completed, records `api_complete_form` and starts completion processing.

Signa status:

- Implemented single-submission creation from an existing template.
- Preserves tenant scoping, template archived/fieldless validation, submitter role matching, multi-role submitter merge, send-email/send-SMS preferences, sent timestamp behavior, values, metadata, field overrides/default values, completion timestamp, and `api_complete_form` event persistence.
- Returns DocuSeal-style submitter responses with `embed_src`.
- Pending: multiple submissions in one request, webhook enqueueing, real email/SMS dispatch, and submitter completion processing.

#### POST `/submissions/emails`

Purpose: create submissions for a raw email list.

Body fields:

- `template_id`
- `emails`
- `send_email`
- `message`

Notes:

- This endpoint exists in OpenAPI and Rails as `resources :emails` collection route.
- Treat as P1 because the main public nav does not list it, but the OpenAPI spec does.

#### POST `/submissions/pdf`

Purpose: upload PDF documents, create a backing template, and create a submission.

Body fields:

- `name`
- `send_email`, `send_sms`
- `order`
- `completed_redirect_url`
- `bcc_completed`
- `reply_to`
- `expire_at`
- `template_ids`
- `documents[]`
- `submitters[]`
- `message`
- `flatten`
- `merge_documents`
- `remove_tags`

PDF-specific behavior:

- Accepts tagged PDFs and normal PDFs.
- May extract AcroForm fields.
- Can flatten forms.
- Can remove DocuSeal field tags.
- Needs PDF preview image generation.

Signa status:

- Implemented by creating a backing PDF template through the existing template PDF stack, then creating a submission from that template.
- Supports JSON base64/URL documents, multipart uploads, provided coordinate fields, standard AcroForm extraction, preview generation, and submitter creation.
- Pending: embedded `{{...}}` tag extraction/removal, flattening, `template_ids` merge-in behavior, and true one-off hidden template semantics.

#### POST `/submissions/docx`

Purpose: upload DOCX documents, convert/process them, then create a submission.

Body fields:

- Same high-level submission fields as PDF.
- `variables`
- `documents[]`
- `merge_documents`
- `remove_tags`

Implementation note:

- Requires a DOCX-to-PDF or DOCX-to-rendered-document pipeline.

#### POST `/submissions/html`

Purpose: create dynamic signing documents from HTML and then create a submission.

Body fields:

- Same high-level submission fields as PDF.
- `documents[]`
- `merge_documents`

Implementation note:

- Requires HTML-to-PDF rendering with predictable page sizing.

#### DELETE `/submissions/{id}`

Purpose: archive or permanently delete a submission.

Path params:

- `id` required.

Query params:

- `permanently=true` destroys instead of archiving.

Signa status:

- Implemented tenant-scoped soft archive and permanent delete.

Response:

- `id`
- `archived_at`

Behavior:

- Soft archive enqueues `submission.archived` webhook event.

### Submitters

Submitters are individual signers within a submission.

| Method | Path | Operation | Priority | Status |
| --- | --- | --- | --- | --- |
| GET | `/submitters` | List all submitters | P0 | Done |
| GET | `/submitters/{id}` | Get a submitter | P0 | Done |
| PUT | `/submitters/{id}` | Update a submitter | P0 | Partial |

#### GET `/submitters`

Query params:

- `submission_id`
- `q`
- `slug`
- `completed_after`
- `completed_before`
- `external_id`
- `application_key` alias
- `template_id` supported by Rails
- `limit`
- `after`
- `before`

Response:

- `{ data, pagination }`
- Each submitter includes template, values, documents, preferences, events, role.

Signa status:

- Implemented tenant-scoped listing with DocuSeal cursor pagination and filters for `submission_id`, `q`, `slug`, `completed_after`, `completed_before`, `external_id`, `application_key`, `template_id`, `limit`, `after`, `before`, and `include=fields`.
- Response includes template, values, current template-backed documents, preferences, events, role, metadata, status, and `application_key`.

#### GET `/submitters/{id}`

Behavior:

- If completed and result documents are missing, generate them before responding.
- Includes template, events, values, documents, and role.

Signa status:

- Implemented tenant-scoped retrieval with template, events, values, current template-backed documents, role, preferences, status, and optional `include=fields`.
- Pending: result document generation before responding for completed submitters.

#### PUT `/submitters/{id}`

Purpose: update signer details, field values, metadata, and optionally complete the signer via API.

Body fields:

- `name`, `email`, `phone`
- `values`
- `external_id` / `application_key`
- `send_email`, `send_sms`
- `reply_to`
- `completed`
- `metadata`
- `completed_redirect_url`
- `require_phone_2fa`, `require_email_2fa`
- `message`
- `fields[]`

Behavior:

- Rejects updates after completion.
- Rejects updates after decline.
- Normalizes values and field attachments.
- If completed, records `api_complete_form` and starts completion processing.
- If not completed but `send_email` or `send_sms` is true, sends request notification.

Signa status:

- Implemented update guards for completed/declined submitters.
- Implemented email/phone normalization, metadata replacement, values merge, `application_key`/`external_id`, preference updates, readonly field handling, field default/config overrides, API completion timestamp, and `api_complete_form` event persistence.
- Returns DocuSeal-style payload with `embed_src`, values, role, and current template-backed documents.
- Pending: attachment value normalization, real email/SMS dispatch, completion processing, and final signed result document generation.

### Templates

Templates are reusable signing forms with documents, submitters, and fields.

| Method | Path | Operation | Priority | Status |
| --- | --- | --- | --- | --- |
| GET | `/templates` | List all templates | P0 | Done |
| GET | `/templates/{id}` | Get a template | P0 | Done |
| POST | `/templates/pdf` | Create a template from PDF | P0 | Done |
| POST | `/templates/docx` | Create a template from Word DOCX | P1 | Todo |
| POST | `/templates/html` | Create a template from HTML | P1 | Todo |
| POST | `/templates/{id}/clone` | Clone a template | P1 | Todo |
| POST | `/templates/merge` | Merge templates | P1 | Todo |
| PUT | `/templates/{id}` | Update a template | P0 | Done |
| PUT | `/templates/{id}/documents` | Update template documents | P0 | Done |
| DELETE | `/templates/{id}` | Archive or permanently delete a template | P0 | Done |

#### GET `/templates`

Query params:

- `q`
- `slug`
- `external_id`
- `application_key` alias
- `folder`
- `archived`
- `limit`
- `after`
- `before`

Response:

- `{ data, pagination }`
- Template fields include `id`, `archived_at`, `fields`, `name`, `preferences`, `schema`, `slug`, `source`, `submitters`, `created_at`, `updated_at`, `author_id`, `external_id`, `folder_id`, `shared_link`, `application_key`, `folder_name`, `author`, `documents`.

Signa status:

- Implemented with `ApiOrJwtGuard` to match DocuSeal's API behavior of accepting either signed-in user context or `X-Auth-Token`.
- Account isolation is enforced through the hydrated current user.
- Pagination uses DocuSeal cursor semantics: newest-first IDs, `after` filters lower IDs, `before` filters higher IDs.
- `documents` serializes stored document attachments through signed local proxy URLs.
- `archived=true` uses TypeORM `withDeleted()` because templates use `@DeleteDateColumn`; without this, TypeORM's implicit soft-delete filter hides archived rows.

#### GET `/templates/{id}`

Purpose: return full template details and document URLs.

Document response fields:

- `id`
- `uuid`
- `url`
- `preview_image_url`
- `filename`

Signa status:

- Implemented for metadata, author, folder name, fields, schema, submitters, preferences, and variables schema.
- Document URL serialization uses signed local proxy URLs from the Storage module.
- Document serialization follows template `schema` order and omits stale attachments no longer referenced by schema, matching DocuSeal's `schema_documents` behavior.

#### POST `/templates/pdf`

Purpose: create reusable template from PDF uploads.

Body fields:

- `name`
- `folder_name`
- `external_id`
- `shared_link`
- `documents[]`
- `flatten`
- `remove_tags`

Implementation responsibilities:

- Store document blobs.
- Detect/extract tags and AcroForm fields.
- Generate preview images.
- Record schema, submitters, and fields.

Signa status:

- Implemented DocuSeal-compatible JSON input with `documents: [{ name, file, fields }]`, where `file` can be base64 PDF content or a downloadable PDF URL.
- Also accepts multipart `documents`, `files`, or `file` uploads for Signa frontend/dev ergonomics.
- Creates or updates an existing template by `external_id`.
- Stores PDF blobs and preview blobs in local storage metadata tables modeled after DocuSeal ActiveStorage.
- Generates first-page-and-later preview images with `@hyzyla/pdfium` and `sharp`, up to `PDF_PREVIEW_MAX_PAGES`.
- Persists schema entries from attachment UUIDs and normalizes provided coordinate fields to DocuSeal response format, including 1-based request pages to 0-based stored pages.
- Extracts standard AcroForm fields from uploaded PDFs when explicit fields are not provided. The extractor maps widget rectangles to DocuSeal-style normalized top-left areas, skips fields with preset values, preserves required/read-only flags, maps text/checkbox/select/multiple/radio/signature/initials field types, and assigns extracted fields to the first template submitter during normalization.
- Pending: embedded `{{...}}` text-tag removal/extraction and XFA form support. `pdf-lib` does not support XFA; embedded text tags need a separate text-geometry/removal engine decision.

#### POST `/templates/docx`

Purpose: create template from Word DOCX.

Body fields:

- `name`
- `external_id`
- `folder_name`
- `shared_link`
- `documents[]`

Implementation responsibilities:

- Convert DOCX to a PDF-like signing document.
- Parse tags where supported.
- Generate previews.

#### POST `/templates/html`

Purpose: create template from HTML.

Body fields:

- `html`
- `html_header`
- `html_footer`
- `name`
- `size`
- `external_id`
- `folder_name`
- `shared_link`
- `documents[]`

Implementation responsibilities:

- Render HTML to PDF.
- Preserve dynamic variable support for later submissions.

#### POST `/templates/{id}/clone`

Body fields:

- `name`
- `folder_name`
- `external_id`
- `application_key` alias
- `documents` optional replacements

Behavior:

- Clones schema documents and preview attachments.
- Sets source to `api`.
- Enqueues `template.created`.

#### POST `/templates/merge`

Body fields:

- `template_ids`
- `name`
- `folder_name`
- `external_id`
- `shared_link`
- `roles`

Purpose:

- Combine multiple existing templates into one reusable signing template.

#### PUT `/templates/{id}`

Body fields:

- `name`
- `folder_name`
- `roles`
- `archived`
- `external_id`
- `shared_link`
- `submitters[]`
- `fields[]`

Behavior:

- Creates folder by name if needed.
- Updates submitter role names.
- `archived=true` soft archives.
- Enqueues `template.updated` and maybe `template.archived`.

Signa status:

- Implemented folder creation/reuse, role-name updates, archived restore/archive toggling, submitter replacement, fields replacement, shared link, external id, and name updates.
- The frontend template editor now writes DocuSeal-compatible `fields[]` area data through this endpoint for click/draw placement, select, move, resize, and delete.
- Webhook enqueue is pending the Webhooks module.

#### PUT `/templates/{id}/documents`

Body fields:

- `documents[]`
- `merge`

Purpose:

- Replace or append template documents and reprocess schema/preview data.

Signa status:

- Implemented PDF replacement/append behavior via `merge`.
- Rebuilds schema and normalized fields for uploaded/replaced documents, including standard AcroForm extraction when explicit fields are not supplied.
- Returns `schema`, changed `fields`, changed `submitters`, and serialized document URLs.

#### DELETE `/templates/{id}`

Query params:

- `permanently=true` destroys instead of archiving.

Response:

- `id`
- `archived_at`

Behavior:

- Soft archive enqueues `template.archived`.

## Secondary Rails API Endpoints

These are present in `docuseal/config/routes.rb` but are not part of the public API docs/OpenAPI inventory. Treat them as internal compatibility candidates after the public API is stable.

| Method | Path | Purpose | Priority |
| --- | --- | --- | --- |
| GET | `/api/user` | Current API user | P2 |
| POST | `/api/attachments` | Upload signer/template attachments | P2 |
| POST | `/api/submitter_email_clicks` | Track email clicks | P2 |
| POST | `/api/submitter_form_views` | Track form views | P2 |
| POST | `/api/submissions/init` | Legacy/init submission creation shape | P2 |
| GET | `/api/templates/{id}/submissions` | List submissions for template | P2 |
| POST | `/api/templates/{id}/submissions` | Create submission for template nested route | P2 |
| POST | `/api/tools/merge` | Merge base64 PDFs | P2 |
| POST | `/api/tools/verify` | Verify PDF signatures/checksum | P2 |
| GET | `/api/events/form/{type}` | Form webhook event listing | P2 |
| GET | `/api/events/submission/{type}` | Submission webhook event listing | P2 |

## Webhooks To Model Later

The public docs also include webhook references. These should be planned after base CRUD and document generation are stable.

- Form webhook
- Submission webhook
- Template webhook

Events observed in controllers:

- `template.created`
- `template.updated`
- `template.archived`
- `submission.created`
- `submission.archived`
- `api_complete_form`

## PDF And Document Processing Scope

### What DocuSeal Uses

From the local clone:

- `hexapdf` gem: PDF parsing, editing, AcroForm flattening, signing, PDF/A task, merging/importing pages, signature verification.
- Custom `lib/pdfium.rb`: FFI bindings to PDFium for rendering pages to bitmaps, reading text/object geometry, importing pages, flattening, rotating, saving.
- `ruby-vips`: image loading, resizing, rotation, PNG/JPEG preview generation.
- `Marcel`: MIME type detection and prioritization for PDF/JPEG/PNG.
- Active Storage: file/blob storage, signed/proxy URLs, preview attachments.
- `Zip::File`: ZIP upload extraction with size/type filtering.
- Custom PDF utilities and builders:
  - `lib/pdf_utils.rb`
  - `lib/templates/process_document.rb`
  - `lib/templates/find_acro_fields.rb`
  - `lib/templates/build_annotations.rb`
  - `lib/templates/modify_documents.rb`
  - `lib/submissions/generate_result_attachments.rb`
  - `lib/submissions/generate_combined_attachment.rb`
  - `lib/submissions/generate_preview_attachments.rb`

### Node/Nest Candidate Stack

Initial candidates for Signa:

- PDF creation/editing/forms/merge: `pdf-lib` as first pass. Standard AcroForm positional extraction is implemented with this stack. Validate whether it covers every remaining HexaPDF use case, especially XFA, signatures, and AcroForm flattening.
- PDF rendering/previews/text geometry: use a PDFium-backed Node package or a worker/service wrapper around PDFium. PDF.js can render in Node/browser but may not match PDFium output or low-level object access.
- PDF signature verification/signing: likely needs a specialized library or external service; `pdf-lib` alone is not enough for full digital signature parity.
- Image processing: `sharp`, which is libvips-backed and maps well to `ruby-vips` preview/image transformations.
- MIME detection: `file-type` or similar byte-sniffing package, with explicit allow-lists.
- ZIP extraction: `yauzl`, `unzipper`, or another streaming ZIP reader with total-size limits.
- DOCX to PDF: likely LibreOffice/soffice in a worker container, or a separate conversion service. Avoid pure JS DOCX renderers until tested against DocuSeal fixtures.
- HTML to PDF: Playwright/Chromium or a dedicated HTML-to-PDF service for deterministic rendering.
- Storage/proxy URLs: S3-compatible storage through a Nest storage adapter plus signed URL/proxy route equivalents.

### Public Signing Flow

DocuSeal parity target:

- `GET /s/:slug` renders a public submitter signing form.
- Signer pages render pre-generated document preview images, overlay fields for the current submitter, allow decline/download where account/template preferences permit, and complete the submitter when all required values are present.
- Signature capture supports drawing, typing, and image upload. DocuSeal uses `signature_pad`; Signa uses `react-signature-canvas`, a typed React wrapper around `signature_pad`, plus a local signature-like font for typed signatures.
- Completion stores signer values, signature attachments, and a completion event, then later result generation stamps/serializes values into final PDFs and audit trails.

Current Signa implementation:

- `GET /api/signing/:slug` loads the public signing form with submitter, current documents, preview images, fields, values, and readonly values.
- `POST /api/signing/:slug/attachments` stores signer-uploaded signature assets as submitter attachments and validates image content with `sharp`.
- `PUT /api/signing/:slug/values` saves in-progress signer values.
- `POST /api/signing/:slug/complete` validates required values and marks the submitter completed.
- `POST /api/signing/:slug/decline` marks the submitter declined.
- `GET /api/signing/:slug/download` returns current document URLs until final signed result generation is implemented.

Remaining parity gaps:

- Final signed PDF stamping/flattening.
- Audit trail and combined-document generation.
- Completed-result download URLs.
- Full DocuSeal signer field widget coverage, signing order enforcement, signing reason prompts, signer authentication, delegation, and resubmission rules.

### Template Email Preferences

DocuSeal parity target:

- Template preferences store custom subjects and Markdown bodies for signature request emails, completed documents copy emails, and completed notification emails.
- Email bodies are edited with a small Tiptap Markdown editor, not raw HTML.
- The editor supports bold, italic, underline, links, undo/redo, variable insertion, and visual variable highlighting.
- Runtime email rendering replaces DocuSeal-style `{variable}` and `{{variable}}` placeholders before converting the supported Markdown subset to safe HTML.

Current Signa implementation:

- The template preferences modal implements DocuSeal-style Markdown editing for signature request, documents copy, and completed notification email bodies.
- Supported preference variables are aligned with the DocuSeal screens currently implemented:
  - signature request: `template.name`, `submitter.link`, `account.name`
  - documents copy: `template.name`, `documents.link`, `account.name`
  - completed notification: `template.name`, `submission.submitters`, `submission.link`
- Backend rendering helpers support the above variables plus common account/sender/submitter/submission aliases needed by later notification flows.
- Markdown rendering escapes raw HTML and only emits the supported email subset.

Remaining parity gaps:

- Real notification dispatch is not wired yet.
- Email queues, SMTP/provider adapters, retry state, delivery events, and click/open tracking are pending.
- Account-level email defaults and inheritance need to be reconciled when the notification module is implemented.

### Risk Areas

- Digital PDF signatures and certificate trust validation.
- Matching DocuSeal's visual PDF output exactly enough for signing/audit trails.
- AcroForm extraction and field-tag detection.
- Large-file memory behavior and preview generation throughput.
- Password-protected PDFs.
- DOCX/HTML rendering fidelity.
- Audit trail generation and combined-document signing.

## Suggested Implementation Milestones

1. Public API shell and auth.
2. Database schema/models for accounts, users/API keys, templates, submissions, submitters, documents, events.
3. List/get/archive endpoints for templates, submissions, submitters.
4. Basic template creation from PDF with storage and preview generation.
5. Basic submission creation from template and submitter update/complete flow.
6. Result PDF generation for field values and signatures.
7. Submission documents endpoint with merge support.
8. Template document update, clone, and merge.
9. DOCX and HTML creation paths.
10. Webhooks and secondary Rails API endpoints.
