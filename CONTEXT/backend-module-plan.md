# Signa Backend Module Plan

This plan organizes the DocuSeal-compatible backend into Nest feature modules. It is a planning document, not generated code.

Rules for implementation:

- Generate each Nest module with the Nest CLI before edits.
- Keep entities inside the owning feature module.
- Register feature entities with `TypeOrmModule.forFeature([...])` in that module.
- Keep `DatabaseModule` connection-only.
- Add tests per module before moving to the next module.
- Keep request/response contracts in `@repo/shared` as Zod schemas, separate from TypeORM entities.
- Preserve DocuSeal endpoint behavior from `CONTEXT/api-implementation-spec.md`.

## Runtime Utility Module

Purpose: shared infrastructure for DocuSeal-style background work without mixing operational setup into feature modules.

Owns no database entities.

Implemented:

- `RuntimeModule` imports Nest Schedule, EventEmitter, BullMQ, Bull Board, and Mailer.
- Queue config uses Redis URL settings and default retry/backoff/remove policies.
- Queue names are reserved for:
  - `document-generation`
  - `mail`
  - `webhooks`
  - `sms`
  - `maintenance`
- Bull Board is disabled by default and protected with basic auth when enabled.
- Mailer uses SMTP config plus Handlebars templates with inline CSS support.
- Runtime event constants cover submission, submitter, form, and template lifecycle events.
- Runtime job constants cover document generation, mail, webhook, SMS, and maintenance jobs.

Pending:

- Remaining BullMQ processors are owned by the relevant feature modules.
- Mail, SMS, webhook, reminders, submission-expiry, and document-generation processors are implemented for the current supported flows and registered with Bull Board where applicable.
- Remaining maintenance schedules are for cleanup/retry/stale-generation follow-up jobs, not core delivery or document-generation execution.

Tests:

- Runtime config factories are unit tested for queue defaults, disabled Bull Board behavior, mailer defaults, event names, and job names.

## Base Module Order

### 1. Accounts Module

Purpose: tenant root and account-scoped configuration.

Owns:

- `Account`
- `AccountConfig`
- `EncryptedConfig`
- `AccountLinkedAccount`

Responsibilities:

- Account tenant model.
- Account-scoped config lookup.
- Linked testing/production accounts.
- Self-hosted fallback decisions only where explicitly planned.

Tests:

- Account config is always scoped by account.
- Linked account lookup does not leak unrelated accounts.

### 2. Auth Module

Purpose: API-key authentication and tenant context.

Owns:

- `User`
- `AccessToken`

Responsibilities:

- Resolve `X-Auth-Token`.
- Hash and compare API tokens.
- Attach `{ userId, accountId }` tenant context to requests.
- Manage the current user's API token with masked fetch, password-gated reveal, password-gated rotation, and permission updates.
- Enforce API-token permissions in API-key guards before controller logic runs.
- Return DocuSeal-compatible auth errors.
- Register a first-class web account and owner user through JSON API.
- Login with email/password and issue a bearer JWT for web-app routes.
- Reject archived users and archived accounts for both API-token and JWT workflows.

Tests:

- Missing token returns 401 `{ "error": "Not authenticated" }`.
- Invalid token returns 401.
- Valid token resolves user and account.
- Archived users and archived accounts are rejected.
- Tenant-owned services cannot run without tenant context.
- Login rejects invalid credentials.
- Register rejects duplicate email addresses.

### 3. Shared API Module

Purpose: reusable backend API primitives, not business ownership.

Owns no entities.

Responsibilities:

- Pagination parsing.
- DocuSeal error response helpers.
- Request validation pipe using Zod contracts.
- `application_key` to `external_id` alias normalization.
- Cursor behavior: descending `id`, `after` means lower IDs, `before` means greater IDs.

Tests:

- Pagination defaults to limit 10 and caps at 100.
- Validation errors return 422 `{ "error": "<message>" }`.
- Alias normalization preserves `external_id`.

### 4. Storage Module

Purpose: file/blob metadata and signed/proxy URL behavior.

Owns:

- `DocumentBlob`
- `DocumentAttachment`

Responsibilities:

- Store uploaded files.
- Track content type, byte size, checksum, object key, filename.
- Attach blobs to templates, submissions, submitters, and completed documents.
- Generate signed/proxy URLs at the API boundary.

Tests:

- Reject unsupported file types.
- Persist attachment ownership without cross-tenant access.
- URL generation does not expose raw storage internals.

### 5. Document Processing Module

Purpose: PDF/DOCX/HTML processing pipelines.

Owns:

- `DocumentMetadata`

Responsibilities:

- PDF rendering and preview generation with `@hyzyla/pdfium` plus `sharp`.
- PDF field/tag extraction and metadata caching.
- PDF editing/merge spike with `pdf-lib`.
- PDF signing spike with `@signpdf/signpdf`.
- DOCX conversion through LibreOffice worker.
- HTML-to-PDF through Playwright worker.

Tests:

- PDF upload produces preview metadata.
- Unsupported or corrupt documents fail with 422.
- Processing functions are deterministic against fixtures.

### 6. Templates Module

Purpose: reusable signing form endpoints.

Owns:

- `Template`
- `TemplateFolder`
- `TemplateAccess`
- `TemplateSharing`
- `TemplateVersion`
- `TemplateEvent`
- Storage-owned `StorageBlob`
- Storage-owned `StorageAttachment`
- later `DynamicDocument`
- later `DynamicDocumentVersion`

P0 endpoints:

- `GET /api/templates`
- `GET /api/templates/:id`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `DELETE /api/templates/:id`
- `POST /api/templates/pdf`
- `PUT /api/templates/:id/documents`

P1 endpoints:

- `POST /api/templates/docx`
- `POST /api/templates/html`
- `POST /api/templates/:id/clone`
- `POST /api/templates/merge`
- `GET /api/templates/:id/events`
- `GET /api/templates/:id/versions`

Responsibilities:

- List templates with DocuSeal pagination and filters.
- Create blank builder templates.
- Create templates from PDF uploads.
- Update template metadata, roles, submitters, fields, folder, archive state.
- Replace or append template documents.
- Merge templates from multiple existing template ids.
- Archive or permanently delete templates.
- Record template activity and deduplicated version snapshots for audit/debug history.
- Emit template webhook events through Webhooks Module when available.

Current Signa status:

- Metadata endpoints are implemented.
- `documents` serialization uses signed local proxy URLs backed by Storage module blob metadata.
- Archived template listing, restore, and permanent delete account for TypeORM soft-delete behavior by using `withDeleted()` where DocuSeal expects archived records to remain queryable.
- PDF template creation/replacement supports DocuSeal JSON documents with base64/URL files and provided coordinate fields.
- PDF previews are generated with `@hyzyla/pdfium` and `sharp`.
- Standard AcroForm positional extraction is implemented with `pdf-lib`.
- Blank builder template creation is implemented through `POST /api/templates`.
- Blank builder pages are implemented through `PUT /api/templates/:id/documents` with `type=blank`, generating normal PDF attachments with `pdf-lib` and the existing PDFium preview pipeline.
- Frontend `/templates` now reads real backend templates, preserves dashboard view, active/archived/search/folder state in URL params, and supports DocuSeal-style Templates/Submissions switching, upload, folder browsing, modal move, edit, archive, restore, and permanent delete.
- `GET/POST/PUT/DELETE /api/templates/folders` are implemented for account-scoped DocuSeal-style folder paths using the implicit `Default` root folder.
- `POST /api/templates/merge` is implemented with cloned document/previews, schema/field/submitter merge, UUID/reference remapping, role override support, and `template.created` side effects.
- `PUT /api/templates/:id/documents` now supports PDF/DOCX/HTML add, replace, remove, position, and merge semantics.
- `template_events` records template create, clone, merge, update, rename, archive, restore, folder, document, preference, field, schema, submitter, and sharing activity with actor, timestamp, summary, event type, and changed top-level paths.
- `template_versions` stores deduplicated template snapshots for tracked template changes.
- `GET /api/templates/:id/events` and `GET /api/templates/:id/versions` are implemented for dashboard timelines and version inspection.
- Frontend `/templates/:id/edit` now supports backend-backed document list ordering, append, replace, remove, rename, and center-canvas preview rendering.
- Frontend `/templates/:id/edit` now supports DocuSeal-style normalized field placement on preview pages, including click/draw create, page overlays, select, move, resize, delete, and persistence through `PUT /api/templates/:id`.
- Pending for deeper parity: safer content-stream text-tag removal, broader DocuSeal-grade PDF flattening edge cases, and more exhaustive OCSP responder-chain validation. PDF/A is available through the optional Ghostscript/veraPDF adapter, and external customer trust roots are account-managed through `pdf_trust_roots`.
- Template lifecycle webhook enqueue is implemented through the Webhooks module.

Tests:

- Every query is scoped by `account_id`.
- `folder_name` creates or reuses an account-scoped folder.
- `application_key` maps to `external_id`.
- Soft delete sets `archived_at`; permanent delete removes the row.

### 7. Submissions Module

Purpose: signature request endpoints. This is the module shown in the screenshot.

Owns:

- `Submission`
- `SubmissionEvent`
- later `EmailMessage`
- later `DocumentGenerationEvent`
- later `LockEvent`

P0 endpoints:

- `GET /api/submissions` - implemented
- `GET /api/submissions/:id` - implemented
- `GET /api/submissions/:id/documents` - implemented with lazy pending preview PDFs, completed result PDFs, and `merge=true` merged document generation
- `POST /api/submissions` - implemented for single submission creation
- `POST /api/submissions/pdf` - implemented through backing template creation
- `DELETE /api/submissions/:id` - implemented

P1 endpoints:

- `POST /api/submissions/emails`
- `POST /api/submissions/docx`
- `POST /api/submissions/html`

Secondary compatibility endpoints:

- `POST /api/submissions/init`
- `GET /api/templates/:id/submissions`
- `POST /api/templates/:id/submissions`

Responsibilities:

- Create submissions from existing templates.
- Create submissions from PDF uploads by creating backing template data.
- Later create submissions from DOCX and HTML.
- List submissions with filters, search, archived state, and cursor pagination.
- Return full submission details, submitters, documents, values, variables, and events.
- Generate preview/final/merged/audit documents when endpoint behavior requires it.
- Archive or permanently delete submissions.
- Persist `api_complete_form` and public signing completion events; completion now creates generated result documents, completion records, generation events, completed document checksum records, and webhook delivery events.

Tests:

- Reject missing, archived, or fieldless templates.
- Create submission assigns `account_id` from tenant context only.
- List filters by template, status, slug, folder, archived state, and search.
- `GET /documents` returns generated preview PDFs while pending, generated result PDFs when completed, and merged PDFs for `merge=true`.
- Delete supports soft archive and `permanently=true`.

### 8. Submitters Module

Purpose: signer/recipient endpoints.

Owns:

- `Submitter`
- `CompletedSubmitter`
- later `SubmitterVersion`

P0 endpoints:

- `GET /api/submitters` - implemented
- `GET /api/submitters/:id` - implemented
- `PUT /api/submitters/:id` - implemented for metadata/values/preferences/API completion; side effects/result generation pending

Secondary compatibility endpoints:

- `POST /api/submitter_email_clicks`
- `POST /api/submitter_form_views`

Responsibilities:

- List and retrieve submitters with DocuSeal filters and cursor pagination.
- Update signer details, values, metadata, and delivery preferences.
- Complete a submitter through API when requested and persist `api_complete_form`.
- Generate result documents when completed documents are missing. Pending until completed-document generation exists.
- Dispatch email/SMS resend requests. Pending until notification module exists.
- Track email clicks and form views; invitation `click_email` and public `view_form` are implemented through signed public signing links.

Tests:

- Reject updates after completion or decline.
- `completed=true` records `api_complete_form` behavior.
- `application_key` maps to `external_id`.
- Queries are account-scoped through submission/account ownership.

### 9. Completed Documents Module

Purpose: completed output files and checksum state.

Owns:

- `CompletedDocument`

Responsibilities:

- Store signed document outputs.
- Store combined output files.
- Store audit trail output references.
- Support checksum and verification flows.

Tests:

- Completed document lookup is tenant-scoped through submission/submitter ownership.
- Regeneration does not create duplicate active outputs.

### 10. Notifications Module

Purpose: outgoing email/SMS orchestration.

Owns:

- `EmailMessage`
- `EmailEvent`

Responsibilities:

- Send signature request emails/SMS when enabled.
- Send completion notifications.
- Render DocuSeal-compatible Markdown email templates after replacing template, submitter, submission, document, account, and sender variables.
- Store `EmailMessage` and `EmailEvent` delivery records for sent, skipped, and failed template mail.
- Keep provider-specific code behind adapters.

Current Signa status:

- Email template preference editing is implemented in the template editor for signature request, documents copy, and completed notification emails.
- Backend rendering helpers exist for DocuSeal-style `{variable}`/`{{variable}}` replacement and supported Markdown-to-sanitized-HTML conversion.
- Generated `MailModule` owns the first concrete BullMQ `mail` queue processor.
- `MailService` is reusable and queue-friendly, with `MAIL_ENABLED` skip mode, template checks, formatted sender/recipient handling, and SMTP rejected-recipient detection.
- `MailEventListener` maps submitter/form lifecycle events to queued jobs.
- `MailProcessor` currently handles signature request, submitter verification, reminder, completed notification, documents copy, and declined emails, including result-document/audit attachments when generated artifacts are already available.
- Mail queue delivery trace now persists submission/submitter linkage, BullMQ job id, attempt number, provider response, exact failure message/stack, and sent/skipped/failed timestamps on `EmailMessage`.
- `GET /api/submissions/:id/mail-events` exposes delivery trace rows for dashboard/debug visibility.
- `MailReminderScheduler` scans due pending submitters hourly and queues idempotent reminder jobs from account reminder settings. Reminder email copy follows DocuSeal precedence: template-level invitation reminder subject/body, account-level reminder defaults, then built-in defaults.
- Password reset, account SMTP test, user invitation, submitter email OTP, and shared-link template OTP send paths are wired through the reusable MailService. OTP generation/verification uses `otplib` TOTP with DocuSeal-compatible identity derivation.
- Remaining gaps: provider-specific callback signature verification and richer provider delivery dashboards.

Tests:

- `send_email=false` suppresses email.
- `send_sms=false` suppresses SMS.
- Message subject/body overrides are preserved.
- Mail service send/skip/rejected-recipient behavior is covered.
- Mail event-to-queue mapping is covered.
- Reminder scheduler due-job enqueueing is covered.
- Variable replacement and safe Markdown rendering are covered by focused unit tests.

### 11. Webhooks Module

Purpose: webhook configuration and delivery.

Owns:

- `WebhookUrl`
- `WebhookEvent`
- `WebhookAttempt`

Responsibilities:

- Store webhook destinations.
- Queue delivery events.
- Track attempts and response status.
- Support form/submission/template webhook types.

Tests:

- Event enqueue is account-scoped.
- Failed attempts are recorded without blocking API requests.

Implemented:

- Webhook URL CRUD, test delivery, event log, and manual resend APIs.
- BullMQ delivery processor with configured timeout, retry count, backoff, HMAC signature header, and response attempt persistence.
- Runtime event listeners for form, submission, and template events.
- Hourly submission-expiry scheduler that emits `submission.expired`.
- Webhook events persist outbound payload snapshots for event-log inspection.

### 12. Realtime Module

Purpose: dashboard live updates for template, submission, mail, and webhook activity.

Owns:

- `RealtimeService`
- `RealtimeController`
- `RealtimeEventListener`

Responsibilities:

- Expose account-scoped Server-Sent Events through `GET /api/realtime/stream`.
- Authenticate dashboard streams with the current web-session JWT.
- Filter event streams by template, submission, or webhook URL when requested.
- Bridge runtime lifecycle events into realtime dashboard events.
- Publish direct queue/delivery state changes from mail and webhook processors.
- Emit keepalive events so browser/proxy connections remain stable.

Current Signa status:

- Template, submission, and public form lifecycle runtime events publish to SSE.
- Mail sent/skipped/failed trace rows publish realtime delivery events after persistence.
- Webhook delivery status updates publish realtime events after attempt/status persistence.
- Frontend subscriptions are wired for the templates dashboard, template detail, submission detail, and webhooks settings pages.

Tests:

- Realtime service filtering is covered for account/template scoped streams.
- Keepalive events are covered.

### 13. Tools Module

Purpose: secondary utility endpoints after public API stability.

Owns no base entities.

Secondary endpoints:

- `POST /api/tools/merge`
- `POST /api/tools/verify`
- `POST /api/attachments`
- `GET /api/events/form/:type`
- `GET /api/events/submission/:type`
- `GET /api/user`

Responsibilities:

- Merge base64 PDFs.
- Verify PDF signatures/checksums.
- Upload ad hoc attachments.
- List event types for compatibility.
- Return current API user.

Tests:

- Reject invalid base64/PDF payloads.
- Verification responses match DocuSeal-compatible shape.

## Implementation Cadence

For each module:

1. Generate module with Nest CLI.
2. Generate controller/service with Nest CLI only when the module needs them.
3. Add module-local entities.
4. Register entities with `TypeOrmModule.forFeature`.
5. Add Zod contracts in `@repo/shared`.
6. Add unit tests for service policies and API-shape tests for controllers.
7. Run `pnpm --filter backend typecheck`.
8. Run `pnpm --filter backend lint`.
9. Run `pnpm --filter backend test`.
10. Run `pnpm --filter backend build`.

## First Implementation Slice

Start with:

1. Accounts Module.
2. Auth Module.
3. Shared API Module.

Reason:

- Submissions and templates cannot be implemented correctly until tenant context, token auth, pagination, validation, and DocuSeal error shapes are stable.
- This prevents retrofitting account isolation into every endpoint later.

## Implemented Web-App Foundation

DocuSeal sources checked:

- `docuseal/app/controllers/setup_controller.rb`
- `docuseal/app/controllers/sessions_controller.rb`
- `docuseal/app/controllers/profile_controller.rb`
- `docuseal/app/controllers/accounts_controller.rb`
- `docuseal/app/controllers/users_controller.rb`
- `docuseal/app/models/user.rb`
- `docuseal/app/models/account.rb`

Implemented JSON endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/profile`
- `GET /api/profile`
- `PATCH /api/profile`
- `PATCH /api/profile/password`
- `GET/POST/DELETE /api/profile/signature`
- `GET/POST/DELETE /api/profile/initials`
- `GET /api/profile/mfa`
- `POST /api/profile/mfa/setup`
- `POST /api/profile/mfa`
- `DELETE /api/profile/mfa`
- `GET /api/account`
- `PATCH /api/account`
- `DELETE /api/account`
- `GET /api/users`
- `POST /api/users`
- `POST /api/users/import`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET/PATCH /api/account/preferences` includes DocuSeal notification, e-signature, and personalization settings: `receive_completed_email`, `bcc_emails`, `submitter_reminders`, `esigning_preference`, `flatten_result_pdf`, `document_filename_format`, account-level email templates, completed form message/button, policy links, and confetti settings.
- `GET/POST/DELETE /api/account/logo`
- `GET/POST/PATCH/DELETE /api/account/signing-certificates`
- `GET/POST /api/teams`
- `GET/PATCH/DELETE /api/teams/:id`
- `GET/POST /api/teams/:id/members`
- `PATCH/DELETE /api/teams/:id/members/:memberId`
- `GET/POST /api/teams/:id/invitations`
- `DELETE /api/teams/:id/invitations/:invitationId`
- `POST /api/team-invitations/:token/accept`
- Existing public API-key endpoint remains: `GET /api/user`

Notes:

- Local DocuSeal OSS includes users settings routes but no standalone team model/controller. Signa now implements an account-local team model using common workspace best practices: account remains the tenant, team membership is many-to-many, and account role is separate from team role.
- Local DocuSeal OSS only enables `admin` and displays editor/viewer as Pro-gated options. Signa intentionally unlocks `admin`, `editor`, `member`, `viewer`, and `agent`, backed by CASL policy guards and shared role constants.
- `POST /api/users/import` supports bulk user creation/restoration with per-row results from normalized frontend import rows. The frontend now supports manual comma/space-separated emails, CSV parsing, `.xlsx` parsing, sample CSV download, and optional first/last names. Import-time team membership assignment remains pending.
- Team invitation email delivery is wired through MailService; invitation creation stores a token hash, sends the raw accept token by email, and returns the raw accept token only in the create response. Account user creation/import invitations are wired through MailService with password setup tokens.
- Profile signature and initials follow DocuSeal's `UserConfig::SIGNATURE_KEY` / `INITIALS_KEY` pattern and store the active attachment UUID in `user_configs`. Authenticator 2FA is implemented with `otplib`, persisted on user OTP columns, and enforced by `/api/auth/login`.

- Web-app routes use bearer JWT auth.
- Public API compatibility routes continue to use `X-Auth-Token`.
- User deletion is archive-only, matching DocuSeal's web user removal behavior.
- Account deletion archives the account and locks/releases the current user's email, matching DocuSeal's controller behavior.
- Swagger DTOs are documented with `@ApiProperty` and auth schemes.
