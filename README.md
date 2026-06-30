# Signa

Signa is a TypeScript and React document-signing platform built for DocuSeal-compatible signing workflows and API behavior. It uses a NestJS backend, Next.js frontend, TypeORM, PostgreSQL or SQLite, Redis-backed queues, PDF rendering/signing tooling, mail/SMS delivery, webhooks, and shared contracts in a pnpm monorepo.

This scaffold was created from the official framework CLIs:

- Next.js frontend: `pnpm create next-app@latest frontend --yes`
- NestJS backend: `pnpm dlx @nestjs/cli new backend --strict --package-manager pnpm --skip-git`

## Workspace

- `apps/frontend`: Next.js App Router frontend.
- `apps/backend`: NestJS backend API.
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

## Docker Deployment

The default Docker setup mirrors DocuSeal's easy self-hosting shape: run one app container plus Redis, persist data to volumes, and use SQLite unless PostgreSQL credentials are provided.

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- App: `http://localhost:3000`
- API docs: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/api/health`

The compose stack includes:

- `signa`: one image running the Next.js frontend on `3000` and NestJS backend on `3001`.
- `redis`: queue/cache backing service for BullMQ and live background jobs.
- `signa-data`: SQLite database volume at `/data`.
- `signa-storage`: uploaded files and generated PDFs at `/storage`.
- `signa-redis`: Redis persistence.

### Required Production Env Vars

Set these before deploying beyond local testing:

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Yes | At least 32 random characters in production. Used for auth tokens, signed URLs, and OTP signing. |
| `FRONTEND_ORIGIN` | Yes | Public frontend origin, for example `https://signa.example.com`. |
| `API_PUBLIC_URL` | Yes | Public backend API URL, for example `https://api.signa.example.com/api` or `https://signa.example.com/api`. Used in links, storage URLs, mail, SMS, and callbacks. |
| `NEXT_PUBLIC_API_BASE_URL` | Yes at build time | Browser-visible backend base URL, for example `https://api.signa.example.com`. Docker Compose passes this as a build argument. |

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
| `STORAGE_PATH` | No | `/storage` in Docker | File storage root. |
| `ATTACHMENT_INGEST_MAX_BYTES` | No | `10485760` | Max downloaded attachment size. |
| `PDF_PREVIEW_MAX_PAGES` | No | `15` | Max preview pages generated per PDF. |
| `PDF_PREVIEW_MAX_WIDTH` | No | `1400` | Preview image width. |
| `PDF_SIGNATURE_SUBFILTER` | No | `pades` | `pades` uses `ETSI.CAdES.detached`; `adobe` uses legacy Adobe detached signatures. |
| `DOCUMENT_CONVERSION_MAX_BYTES` | No | `15728640` | Max DOCX/HTML conversion input size. |
| `HTML_TO_PDF_TIMEOUT_MS` | No | `30000` | HTML-to-PDF render timeout. |
| `THROTTLE_TTL_MS` | No | `60000` | API rate-limit window. |
| `THROTTLE_LIMIT` | No | `120` | API rate-limit request count. |

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
