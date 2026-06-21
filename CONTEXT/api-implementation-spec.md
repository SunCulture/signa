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
- API token storage follows DocuSeal's access-token model: store an encrypted token value for reveal, store a SHA-256 digest for lookup, and resolve the key to the owning user/account.
- Signa extends DocuSeal's single-token model with per-token resource permissions. Guards deny API-key requests when the key lacks the required resource action, while bearer JWT web routes continue to use user/session authorization.
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
- `users`: belongs to account, has auth credentials and account-level role (`admin`, `editor`, `member`, `viewer`, `agent`).
- `access_tokens`: API keys hashed and linked to users.
- `access_tokens` also store encrypted token material for password-gated reveal, permission scopes, last-used timestamps, and revocation timestamps.
- `account_configs`: account-scoped JSON/config values.
- `encrypted_configs`: account-scoped secret config values.
- `account_linked_accounts`: production/testing or future linked-account relationships.
- `teams`: account-scoped user groups with `manager`, `member`, and `viewer` team roles.
- `team_members`: many-to-many account-scoped user/team membership rows with soft archive.
- `team_invitations`: hashed-token team invitations for users not yet assigned to a team.
- Tenant-owned business tables: templates, template folders, submissions, submitters, documents/blob metadata, webhooks, events.

Account settings preference scope:

- `GET /api/account/preferences` returns account-level config flags normalized from `account_configs`.
- `PATCH /api/account/preferences` persists supported flags/configs as account-scoped config rows and removes empty string/reminder configs, matching DocuSeal's account-config behavior.
- Defaults mirror DocuSeal account settings behavior where practical: typed signatures, resubmission, decline, pre-fill signatures, and expiring download links are enabled unless explicitly disabled; stricter auth/compliance features are opt-in.
- Current supported keys: `receive_completed_email`, `bcc_emails`, `submitter_reminders`, `force_mfa`, `with_signature_id`, `require_signing_reason`, `allow_typed_signature`, `allow_to_resubmit`, `allow_to_decline`, `allow_to_delegate`, `form_prefill_signature`, `download_links_expire`, `download_links_auth`, `combine_pdf_result_key`, `enforce_signing_order`, `with_file_links`, `hipaa`, `cfr_part_11`, `knowledge_based_authentication`, `esigning_preference`, `flatten_result_pdf`, `document_filename_format`, `submitter_invitation_email`, `submitter_documents_copy_email`, `submitter_completed_email`, `form_completed_message`, `form_completed_button`, `form_with_confetti`, and `policy_links`.
- Notification parity note: DocuSeal stores completed-notification email enablement as a user config and BCC/reminders as account configs. Signa currently exposes all three through account preferences for a simpler tenant-level settings page; split to user-level config later if per-user notification preferences become required.
- E-signature/personalization parity note: Signa stores company logo as an account-scoped storage attachment and signing certificate settings in `encrypted_configs`, matching DocuSeal's account-level settings boundary. Certificate-backed cryptographic PDF signing and HexaPDF-grade certificate-chain verification remain pending.

Team management scope:

- `Account` remains the tenant/workspace boundary.
- `Team` is an account-local collaboration group. Users can belong to multiple teams in the same account.
- `users.role` remains the account-level role; `team_members.role` is team-level and supports `manager`, `member`, and `viewer`.
- Account-level roles are unlocked in Signa even though DocuSeal OSS gates non-admin roles behind Pro. Signa uses CASL policies as the backend authorization boundary:
  - `admin`: manages account, users, teams, templates, submissions, and settings.
  - `editor`: document workflow editor for templates/submissions.
  - `member`: standard creator/collaborator for document workflows.
  - `viewer`: read-only document workflow access.
  - `agent`: operational send/resend/support role for submission workflows.
- New account registration creates a default team named after the account and adds the registering user as `manager`.
- Team managers can manage members/invitations for their team; account admins can manage all teams.
- Current invitation implementation stores only a token hash and returns the raw accept token only on creation. Queued invitation email delivery remains a mail-workflow integration task.

Team endpoints:

| Method | Path                                      | Operation                      | Status |
| ------ | ----------------------------------------- | ------------------------------ | ------ |
| GET    | `/teams`                                  | List active/archived teams     | Done   |
| POST   | `/teams`                                  | Create an account team         | Done   |
| GET    | `/teams/{id}`                             | Get a team                     | Done   |
| PATCH  | `/teams/{id}`                             | Update team name/description   | Done   |
| DELETE | `/teams/{id}`                             | Archive a team                 | Done   |
| GET    | `/teams/{id}/members`                     | List team members              | Done   |
| POST   | `/teams/{id}/members`                     | Add or restore a team member   | Done   |
| PATCH  | `/teams/{id}/members/{memberId}`          | Change a team member role      | Done   |
| DELETE | `/teams/{id}/members/{memberId}`          | Remove a team member           | Done   |
| GET    | `/teams/{id}/invitations`                 | List team invitations          | Done   |
| POST   | `/teams/{id}/invitations`                 | Create a team invitation       | Done   |
| DELETE | `/teams/{id}/invitations/{invitationId}`  | Revoke a pending invitation    | Done   |
| POST   | `/team-invitations/{token}/accept`        | Accept a pending invitation    | Done   |

User management scope:

- DocuSeal OSS exposes admin-only user management and shows editor/viewer as disabled Pro options. Signa keeps the same modal/table UX direction but implements the full role set using CASL.
- Bulk user import accepts normalized JSON rows created from frontend manual email parsing, CSV parsing, or `.xlsx` parsing. Each row returns `created`, `restored`, `skipped`, or `failed`.
- Import headers supported now: required `email`; optional `first_name`, `last_name`, `role`, and `team`.
- Pending import parity: automatic `team` membership assignment from imported `team` values.

User endpoints:

| Method | Path              | Operation                         | Status |
| ------ | ----------------- | --------------------------------- | ------ |
| GET    | `/users`          | List active/archived users        | Done   |
| POST   | `/users`          | Create or restore a user          | Done   |
| POST   | `/users/import`   | Bulk import normalized user rows  | Done   |
| PATCH  | `/users/{id}`     | Update user profile/role/MFA      | Done   |
| DELETE | `/users/{id}`     | Archive user                      | Done   |

## Public Endpoint Inventory

### Submissions

Submissions create signature requests from templates, uploaded PDFs, DOCX files, or HTML.

| Method | Path                          | Operation                                     | Priority | Status  |
| ------ | ----------------------------- | --------------------------------------------- | -------- | ------- |
| GET    | `/submissions`                | List all submissions                          | P0       | Done    |
| GET    | `/submissions/{id}`           | Get a submission                              | P0       | Done    |
| GET    | `/submissions/{id}/documents` | Get generated submission documents            | P0       | Partial |
| POST   | `/submissions`                | Create a submission from an existing template | P0       | Done    |
| POST   | `/submissions/emails`         | Create submissions from email list            | P1       | Done    |
| POST   | `/submissions/pdf`            | Create a submission from PDF uploads          | P0       | Done    |
| POST   | `/submissions/docx`           | Create a submission from DOCX uploads         | P1       | Done    |
| POST   | `/submissions/html`           | Create a submission from HTML                 | P1       | Done    |
| DELETE | `/submissions/{id}`           | Archive or permanently delete a submission    | P0       | Done    |

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

- Implemented tenant-scoped retrieval with submitters, template, creator, optional events, optional fields, status, completion timestamp, values, and generated documents.
- Completed submissions now lazily generate audit trail and combined-document URLs when document serialization is requested.
- Remaining gap: generated PDFs are value-stamped with `pdf-lib`, but DocuSeal's HexaPDF/PDFium-grade flattening, cryptographic signatures, LTV, PDF/A, and timestamp server behavior are not complete.

#### GET `/submissions/{id}/events`

Purpose: return the DocuSeal-style event log timeline for the submission detail modal.

Path params:

- `id` required.

Response shape:

- `data[]`: ordered timeline entries.
- Each entry includes `id`, `event_type`, `event_timestamp`, `submitter_id`, `icon`, `title`, `actor`, `device`, `message`, and raw `data`.

Behavior from Rails:

- The first timeline row is derived from submission creation metadata.
- Persisted `submission_events` are ordered by `event_timestamp`.
- Event icons follow `SubmissionEventsController::SUBMISSION_EVENT_ICONS`.
- Device icons are derived from the event user agent.

Signa status:

- Implemented tenant-scoped endpoint.
- Synthesizes the creation row from the submission record and maps persisted events to DocuSeal-compatible titles/icons/device metadata.
- Public signing now records repeated `view_form`, first `start_form`, `complete_form`, and `decline_form` events with request IP/user-agent metadata.
- Signature request email links now include a DocuSeal-style signed `t` tracking param; visiting `/s/:slug?t=...` records `click_email` before the normal `view_form` event.
- API-created and API-updated completed submitters now include request IP/user-agent metadata on `api_complete_form` events.
- Public phone verification now records `send_2fa_sms` and `phone_verified`.
- Public delegation records `delegate_form`; scheduled reminders record `send_reminder_email`.
- Remaining gap: direct SMS-click endpoint/provider callbacks, provider email opens/bounces, identity verification/KBA, and payment events depend on their pending subsystems. Queued `send_sms` invitation events are persisted when Twilio Messaging delivery succeeds.

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

- Implemented DocuSeal-style lazy generated documents:
  - pending submissions generate prefilled preview PDFs from current field default values and submitter values;
  - completed submissions generate result PDFs attached to the last completed submitter;
  - `merge=true` generates and caches preview/result merged PDFs on the submission;
  - generated outputs are stored through the existing ActiveStorage-compatible local storage layer.
- Remaining gap: generated PDFs are stamped/serialized with the currently supported Signa field set; advanced DocuSeal rendering details such as exact font/layout parity, PDF/A, cryptographic signing, LTV, timestamp server integration, and HexaPDF edge cases remain pending.

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

- Implemented submission creation from an existing template, including the DocuSeal `/submissions/init` wrapper response and nested `/templates/{id}/submissions` alias.
- Preserves tenant scoping, template archived/fieldless validation, submitter role matching, multi-role submitter merge, send-email/send-SMS preferences, custom request email `message` subject/body, values, metadata, field overrides/default values, completion timestamp, and `api_complete_form` event persistence.
- API submitter values are normalized through a DocuSeal-style submitter value normalizer before persistence. Values can be keyed by field UUID, field name, or parameterized field name; attachment-backed field values (`signature`, `initials`, `image`, `file`, `stamp`) support HTTPS URL ingestion, base64/data URI ingestion, short typed signature/initials text converted to PNG, and arrays for multi-file fields.
- Normalized API attachment values are persisted as submitter attachments and submitter values are replaced with attachment UUIDs, matching DocuSeal's `NormalizeParamUtils`/`NormalizeValues` flow.
- `send_email=true` now emits a queued signature-request email event; `sent_at` is set only after the mail processor successfully delivers and records `send_email`, matching DocuSeal's send job semantics.
- Returns DocuSeal-style submitter responses with `embed_src`.
- Email-list creation is implemented through `POST /api/submissions/emails`; each email creates an individual submission and reuses the existing queued signature-request flow.
- Pending: complex multi-submission payload arrays beyond email-list aliases and full delivery/provider-event persistence.
- Runtime foundations for webhook/email/SMS side effects now exist through Nest EventEmitter, BullMQ queues, ScheduleModule, and MailerModule. Mail, webhook, and SMS invitation processors are implemented; SMS provider callback tracking remains pending.

#### POST `/submissions/emails`

Purpose: create submissions for a raw email list.

Body fields:

- `template_id`
- `emails`
- `send_email`
- `message`

Notes:

- This endpoint exists in OpenAPI and Rails as `resources :emails` collection route.
- Implemented. Accepts `email` or `emails` as a string/list, creates one submission per recipient email, and queues signature request email when enabled.

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
- Supports `template_ids` merge-in by cloning referenced template documents/previews into the backing template and remapping merged fields to valid submitter roles.
- Pending: embedded `{{...}}` tag extraction/removal, flattening, and true one-off hidden template semantics.

#### POST `/submissions/docx`

Purpose: upload DOCX documents, convert/process them, then create a submission.

Body fields:

- Same high-level submission fields as PDF.
- `variables`
- `documents[]`
- `merge_documents`
- `remove_tags`

Implementation note:

- Implemented through the dynamic document boundary and LibreOffice-backed DOCX-to-PDF conversion.
- Supports base64/data-URI and HTTPS URL DOCX input, explicit `documents[].fields[]`, embedded `{{Field Name;role=Signer1;type=date}}` signing-field tags, template merge-in through `template_ids`, and the existing submission creation side effects.
- Embedded DOCX signing-field tags are converted to deterministic marker tokens before conversion, located with Poppler `pdftotext -bbox`, and normalized into DocuSeal/Signa field areas after PDF generation.
- Remaining dynamic-document gap: `[[variable]]` content expansion for DOCX body text/tables/lists is tracked separately from signing-field extraction.

#### POST `/submissions/html`

Purpose: create dynamic signing documents from HTML and then create a submission.

Body fields:

- Same high-level submission fields as PDF.
- `documents[]`
- `merge_documents`

Implementation note:

- Implemented through the dynamic document boundary and Playwright HTML-to-PDF rendering.
- Supports top-level HTML and `documents[]`, `html_header`, `html_footer`, `size`, DocuSeal-style custom field tags such as `<text-field>`, `<signature-field>`, `<date-field>`, and role/required/preference extraction into normalized Signa/DocuSeal fields.

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

| Method | Path               | Operation           | Priority | Status  |
| ------ | ------------------ | ------------------- | -------- | ------- |
| GET    | `/submitters`      | List all submitters | P0       | Done    |
| GET    | `/submitters/{id}` | Get a submitter     | P0       | Done    |
| PUT    | `/submitters/{id}` | Update a submitter  | P0       | Done    |

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

- Implemented tenant-scoped retrieval with template, events, values, generated completed documents for completed submitters, role, preferences, status, and optional `include=fields`.

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
- Implemented DocuSeal-style API value normalization for submitter updates, including field-name/parameterized-name lookup, attachment UUID passthrough for already-uploaded submitter attachments, base64/data URI ingestion, HTTPS URL ingestion with localhost/private-network blocking, short typed signature/initials text converted to PNG, and array values for multi-file fields.
- `send_email=true` emits the queued signature-request email flow; `sent_at` is set by the mail processor after successful delivery.
- `send_sms=true` emits the same queued invitation flow; `sent_at` is not set until the SMS processor successfully sends and records `send_sms`.
- `message: { subject, body }` is persisted as submitter request-email preferences and used by queued invitation rendering.
- API completion now merges field defaults, removes values for currently hidden conditional fields, replaces current-date placeholders, and records `api_complete_form`.
- Returns DocuSeal-style payload with `embed_src`, values, role, and current template-backed documents.

### Templates

Templates are reusable signing forms with documents, submitters, and fields.

| Method | Path                        | Operation                                | Priority | Status |
| ------ | --------------------------- | ---------------------------------------- | -------- | ------ |
| GET    | `/templates`                | List all templates                       | P0       | Done   |
| GET    | `/templates/{id}`           | Get a template                           | P0       | Done   |
| POST   | `/templates/pdf`            | Create a template from PDF               | P0       | Done   |
| POST   | `/templates/docx`           | Create a template from Word DOCX         | P1       | Done   |
| POST   | `/templates/html`           | Create a template from HTML              | P1       | Done   |
| POST   | `/templates/{id}/clone`     | Clone a template                         | P1       | Done   |
| POST   | `/templates/merge`          | Merge templates                          | P1       | Todo   |
| PUT    | `/templates/{id}`           | Update a template                        | P0       | Done   |
| PUT    | `/templates/{id}/documents` | Update template documents                | P0       | Done   |
| DELETE | `/templates/{id}`           | Archive or permanently delete a template | P0       | Done   |

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

- Implemented: convert DOCX to PDF through `libreoffice-convert`, store dynamic source/version records, attach generated PDFs to the template, normalize explicit fields, extract embedded `{{...}}` signing-field tags through marker geometry, and generate previews through the existing PDF stack.
- Remaining dynamic-document gap: `[[variable]]` content expansion for DOCX body text/tables/lists.

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

- Implemented: render HTML to PDF with Playwright, store dynamic source/version records, attach generated PDFs to the template, generate previews, and extract DocuSeal-style custom field tags into normalized fields.
- Dynamic source records preserve the HTML body/header/footer data for later regeneration work.

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
- Webhook enqueue is implemented through the Webhooks module.

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

| Method | Path                              | Purpose                                     | Priority | Status |
| ------ | --------------------------------- | ------------------------------------------- | -------- | ------ |
| GET    | `/api/user`                       | Current API user                            | P2       | Done   |
| POST   | `/api/attachments`                | Upload signer/template attachments          | P2       | Done   |
| POST   | `/api/submitter_email_clicks`     | Track email clicks                          | P2       | Done   |
| POST   | `/api/submitter_sms_clicks`       | Track SMS clicks                            | P2       | Done   |
| POST   | `/api/submitter_form_views`       | Track form views                            | P2       | Done   |
| POST   | `/api/submissions/init`           | Legacy/init submission creation shape       | P2       | Done   |
| GET    | `/api/templates/{id}/submissions` | List submissions for template               | P2       | Done   |
| POST   | `/api/templates/{id}/submissions` | Create submission for template nested route | P2       | Done   |
| GET    | `/api/templates/{id}/submissions/export` | Export template submissions as CSV/XLSX | P2       | Done   |
| POST   | `/api/tools/merge`                | Merge base64 PDFs                           | P2       | Done   |
| POST   | `/api/tools/verify`               | Verify PDF signatures/checksum              | P2       | Done   |
| GET    | `/api/events/form/{type}`         | Form webhook event listing                  | P2       | Done   |
| GET    | `/api/events/submission/{type}`   | Submission webhook event listing            | P2       | Done   |

Implemented dashboard/send compatibility routes:

- `POST /api/submissions/{id}/resend_email`: queues signature-request emails for pending, non-declined submitters with email addresses.
- `POST /api/submitters/{id}/send_email`: queues a signature-request email for one pending submitter.
- `POST /api/send_submission_email`: queues a completed documents-copy email for a completed submitter selected by submitter slug, or by submission/template slug plus email.

## Webhooks

- Form webhook
- Submission webhook
- Template webhook

Implemented management and delivery endpoints:

- `GET /api/webhooks`
- `POST /api/webhooks`
- `GET /api/webhooks/:id`
- `PATCH /api/webhooks/:id`
- `DELETE /api/webhooks/:id`
- `GET /api/webhooks/:id/events`
- `POST /api/webhooks/:id/test`
- `POST /api/webhook-events/:id/resend`

Behavior:

- Account-scoped webhook destinations store URL, event subscriptions, custom secret headers, and HMAC signing secret.
- Deliveries are queued through BullMQ and retried with `WEBHOOK_MAX_ATTEMPTS` and `WEBHOOK_BACKOFF_MS`.
- Requests are signed with `X-Docuseal-Signature` and include DocuSeal-compatible `event_type`, `timestamp`, and `data`.
- Delivery attempts persist response status/body for webhook event observability.
- Webhook events persist outbound payload snapshots for dashboard inspection.
- The settings UI exposes webhook CRUD, test delivery, event filters, payload/attempt detail modal, and manual resend.

Remaining caveat:

- `POST /api/tools/verify` currently verifies Signa-generated checksum presence for completed documents and parses PDF validity; full PDF cryptographic signature/certificate verification is still pending.

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
- Completion stores signer values, signature attachments, and a completion event, then synchronously processes generated result PDFs, completed document checksums, completion tracking records, and audit trail artifacts.

Current Signa implementation:

- `GET /api/signing/:slug` loads the public signing form with submitter, current documents, preview images, fields, values, and readonly values.
- `POST /api/signing/:slug/attachments` stores signer-uploaded signature assets as submitter attachments and validates image content with `sharp`.
- `PUT /api/signing/:slug/values` saves in-progress signer values.
- `POST /api/signing/:slug/complete` validates required values and marks the submitter completed.
- `POST /api/signing/:slug/decline` marks the submitter declined.
- `GET /api/signing/:slug/download` returns generated completed result PDFs once the submitter has completed, and falls back to current template documents before completion.

Remaining parity gaps:

- HexaPDF/PDFium-grade final PDF flattening, annotation preservation, exact typography/layout parity, cryptographic signing, LTV, PDF/A, and timestamp server support.
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

- Mail queue dispatch is wired for submitter invitation, submitter verification, reminders, completed notification, documents copy, and declined emails.
- Signature request email click tracking is implemented through signed public signing URLs and `submission_events.click_email`.
- Email delivery persistence is implemented through `EmailMessage` and `EmailEvent` rows for sent/skipped template deliveries.
- Scheduled reminder dispatch is implemented from account reminder settings and persisted as `submission_events.send_reminder_email`.
- Provider-specific opens/bounces remain pending.
- Account-level email defaults and inheritance need to be reconciled when the notification module is implemented.

### Runtime Utility Foundation

Implemented:

- Nest ScheduleModule for future expiry/cleanup jobs.
- Nest EventEmitterModule for local lifecycle events that map to DocuSeal Sidekiq-triggered workflows.
- BullMQ root configuration with Redis URL, queue prefix, retry/backoff, and retention defaults.
- Bull Board setup guarded by `BULL_BOARD_ENABLED` and basic auth.
- Nest MailerModule SMTP/Handlebars setup for submitter/user/account mailers.
- Reserved queues:
  - `document-generation`
  - `mail`
  - `webhooks`
  - `sms`
  - `maintenance`

Pending:

- Queue processors for document generation, webhooks, SMS, and maintenance jobs.
- Webhook URL/event/attempt persistence and signed delivery.
- Mail delivery status persistence and SMS delivery orchestration.
- Scheduler handlers for submission expiry and cleanup.

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
