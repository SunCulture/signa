# Signa Backend

The Signa API is a NestJS application that owns authentication, templates,
submissions, signing, storage, queues, delivery events, PDF processing, and
verification.

Use the [workspace README](../../README.md) for complete deployment,
environment-variable, Docker, SMTP, S3, and signing documentation.

## Development

Run commands from the repository root:

```bash
pnpm install
pnpm dev:backend
```

The default endpoints are:

- API: `http://localhost:3001/api`
- OpenAPI: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/api/health`
- Readiness: `http://localhost:3001/api/health/ready`

The frontend normally accesses the backend through its same-origin `/api`
proxy. Keep port `3001` private in production unless clients intentionally use
the API from a separate origin.

## Database

The backend selects its TypeORM driver from configuration:

- Leave `DATABASE_URL` and legacy `DATABASE_HOST` empty to use SQLite.
- Set `DATABASE_URL=postgresql://...` to use PostgreSQL.
- Legacy `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`,
  `DATABASE_PASSWORD`, and `DATABASE_NAME` remain supported.

SQLite is the zero-configuration single-node option. PostgreSQL is required
when application instances share relational state.

Migration commands:

```bash
pnpm db:migration:run
pnpm db:migration:revert
pnpm db:migration:check
```

## Storage And PDF Previews

Local storage is used when no S3 bucket is configured. Setting
`S3_ATTACHMENTS_BUCKET` enables private S3 storage automatically and uses the
AWS SDK credential provider chain. See the root README before configuring
custom S3-compatible endpoints or static credentials.

PDF upload requests complete only after page previews are generated:

1. Inspect the PDF and detect standard, AcroForm, or XFA processing.
2. Render standard PDFs with PDFium.
3. Use PDF.js for XFA documents and as the PDFium fallback.
4. Store PNG page previews as child attachments.
5. Return signed application proxy URLs rather than public bucket URLs.

An upload that cannot produce any preview page fails explicitly instead of
creating a permanently preview-less template.

## Verification

```bash
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter backend test
pnpm --filter backend build
```

Focused tests can be passed directly to Jest:

```bash
pnpm --filter backend test -- --runInBand src/storage/storage.service.spec.ts
```

Do not edit generated files under `dist`. They are recreated by
`pnpm --filter backend build`.
