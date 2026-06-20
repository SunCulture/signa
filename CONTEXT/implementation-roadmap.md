# Signa Implementation Roadmap

This plan covers the next major build phase before endpoint implementation.

Confirmed choices:

- Backend framework: NestJS.
- ORM: TypeORM.
- Database: PostgreSQL.
- API contracts: Zod in `@repo/shared`.
- Tenancy: DocuSeal-style account-based row isolation.

Primary sources:

- Nest TypeORM recipe: https://docs.nestjs.com/recipes/sql-typeorm
- TypeORM docs: https://typeorm.io/
- DocuSeal schema: `../../docuseal/db/schema.rb`
- DocuSeal models: `../../docuseal/app/models/*`
- DocuSeal OpenAPI: `../../docuseal/docs/openapi.json`

## Implementation Sequence

### Phase 1: Database Foundation

Goal: install and wire TypeORM/Postgres without introducing business behavior yet.

Module boundary:

- `DatabaseModule` is connection-only.
- Do not store application entities in `src/database`.
- Each entity belongs beside its owning Nest feature module and is registered with that module's `TypeOrmModule.forFeature([...])`.
- DocuSeal's `db/schema.rb` is an implementation reference for shape and indexes, not a folder-structure template.

Steps:

1. Install backend dependencies:
   - `@nestjs/typeorm`
   - `typeorm`
   - `pg`
   - `@nestjs/config`
   - `@nestjs/throttler`
   - `@nestjs/cache-manager`
   - `cache-manager`
   - `cacheable`
   - `@keyv/redis`
   - `joi`
2. Add backend environment variables:
   - `DATABASE_HOST`
   - `DATABASE_PORT`
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `DATABASE_NAME`
   - `DATABASE_SSL`
   - `DATABASE_LOGGING`
   - `REDIS_URL`
   - `CACHE_NAMESPACE`
   - `CACHE_TTL_MS`
   - `THROTTLE_TTL_MS`
   - `THROTTLE_LIMIT`
3. Configure `TypeOrmModule.forRootAsync`.
4. Keep `synchronize: false` in every environment.
5. Add migration scripts:
   - `db:migration:create`
   - `db:migration:generate`
   - `db:migration:run`
   - `db:migration:revert`
6. Add a TypeORM data source file for CLI migrations.
7. Use snake_case database names through explicit table/column names or a naming strategy.
8. Configure global `ConfigModule` with cached env reads, variable expansion, and Joi validation.
9. Configure global throttling through `ThrottlerModule` plus `APP_GUARD`.
10. Configure global cache with in-memory default and Redis-backed `Cacheable` when `REDIS_URL` is set.
11. Do not create migration files in agent work; only entities and migration commands.
12. Add entities incrementally with the owning feature module, not as a centralized schema dump.

Acceptance checks:

- Backend starts with TypeORM configured.
- `pnpm --filter backend typecheck` passes.
- `pnpm --filter backend lint` passes.
- `pnpm --filter backend build` passes.
- `src/database` contains connection/data-source files only, not feature entities.
- A no-op migration command can discover the data source.

### Phase 1.5: Runtime Utility Foundation

Goal: add the operational foundation needed for DocuSeal-compatible async work before wiring side effects into business services.

Implemented:

1. Installed backend dependencies:
   - `@nestjs/schedule`
   - `@nestjs/event-emitter`
   - `@nestjs/bullmq`
   - `bullmq`
   - `@bull-board/nestjs`
   - `@bull-board/express`
   - `express-basic-auth`
   - `@nestjs-modules/mailer`
   - `nodemailer`
   - `handlebars`
2. Added backend environment variables for queue Redis, Bull Board, SMTP, webhook retry defaults, and Twilio Verify placeholders.
3. Added `RuntimeModule` with `ScheduleModule`, `EventEmitterModule`, `BullModule`, `BullBoardModule`, and `MailerModule`.
4. Added queue, mailer, Bull Board, event-name, and job-name config files instead of expanding `AppModule`.
5. Added runtime config unit tests.

Pending after this phase:

- Register remaining concrete queues with processors once the owning feature module exists. The first mail queue processor now exists in `MailModule`.
- Implement webhook URL/event/attempt entities and processors.
- Expand mail notification processors with delivery persistence, reminders, user/account emails, provider open/bounce tracking, and remaining tracked-link flows; implement SMS notification processors.
- Implement scheduled submission expiry and cleanup processors.
- Wire generated-document work into BullMQ instead of only lazy in-request generation.

### Phase 2: Core Tenant/Auth Schema

Goal: establish account isolation before any public endpoint logic.

Entities:

- `Account`
- `User`
- `AccessToken`
- `AccountConfig`
- `EncryptedConfig`
- `AccountLinkedAccount`

Rules:

- `Account` is the tenant root.
- `User` belongs to one account.
- `AccessToken` belongs to user and stores a SHA-256 hash for lookup.
- Do not store plaintext API keys except at creation time if absolutely needed; prefer one-time reveal.
- `AccountConfig` stores account-scoped non-secret JSON values.
- `EncryptedConfig` stores account-scoped secret values.
- `AccountLinkedAccount` models production/testing account pairs.

DocuSeal compatibility notes:

- API auth uses `X-Auth-Token`.
- API token lookup hashes the incoming token and resolves user/account.
- Testing account mismatch should produce a wrong-environment style authorization error without leaking cross-tenant records.

Acceptance checks:

- API guard can resolve tenant context.
- Tenant-owned repository helpers require `accountId`.
- No tenant-owned lookup uses `findOne({ id })` alone.

### Phase 3: Core Signing Domain Schema

Goal: model the public API P0 resources.

Entities:

- `TemplateFolder`
- `Template`
- `Submission`
- `Submitter`
- `SubmissionEvent`
- `DocumentBlob`
- `DocumentAttachment`
- `DocumentMetadata`
- `CompletedDocument`
- `CompletedSubmitter`

Recommended Signa storage model:

- Do not copy Rails Active Storage table names exactly unless needed for API compatibility.
- Use Rails-like concepts:
  - `document_blobs`: physical object metadata.
  - `document_attachments`: polymorphic attachment rows with `record_type`, `record_id`, `name`, `blob_id`, `uuid`.
- Keep signed/proxy URL behavior at the API boundary.

DocuSeal fields to preserve:

- `slug` as external public identifier.
- `uuid` where DocuSeal uses it for submitters/documents/attachments.
- `external_id`, exposed as `application_key`.
- `archived_at` for soft archive.
- JSON arrays/objects for `fields`, `schema`, `submitters`, `preferences`, `values`, `metadata`, `variables`.

Postgres type choices:

- Use `jsonb` for DocuSeal Rails `text` columns serialized as JSON.
- Use `timestamptz` for time fields.
- Use `bigint` generated IDs for easiest DocuSeal ID compatibility.
- Keep globally unique slugs unless we later prove DocuSeal only requires account-local uniqueness.

Acceptance checks:

- Migrations create indexes matching API query patterns:
  - `(account_id, id)` for tenant paginated lists.
  - `(account_id, template_id, id)` for submission lists.
  - `(account_id, folder_id, id)` for template lists.
  - slug indexes for public form routes.
  - external_id indexes for API lookups.

### Phase 4: Secondary Domain Schema

Goal: add tables needed after P0 endpoint behavior is stable.

Entities:

- `WebhookUrl`
- `WebhookEvent`
- `WebhookAttempt`
- `TemplateVersion`
- `SubmitterVersion`
- `DynamicDocument`
- `DynamicDocumentVersion`
- `EmailMessage`
- `EmailEvent`
- `SearchEntry`
- `DocumentGenerationEvent`
- `LockEvent`

Notes:

- Webhook tables are needed before reliable event delivery.
- Search entries can wait until list/search endpoints need DocuSeal-like search behavior.
- Dynamic document versions are needed for full HTML/DOCX variable workflows.

## DocuSeal To Signa Data Model Mapping

### Tenant/Auth

| DocuSeal table            | Signa entity           | Phase | Notes                                                            |
| ------------------------- | ---------------------- | ----- | ---------------------------------------------------------------- |
| `accounts`                | `Account`              | 2     | Tenant root.                                                     |
| `users`                   | `User`                 | 2     | Belongs to account.                                              |
| `access_tokens`           | `AccessToken`          | 2     | Hash token for lookup.                                           |
| `account_configs`         | `AccountConfig`        | 2     | JSON value.                                                      |
| `encrypted_configs`       | `EncryptedConfig`      | 2     | Secret JSON value.                                               |
| `account_linked_accounts` | `AccountLinkedAccount` | 2     | Testing/prod account links.                                      |
| `account_accesses`        | Optional later         | 4     | Cross-account user access; not needed for first public API pass. |

### Public API Domain

| DocuSeal table               | Signa entity         | Phase | Notes                             |
| ---------------------------- | -------------------- | ----- | --------------------------------- |
| `template_folders`           | `TemplateFolder`     | 3     | Hierarchical folders.             |
| `templates`                  | `Template`           | 3     | Core reusable signing form.       |
| `submissions`                | `Submission`         | 3     | Signature request.                |
| `submitters`                 | `Submitter`          | 3     | Signer/recipient.                 |
| `submission_events`          | `SubmissionEvent`    | 3     | Audit/event trail.                |
| `active_storage_blobs`       | `DocumentBlob`       | 3     | Storage object metadata.          |
| `active_storage_attachments` | `DocumentAttachment` | 3     | Attachment relation.              |
| `document_metadata`          | `DocumentMetadata`   | 3     | Extracted text/geometry cache.    |
| `completed_documents`        | `CompletedDocument`  | 3     | Signed result checksum.           |
| `completed_submitters`       | `CompletedSubmitter` | 3     | Completion summary/search helper. |

### Later Scope

| DocuSeal table              | Signa entity             | Phase | Notes                        |
| --------------------------- | ------------------------ | ----- | ---------------------------- |
| `webhook_urls`              | `WebhookUrl`             | 4     | Event destination config.    |
| `webhook_events`            | `WebhookEvent`           | 4     | Event queue/delivery state.  |
| `webhook_attempts`          | `WebhookAttempt`         | 4     | Delivery attempts.           |
| `template_versions`         | `TemplateVersion`        | 4     | Version history.             |
| `submitter_versions`        | `SubmitterVersion`       | 4     | Submitter snapshots.         |
| `dynamic_documents`         | `DynamicDocument`        | 4     | HTML/DOCX dynamic templates. |
| `dynamic_document_versions` | `DynamicDocumentVersion` | 4     | Dynamic document revisions.  |
| `search_entries`            | `SearchEntry`            | 4     | Full-text/ngram search.      |
| `email_messages`            | `EmailMessage`           | 4     | Custom email bodies.         |
| `email_events`              | `EmailEvent`             | 4     | Provider bounce/open/click metadata.  |

## Zod Contract Plan

Do this after the core entities are sketched but before controllers.

Package layout:

```text
packages/shared/src/
  common/
    api-response.ts
    pagination.ts
    timestamps.ts
  templates/
    template.schemas.ts
    template-api.schemas.ts
  submissions/
    submission.schemas.ts
    submission-api.schemas.ts
  submitters/
    submitter.schemas.ts
    submitter-api.schemas.ts
  documents/
    document.schemas.ts
  index.ts
```

Rules:

- Zod schemas are the public API contract source.
- Backend DTOs should validate against Zod or be generated from these schemas.
- Frontend imports inferred types from `@repo/shared`.
- Keep persistence entities separate from API response schemas.
- Preserve DocuSeal field names in API schemas, including snake_case names.
- Expose `application_key` as an alias for `external_id` where DocuSeal does.

Initial schemas:

- `paginationQuerySchema`
- `paginationResponseSchema`
- `apiErrorSchema`
- `documentSchema`
- `templateSchema`
- `templateListResponseSchema`
- `createTemplateFromPdfSchema`
- `updateTemplateSchema`
- `submissionSchema`
- `submissionListResponseSchema`
- `createSubmissionSchema`
- `createSubmissionFromPdfSchema`
- `submitterSchema`
- `updateSubmitterSchema`

## Storage And Signed URL Strategy

DocuSeal uses Active Storage concepts: blobs, attachments, proxy URLs, preview image attachments, and per-account expiry config.

Recommended Signa first pass:

- Use local filesystem storage in development.
- Implement a storage adapter interface:
  - `putObject`
  - `getObject`
  - `deleteObject`
  - `createSignedUrl`
  - `createProxyUrl`
- Add S3-compatible implementation before production deployment.
- Store object metadata in `document_blobs`.
- Store relationships in `document_attachments`.
- Use proxy routes for DocuSeal-like URLs and auth/expiry controls.

Signed/proxy URL rules:

- Default expiry should mirror DocuSeal's account-config-driven behavior.
- Download auth should be account-configurable.
- Never expose raw storage keys as durable public API identifiers.

## PDF/DOCX/HTML Library Decision

DocuSeal's Ruby stack:

- `hexapdf`: PDF parsing/editing/forms/flattening/signing/PDF-A/importing pages/signature verification.
- Custom `Pdfium` FFI wrapper: page rendering, text/object geometry, bitmap generation, page transforms, flattening, save/import operations.
- `ruby-vips`: image processing.
- `Marcel`: MIME detection.
- LibreOffice-like document conversion behavior for office formats.
- Active Storage for blob/attachment handling.

### Can We Use The Exact Same Library?

Not directly in Node/Nest. HexaPDF is a Ruby gem and there is no maintained TypeScript/Node port.

Exact parity options:

1. Run a Ruby document-worker sidecar that uses HexaPDF exactly.
2. Reimplement with Node-native libraries and accept a compatibility validation phase.
3. Use a commercial PDF SDK for full parity or better, if licensing is acceptable later.

For a TypeScript-first open-source build, option 2 is the default, but we should keep option 1 as a fallback if digital signature/PDF-A/form flattening parity fails.

### Recommended Open-Source Stack

| Need                             | Recommended package/service                                                    | Reason                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| PDF page rendering/previews      | `@hyzyla/pdfium` + `sharp`                                                     | Maintained PDFium WASM wrapper, works in Node, pairs directly with sharp for PNG/JPEG output.                                |
| Image processing                 | `sharp`                                                                        | Maintained libvips-backed Node package; closest match to DocuSeal `ruby-vips`.                                               |
| PDF creation/editing/merge/forms | `pdf-lib` first pass                                                           | Good TypeScript API, but last npm modification is old; use for simple PDF manipulation only until parity tests prove enough. |
| PDF signatures                   | `@signpdf/signpdf` + placeholder package                                       | Maintained replacement for deprecated `node-signpdf`; still needs parity testing against HexaPDF signatures.                 |
| PDF text/object extraction       | Start with `@hyzyla/pdfium`; evaluate `pdfium-native` if WASM lacks APIs       | DocuSeal relies on PDFium object/text geometry. Native bindings may expose lower-level APIs.                                 |
| MIME detection                   | `file-type`                                                                    | Maintained byte-sniffing package.                                                                                            |
| ZIP extraction                   | `yauzl`                                                                        | Maintained and conservative; supports size-limited streaming patterns.                                                       |
| DOCX to PDF                      | LibreOffice/soffice worker via `libreoffice-convert` or direct process wrapper | Most faithful open-source conversion path. Run outside request path.                                                         |
| HTML to PDF                      | Playwright/Chromium                                                            | Maintained, deterministic enough for server-side HTML-to-PDF, and already broadly used.                                      |
| Browser PDF display/signing UI   | `pdfjs-dist` or React PDF viewer using PDF.js                                  | Client-side display/coordinate picking; backend rendering should still use PDFium for server parity.                         |

### Package Health Snapshot

Checked on 2026-06-18:

- `@hyzyla/pdfium` 2.1.13, modified 2026-05-12.
- `pdfium-native` 0.5.5, modified 2026-04-25.
- `@embedpdf/pdfium` 2.14.4, modified 2026-06-08.
- `sharp` 0.35.1, modified 2026-06-18.
- `pdf-lib` 1.17.1, modified 2022-05-12.
- `@signpdf/signpdf` 3.3.0, modified 2025-12-29.
- `pdfjs-dist` 6.0.227, modified 2026-05-30.
- `playwright` 1.61.0, modified 2026-06-18.
- `libreoffice-convert` 1.8.1, modified 2026-01-29.
- `file-type` 22.0.1, modified 2026-04-09.
- `yauzl` 3.4.0, modified 2026-06-07.

### Decision

Use a modular document pipeline instead of betting on one PDF package:

1. `@hyzyla/pdfium` + `sharp` for rendering previews.
2. `pdf-lib` for simple creation/merge/form manipulation only where tests prove parity.
3. `@signpdf/signpdf` for signing experiments.
4. Keep a `DocumentEngine` interface so we can swap in `pdfium-native`, a Ruby HexaPDF worker, or a commercial SDK for hard parity gaps.
5. Use LibreOffice in a background worker for DOCX conversion.
6. Use Playwright in a background worker for HTML-to-PDF.

Known risk:

- No current open-source Node stack is a guaranteed 1:1 HexaPDF replacement for signing, PDF/A, AcroForm flattening, and signature verification. We must build fixture-based parity tests from DocuSeal sample PDFs before declaring the stack final.

## Immediate Next Steps

1. Add TypeORM/Postgres dependencies and backend configuration.
2. Add a Docker Compose Postgres service or documented local Postgres env.
3. Create Phase 2 tenant/auth entities and migrations.
4. Create tenant-context guard for `X-Auth-Token`.
5. Create Phase 3 core domain entities and migrations.
6. Create initial Zod schemas in `@repo/shared`.
7. Build a document-engine spike with `@hyzyla/pdfium` + `sharp` against DocuSeal fixture PDFs.
8. Build a signing spike with `@signpdf/signpdf`.
9. Decide whether a Ruby HexaPDF worker is needed based on fixture parity.
