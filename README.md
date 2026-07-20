# Signa

Signa is a TypeScript and React document-signing platform built for DocuSeal-compatible signing workflows and API behavior. It uses a NestJS backend, Next.js frontend, TypeORM, PostgreSQL or SQLite, Redis-backed queues, PDF rendering/signing tooling, mail/SMS delivery, webhooks, and shared contracts in a pnpm monorepo.

This scaffold was created from the official framework CLIs:

- Next.js frontend: `pnpm create next-app@latest frontend --yes`
- NestJS backend: `pnpm dlx @nestjs/cli new backend --strict --package-manager pnpm --skip-git`

## Workspace

- `apps/frontend`: Next.js App Router frontend.
- `apps/backend`: NestJS backend API.
- `packages/signa-react`: npm-publishable React embedding package for Signa signing forms and builder workflows.
- `packages/signa-react-native`: npm-publishable React Native WebView package for mobile signing flows.
- `packages/shared`: shared Zod schemas, contracts, and types.
- `packages/ts-config`: shared TypeScript config.

## Local Development

```bash
pnpm install
pnpm dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/api/health`
- Bull Board, when enabled: `http://localhost:3001/queues`

Frontend and backend run as separate servers in development and production because the frontend uses Next.js server routes. Docker starts both processes in one app container for simple deployment.

## React Embed Package

`packages/signa-react` contains the npm-publishable React package for embedding Signa signing forms and builder workflows.
`packages/signa-react-native` contains the npm-publishable React Native package for mobile apps that embed hosted Signa signing flows through `react-native-webview`.

Common package commands:

```bash
pnpm --filter @signajs/react typecheck
pnpm --filter @signajs/react build
pnpm pack:signa-react
pnpm --filter @signajs/react-native typecheck
pnpm --filter @signajs/react-native build
pnpm pack:signa-react-native
```

Basic usage:

```tsx
import { SignaForm } from "@signajs/react";

export function App() {
  return (
    <SignaForm
      host="https://signa.example.com"
      src="https://signa.example.com/s/submitter-slug"
    />
  );
}
```

Publishing notes are documented in `packages/signa-react/README.md`. The current package name is `@signajs/react`, which requires access to the `signajs` npm scope. Package releases use Changesets so version bumps, changelog entries, and npm publishing are reviewed in git before release.
React Native setup notes are documented in `packages/signa-react-native/README.md`. The native package name is `@signajs/react-native` and also requires access to the `signajs` npm scope.

## Versioning and Releases

Signa has two release lanes:

- **Application release:** the deployable Signa app is versioned from the private root `package.json`, git tags, and Docker image tags.
- **Package release:** public npm packages, currently `@signajs/react` and `@signajs/react-native`, are versioned and published with Changesets.

### Application Versioning

Use the root `package.json` `version` as the app semver. A production release should be tagged and built with the matching app metadata:

```bash
git tag app-v0.1.0
git push origin app-v0.1.0

docker build \
  --build-arg APP_VERSION=0.1.0 \
  --build-arg APP_COMMIT_SHA=$(git rev-parse HEAD) \
  --build-arg APP_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t signa:0.1.0 .
```

`APP_VERSION`, `APP_COMMIT_SHA`, and `APP_BUILD_TIME` are optional runtime metadata. When set, they appear in `/api/health`, `/api/health/live`, `/api/health/ready`, and the root API metadata endpoint. They are intentionally separate from npm package versions because the app is deployed as a Docker artifact, not published to npm.

With Docker Compose, set the same values in `.env` before building:

```env
APP_VERSION=0.1.0
APP_COMMIT_SHA=<git-sha>
APP_BUILD_TIME=2026-07-11T10:00:00Z
```

### React Package Versioning

Create a changeset for every user-visible package change:

```bash
pnpm changeset
```

Choose the semver level for the changed package, such as `@signajs/react` or `@signajs/react-native`:

- `patch`: bug fixes and documentation-only runtime clarifications.
- `minor`: backward-compatible props, events, or behavior.
- `major`: breaking prop, event, bundle, peer dependency, or runtime-script changes.

When ready to prepare a release PR:

```bash
pnpm version:packages
pnpm --filter @signajs/react typecheck
pnpm --filter @signajs/react build
pnpm pack:signa-react
pnpm --filter @signajs/react-native typecheck
pnpm --filter @signajs/react-native build
pnpm pack:signa-react-native
```

After the version PR is merged and npm credentials are available:

```bash
pnpm release:packages
```

For CI, prefer npm trusted publishing with provenance enabled so published package tarballs are tied to the GitHub Actions release workflow. The publish workflow should run the same checks, then execute `pnpm release:packages` with npm provenance/trusted-publisher configuration.

## Docker Deployment

The default Docker setup runs one app container with Redis and connects to PostgreSQL configured through environment variables, such as an Amazon RDS endpoint.

```bash
cp docker/.env.ec2.example .env.ec2
# Edit .env.ec2 before starting the deployment.
docker compose --env-file .env.ec2 up --build
```

Then open:

- App: `http://localhost:3000`
- API docs: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/api/health`

The compose stack includes:

- `signa`: one image running the Next.js frontend on `3000` and NestJS backend on `3001`.
- `redis`: queue/cache backing service for BullMQ and live background jobs.
- `signa-storage`: uploaded files and generated PDFs at `/storage`.
- `signa-redis`: Redis persistence.

For an EC2 deployment using native Redis on the host instead of the Compose Redis container, set `REDIS_URL` and `QUEUE_REDIS_URL` to `redis://host.docker.internal:6379` and start Signa with `docker compose up -d --build --no-deps signa`. The default values use the Compose Redis service.

### Required Production Env Vars

Set these before deploying beyond local testing:

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Yes | At least 32 random characters in production. Used for auth tokens, signed URLs, and OTP signing. |
| `FRONTEND_ORIGIN` | Yes | Public frontend origin, for example `https://signa.example.com`. |
| `API_PUBLIC_URL` | Yes | Public backend API URL, for example `https://api.signa.example.com/api` or `https://signa.example.com/api`. Used in links, storage URLs, mail, SMS, and callbacks. |
| `NEXT_PUBLIC_API_BASE_URL` | Yes at build time | Browser-visible backend base URL, for example `https://api.signa.example.com`. Docker Compose passes this as a build argument. |

Optional release metadata:

| Variable | Required | Description |
| --- | --- | --- |
| `APP_VERSION` | No | App semver exposed through health/API metadata. Defaults to the package version fallback. |
| `APP_COMMIT_SHA` | No | Git commit SHA for the deployed artifact. |
| `APP_BUILD_TIME` | No | UTC ISO timestamp for the deployed artifact build. |

For local Docker testing, the compose defaults are already set to:

```env
FRONTEND_ORIGIN=http://localhost:3000
API_PUBLIC_URL=http://localhost:3001/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Database Env Vars

SQLite is used when no PostgreSQL connection is provided.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_TYPE` | No | auto | Use `sqlite` or `postgres`. If empty, Docker uses PostgreSQL only when `DATABASE_URL` or `DATABASE_HOST` is set; otherwise it uses SQLite. |
| `SQLITE_DATABASE_PATH` | No | `/data/signa.sqlite` | SQLite file path inside the container. |
| `SQLITE_SYNCHRONIZE` | No | `true` | TypeORM synchronize for SQLite quick starts. Disable for controlled production migrations. |
| `DATABASE_URL` | Optional | empty | PostgreSQL URL. If set, PostgreSQL is used. |
| `DATABASE_HOST` | Optional | empty | PostgreSQL host. If set without `DATABASE_URL`, PostgreSQL is used. |
| `DATABASE_PORT` | Optional | `5432` | PostgreSQL port. |
| `DATABASE_USER` | Optional | `postgres` | PostgreSQL username. |
| `DATABASE_PASSWORD` | Optional | `postgres` | PostgreSQL password. |
| `DATABASE_NAME` | Optional | `signa` | PostgreSQL database name. |
| `DATABASE_SSL` | Optional | `false` | Enables PostgreSQL SSL. |
| `DATABASE_MIGRATIONS_RUN` | Optional | `false` | Runs TypeORM migrations on container start. |

PostgreSQL example:

```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/signa
SQLITE_SYNCHRONIZE=false
DATABASE_MIGRATIONS_RUN=true
```

### Deployment Recipes

SQLite plus local blob storage is the smallest self-hosted setup. It persists the database in the `signa-data` Docker volume and uploaded files/generated PDFs in the `signa-storage` volume:

```env
DATABASE_TYPE=sqlite
SQLITE_DATABASE_PATH=/data/signa.sqlite
SQLITE_SYNCHRONIZE=true
STORAGE_SERVICE=local
STORAGE_PATH=/storage
```

PostgreSQL plus local blob storage keeps documents on the app host but moves relational data to PostgreSQL:

```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/signa
SQLITE_SYNCHRONIZE=false
DATABASE_MIGRATIONS_RUN=true
STORAGE_SERVICE=local
STORAGE_PATH=/storage
```

PostgreSQL plus S3 is the recommended production shape when the app container should be disposable. Keep the S3 bucket private; Signa serves files through its own signed `/storage/blobs/...` proxy URLs:

```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/signa
SQLITE_SYNCHRONIZE=false
DATABASE_MIGRATIONS_RUN=true
STORAGE_SERVICE=s3
AWS_REGION=eu-west-1
AWS_S3_BUCKET=signa-production-blobs
AWS_S3_PREFIX=production
AWS_S3_SERVER_SIDE_ENCRYPTION=AES256
```

When running on AWS infrastructure, prefer IAM roles or task roles and leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty. For S3-compatible storage such as MinIO, R2, or localstack, set `AWS_S3_ENDPOINT` and, when required by the provider, `AWS_S3_FORCE_PATH_STYLE=true`.

### Queue, Redis, and Cache Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REDIS_URL` | No | `redis://redis:6379` in Docker | Redis connection for cache and runtime health checks. |
| `QUEUE_ENABLED` | No | `true` in Docker | Enables BullMQ workers. Keep enabled for mail, SMS, webhooks, and async processing. |
| `QUEUE_REDIS_URL` | No | same as `REDIS_URL` | Redis connection used by BullMQ. |
| `QUEUE_PREFIX` | No | `signa` | BullMQ key prefix. |
| `QUEUE_DEFAULT_ATTEMPTS` | No | `3` | Default retry attempts. |
| `QUEUE_BACKOFF_MS` | No | `5000` | Default retry backoff. |
| `QUEUE_REMOVE_ON_COMPLETE` | No | `1000` | Number of completed jobs retained. |
| `QUEUE_REMOVE_ON_FAIL` | No | `5000` | Number of failed jobs retained. |
| `CACHE_NAMESPACE` | No | `signa-cache` | Cache namespace. |
| `CACHE_TTL_MS` | No | `3600000` | Cache TTL in milliseconds. |

### Queue Dashboard Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BULL_BOARD_ENABLED` | No | `false` | Enables queue dashboard at `BULL_BOARD_ROUTE`. |
| `BULL_BOARD_ROUTE` | No | `/queues` | Dashboard route on the backend server. |
| `BULL_BOARD_USER` | Required if enabled | `admin` | Basic-auth username. |
| `BULL_BOARD_PASS` | Required if enabled | none | Use a strong password. |

### Mail Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MAIL_ENABLED` | No | `false` | Enables actual SMTP delivery. Disabled still records queue and delivery flow. |
| `MAIL_HOST` | Required if enabled | `localhost` | SMTP host. |
| `MAIL_PORT` | Required if enabled | `1025` | SMTP port. |
| `MAIL_SECURE` | No | `false` | Use TLS for SMTP. |
| `MAIL_AUTH_ENABLED` | No | `false` | Enables SMTP auth. |
| `MAIL_USER` | Required if auth enabled | empty | SMTP username. |
| `MAIL_PASS` | Required if auth enabled | empty | SMTP password. |
| `MAIL_FROM_NAME` | No | `Signa` | Default sender name. |
| `MAIL_FROM_ADDRESS` | Required if mail enabled | `no-reply@signa.com` | Default sender email. Must be valid. |
| `MAIL_REPLY_TO` | No | empty | Optional reply-to address. |
| `MAIL_TEMPLATE_DIR` | No | bundled templates | Override template directory. |
| `MAIL_LOGO_URL` | No | app logo | Logo URL used by mail templates. |
| `MAIL_ASSET_BASE_URL` | No | app assets | Base URL for mail imagery. |
| `MAIL_CALLBACK_SECRET` | No | empty | Secret for provider webhook callbacks. |
| `MAIL_TLS_REJECT_UNAUTHORIZED` | No | `false` | Set `true` for strict SMTP TLS validation. |

Mailpit example for local testing from the host:

```env
MAIL_ENABLED=true
MAIL_HOST=host.docker.internal
MAIL_PORT=1025
MAIL_FROM_ADDRESS=no-reply@signa.local
```

### Google and Microsoft Integrations

Social login OAuth credentials:

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_AUTH_CLIENT_ID` | Optional | Google OAuth client ID for Sign in with Google. |
| `GOOGLE_AUTH_CLIENT_SECRET` | Optional | Google OAuth client secret for backend code exchange. |
| `GOOGLE_AUTH_REDIRECT_URI` | Optional | Frontend callback URL, for example `http://localhost:3000/auth/oauth/google/callback`. |
| `MICROSOFT_AUTH_CLIENT_ID` | Optional | Microsoft Entra application client ID for Microsoft sign-in. |
| `MICROSOFT_AUTH_CLIENT_SECRET` | Optional | Microsoft Entra client secret for backend code exchange. |
| `MICROSOFT_AUTH_REDIRECT_URI` | Optional | Frontend callback URL, for example `http://localhost:3000/auth/oauth/microsoft/callback`. |

Register the exact redirect URLs above with each provider. The backend creates the authorization URL, validates signed `state` and `nonce`, exchanges the code server-side, validates the provider ID token, then returns the normal Signa session.

Server-side OAuth credentials:

| Variable | Required | Description |
| --- | --- | --- |
| `GMAIL_OAUTH_CLIENT_ID` | Optional | Gmail OAuth client ID. |
| `GMAIL_OAUTH_CLIENT_SECRET` | Optional | Gmail OAuth client secret. |
| `GMAIL_OAUTH_REDIRECT_URI` | Optional | Frontend Gmail callback URL. |
| `MICROSOFT_OAUTH_CLIENT_ID` | Optional | Microsoft OAuth client ID. |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | Optional | Microsoft OAuth client secret. |
| `MICROSOFT_OAUTH_REDIRECT_URI` | Optional | Frontend Microsoft callback URL. |

Google Drive Picker frontend build-time credentials:

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Optional | Google OAuth client ID exposed to the browser. |
| `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` | Optional | Google Picker API key. |
| `NEXT_PUBLIC_GOOGLE_PICKER_APP_ID` | Optional | Google Cloud project app ID. |

Configure the OAuth client and API key in Google Cloud Console, enable Google Picker API and Google Drive API, then allow the app origin in OAuth and API key restrictions.

### SMS and Phone Verification Env Vars

| Variable | Required | Description |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token. |
| `TWILIO_VERIFY_SERVICE_SID` | Optional | Twilio Verify service for phone OTP. |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional | Twilio Messaging Service for SMS invitations. |
| `TWILIO_FROM_PHONE` | Optional | Fallback Twilio sender number. |
| `SMS_CALLBACK_SECRET` | Optional | Secret for SMS provider callbacks. |

### Webhook Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `WEBHOOK_TIMEOUT_MS` | No | `10000` | HTTP timeout for webhook deliveries. |
| `WEBHOOK_MAX_ATTEMPTS` | No | `8` | Maximum webhook retry attempts. |
| `WEBHOOK_BACKOFF_MS` | No | `30000` | Base retry backoff. |

### Storage, PDF, Conversion, and Security Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `STORAGE_SERVICE` | No | `auto` | `auto` uses S3 when `AWS_S3_BUCKET` and `AWS_REGION` are configured, otherwise local disk. Use `local` or `s3` to force a backend. |
| `STORAGE_PATH` | No | `/storage` in Docker | Local file storage root, used when the active storage backend is `local`. Existing local blobs remain readable after switching new writes to S3. |
| `AWS_REGION` | Required for S3 | empty | AWS region for the S3 bucket. |
| `AWS_ACCESS_KEY_ID` | Optional | empty | Explicit AWS access key. Leave empty on EC2/ECS/EKS/Lambda-style deployments that use IAM roles. |
| `AWS_SECRET_ACCESS_KEY` | Optional | empty | Explicit AWS secret key. Leave empty when using IAM roles. |
| `AWS_SESSION_TOKEN` | Optional | empty | Temporary session token for STS credentials. |
| `AWS_S3_BUCKET` | Required for S3 | empty | Private S3 bucket used for blob bytes. |
| `AWS_S3_PREFIX` | No | empty | Optional object key prefix, for example `production/blobs`. |
| `AWS_S3_ENDPOINT` | Optional | empty | Custom S3-compatible endpoint for MinIO/R2/localstack. |
| `AWS_S3_FORCE_PATH_STYLE` | No | `false` | Enable path-style URLs for S3-compatible storage that requires it. |
| `AWS_S3_SERVER_SIDE_ENCRYPTION` | Optional | empty | Optional S3 server-side encryption mode: `AES256` or `aws:kms`. |
| `ATTACHMENT_INGEST_MAX_BYTES` | No | `10485760` | Max downloaded attachment size. |
| `PDF_PREVIEW_MAX_PAGES` | No | `15` | Max preview pages generated per PDF. |
| `PDF_PREVIEW_MAX_WIDTH` | No | `1400` | Preview image width. |
| `PDF_SIGNATURE_SUBFILTER` | No | `pades` | `pades` uses `ETSI.CAdES.detached`; `adobe` uses legacy Adobe detached signatures. |
| `PDF_TIMESTAMP_REQUIRED` | No | `false` | When `true`, completed PDF signing fails if no RFC3161 `/DocTimeStamp` can be embedded. Leave `false` to keep TSA optional. |
| `PDF_TIMESTAMP_TIMEOUT_MS` | No | `10000` | Timeout for RFC3161 timestamp server requests. |
| `PDF_LTV_REQUIRED` | No | `false` | When `true`, completed PDF signing fails if OCSP/CRL evidence cannot be collected and embedded into DSS/VRI. |
| `PDF_LTV_HTTP_TIMEOUT_MS` | No | `10000` | Timeout for OCSP/CRL revocation evidence HTTP requests. |
| `PDF_A_ENABLED` | No | `false` | Enables pre-signing PDF/A conversion through an external Ghostscript-compatible binary. |
| `PDF_A_REQUIRED` | No | `false` | When `true`, completed PDF signing fails if PDF/A conversion fails. |
| `PDF_A_LEVEL` | No | `2b` | Requested PDF/A level: `1b`, `2b`, or `3b`. |
| `PDF_A_GHOSTSCRIPT_PATH` | No | `gs` | Ghostscript executable used for PDF/A conversion. |
| `PDF_A_VERAPDF_PATH` | No | `verapdf` | Optional veraPDF executable used for PDF/A validation after conversion. |
| `PDF_A_TIMEOUT_MS` | No | `60000` | Timeout for PDF/A conversion and validation commands. |
| `DOCUMENT_CONVERSION_MAX_BYTES` | No | `15728640` | Max DOCX/HTML conversion input size. |
| `HTML_TO_PDF_TIMEOUT_MS` | No | `30000` | HTML-to-PDF render timeout. |
| `THROTTLE_TTL_MS` | No | `60000` | API rate-limit window. |
| `THROTTLE_LIMIT` | No | `120` | API rate-limit request count. |

## PDF Signing, Verification, and Validation

Signa separates visible document completion from cryptographic PDF validation. The visible form values are rendered onto the PDF first, then the final bytes are signed, enriched with long-term validation evidence, and optionally timestamped.

### Completion and Visual Stamping Flow

1. A submitter fills fields in the signing UI.
2. The backend normalizes the submitted values and renders them onto the source PDF.
3. Supported field values are stamped onto pages before cryptographic signing: text, dates, numbers, checkboxes, radio/select/multiple values, typed/drawn/uploaded signatures, initials, images, and file references where applicable.
4. If account settings require a signature ID, Signa stamps signer identity metadata next to the visible signature.
5. The generated completed PDF bytes are hashed with SHA-256 and stored with the completed document metadata.

This stage is the visual/legal representation of what the signer saw and accepted. Cryptographic signing starts after this stage so later validation covers the completed document bytes.

### Cryptographic Signing Flow

1. Signa loads the account default signing certificate from encrypted account config. Certificates are stored as PKCS#12/PFX material, with a generated Signa default certificate available for self-hosted setups.
2. The backend prepares a PDF signature placeholder with `@signpdf/placeholder-pdf-lib`.
3. The PDF is signed with `@signpdf/signer-p12` and `@signpdf/signpdf`.
4. By default, signatures use the PAdES-compatible `ETSI.CAdES.detached` SubFilter. Set `PDF_SIGNATURE_SUBFILTER=adobe` only for legacy `adbe.pkcs7.detached` compatibility.
5. The CMS `SignedData` covers the PDF `ByteRange`, meaning verification can detect changes to signed PDF bytes.

The CMS signing model follows RFC 5652. The certificate chain and revocation model follow RFC 5280. PAdES PDF signature structure follows ETSI EN 319 142-1.

### RFC3161 Timestamping

Timestamping is optional unless explicitly required.

1. Configure a timestamp server URL in account e-signature settings.
2. Signa validates the timestamp server before saving it.
3. During completed PDF generation, Signa requests an RFC3161 timestamp token after PAdES signing and DSS/VRI evidence embedding.
4. If successful, Signa appends a final `/DocTimeStamp` signature dictionary with `/SubFilter /ETSI.RFC3161`, so the timestamp covers the signed PDF plus embedded validation evidence.
5. Timestamp metadata is stored with the completed document.
6. If `PDF_TIMESTAMP_REQUIRED=true`, signing fails when timestamp evidence cannot be embedded.

This allows deployments with stricter evidence requirements to fail closed while keeping normal self-hosted signing usable without a TSA.

### LTV, OCSP, CRL, DSS, and VRI

Long-term validation is optional unless `PDF_LTV_REQUIRED=true`.

During signing, Signa attempts to collect revocation evidence for signer certificates:

1. Parse the CMS signer certificate chain.
2. For Signa autogenerated self-hosted certificates, generate issuer-signed internal CRL evidence and treat the certificate as good when it is absent from the empty CRL.
3. For uploaded/external certificates, read Authority Information Access extensions for OCSP URLs.
4. Read CRL Distribution Point extensions for CRL URLs.
5. Request OCSP evidence first.
6. Fall back to CRL evidence when OCSP is unavailable.
7. Store raw OCSP/CRL bytes in `pdf_revocation_evidence`, keyed by certificate hash, issuer, serial number, and evidence type.
8. Append a PDF DSS/VRI update after signing without rewriting already signed bytes.

The completed PDF signing order is:

```text
visual stamping -> PAdES CMS signature -> DSS/VRI evidence append -> optional RFC3161 DocTimeStamp
```

The DSS/VRI append is a low-level incremental PDF update:

- `/DSS` is added to the PDF catalog.
- `/Certs` stores DER certificate streams.
- `/OCSPs` stores OCSP response streams.
- `/CRLs` stores CRL streams.
- `/VRI` links the exact signature hash to the evidence streams.
- The update writes a new xref/trailer with `/Prev`, preserving the original signed byte ranges.

Evidence status is explicit:

- `good`: revocation evidence validates and does not report revocation.
- `revoked`: evidence reports the signer certificate as revoked.
- `unknown`: evidence exists but cannot be fully classified.
- `unavailable`: revocation endpoints could not be reached.
- `missing`: no usable OCSP/CRL evidence was available.

If `PDF_LTV_REQUIRED=false`, signing continues when evidence is unavailable and the result records `ltv_status=missing`. If `PDF_LTV_REQUIRED=true`, signing fails unless good revocation evidence can be collected and embedded. Signa autogenerated certificates satisfy this requirement through their issuer-signed internal CRL evidence.

### Verification API Flow

`POST /api/tools/verify` accepts a PDF upload and returns checksum, signature, certificate, timestamp, revocation, and LTV status.

Verification performs these checks:

1. Parse the PDF and detect signature dictionaries.
2. Validate the signature `ByteRange` shape and compute the signed byte-range SHA-256.
3. Compare the full PDF SHA-256 against completed Signa documents and generated artifact metadata.
4. Parse CMS `SignedData` from the PDF `/Contents`.
5. Validate the CMS signed `messageDigest` against the PDF `ByteRange` bytes.
6. Verify the CMS signature over signed attributes.
7. Extract signer certificates and classify the chain as trusted, external, expired, invalid, or missing. Trust anchors include the generated Signa root and any account-uploaded root CA certificates from E-Signature settings.
8. Detect PAdES SubFilter compatibility.
9. Detect RFC3161 `/DocTimeStamp` signatures.
10. Read `/DSS` and `/VRI`.
11. Match the VRI entry to the exact CMS signature hash.
12. Parse embedded DER certificates, OCSP responses, and CRLs.
13. Validate OCSP/CRL signatures and certificate revocation status where evidence is present.
14. Return `ltv_status` as `valid`, `missing`, or `invalid`.

DocuSeal-style verification output includes:

- checksum status,
- signature validity,
- trusted or external certificate status,
- certificate chain,
- matched trust anchor and certificate policy errors,
- signer name,
- signing reason,
- signing time,
- PAdES SubFilter status,
- timestamp-signature presence,
- revocation evidence status,
- LTV status.

### Current Validation Boundaries

Implemented:

- RFC 5652 CMS `SignedData` parsing and verification with PKI.js.
- RFC 5280 certificate extraction, CA/basic-constraints checks, validity-window checks, and chain classification against Signa plus account-uploaded trust roots.
- RFC 6960 OCSP request/response parsing and status checks where certificate endpoints exist.
- CRL parsing and revoked-certificate checks.
- Issuer-signed internal CRL evidence for Signa autogenerated self-hosted certificates.
- PAdES `ETSI.CAdES.detached` SubFilter signing.
- RFC3161 document timestamp append after DSS/VRI embedding.
- Incremental DSS/VRI embedding that preserves signed bytes.
- Verifier-side DSS/VRI matching and evidence validation.

Still tracked as hardening work:

- Optional pre-signing PDF/A conversion through Ghostscript and optional veraPDF validation. This is disabled by default and fails open unless `PDF_A_REQUIRED=true`.
- Account-managed external trust roots for verifying customer/partner PDFs signed by third-party CA hierarchies.
- More exhaustive OCSP responder-chain validation.
- Full HexaPDF/PDFium-grade flattening for every PDF edge case.

### PDF/A Conversion Boundary

PDF/A compliance is handled before cryptographic signing:

```text
visual stamping -> optional PDF/A conversion/validation -> PAdES CMS signature -> DSS/VRI evidence append -> optional RFC3161 DocTimeStamp
```

This order is intentional. PDF/A conversion rewrites PDF structure, so it must happen before the final PAdES signature. Signa records conversion and validation metadata on completed-document artifacts. If Ghostscript or veraPDF is not installed and `PDF_A_REQUIRED=false`, signing continues with `conversionStatus=unavailable`; regulated deployments should install those binaries and set `PDF_A_REQUIRED=true`.

References:

- RFC 5652, Cryptographic Message Syntax: `https://www.rfc-editor.org/rfc/rfc5652`
- RFC 5280, X.509 PKI certificate and CRL profile: `https://www.rfc-editor.org/rfc/rfc5280`
- RFC 6960, Online Certificate Status Protocol: `https://www.rfc-editor.org/rfc/rfc6960`
- RFC 3161, Time-Stamp Protocol: `https://www.rfc-editor.org/rfc/rfc3161`
- ETSI EN 319 142-1, PAdES PDF Advanced Electronic Signatures: `https://www.etsi.org/deliver/etsi_en/319100_319199/31914201/`

### Health Env Vars

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `HEALTH_HEAP_LIMIT_MB` | No | `512` | Heap warning threshold. |
| `HEALTH_REDIS_REQUIRED` | No | `false` | Marks health unhealthy when Redis is unavailable. |
| `HEALTH_REDIS_TIMEOUT_MS` | No | `1000` | Redis health timeout. |
| `API_HEALTH_WINDOW_MS` | No | `300000` | Runtime observability window. |
| `API_SLOW_REQUEST_WARN_MS` | No | `1000` | Slow request warning threshold. |
| `API_HEALTH_P95_DEGRADED_MS` | No | `1000` | Degraded p95 threshold. |
| `API_HEALTH_ERROR_RATE_DEGRADED_PERCENT` | No | `5` | Degraded error-rate threshold. |
| `API_HEALTH_MIN_REQUEST_COUNT` | No | `20` | Minimum requests before degraded error-rate checks. |

### Frontend Build-Time Env Vars

These are read when `next build` runs. Rebuild the Docker image after changing them.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes for production | `http://localhost:3001` | Browser API base URL. |
| `NEXT_PUBLIC_SIGNING_BASE_URL` | No | `http://localhost:3000` in Compose | Public signing-page origin, useful for QR signing links. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Optional | empty | Browser Google OAuth client ID. |
| `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` | Optional | empty | Google Picker API key. |
| `NEXT_PUBLIC_GOOGLE_PICKER_APP_ID` | Optional | empty | Google Picker app ID. |
| `NEXT_OUTPUT` | Optional | empty | Set to `export` only for static export experiments. Do not use for the full app. |

## Direct Docker Run

Use Compose for the normal deployment because Redis is required for production queues. For quick local evaluation with SQLite and no external queue workers:

```bash
docker build -t signa .
docker run --rm --name signa \
  -p 3000:3000 -p 3001:3001 \
  -e JWT_SECRET=replace-with-at-least-32-random-characters \
  -e QUEUE_ENABLED=false \
  -v signa-data:/data \
  -v signa-storage:/storage \
  signa
```

## Production Build Without Docker

```bash
pnpm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm build
NODE_ENV=production JWT_SECRET=replace-with-at-least-32-random-characters pnpm start:backend:prod
pnpm start:frontend
```

For production without Docker, run Redis separately and set `QUEUE_ENABLED=true` plus `QUEUE_REDIS_URL`.
