# Signa

Signa is a TypeScript and React document-signing platform built to track
DocuSeal-compatible API and signing workflows. It uses a NestJS backend,
Next.js frontend, TypeORM, PDF rendering/signing tooling, mail/SMS queues,
webhooks, and shared contracts in a pnpm monorepo.

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

In development the frontend and backend run separately. In production the NestJS
backend hosts the built Next.js frontend and API from one process:

- App: `http://localhost:3001`
- API: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`

## Database

PostgreSQL is recommended for production. For small self-hosted deployments or
quick trials, Signa can fall back to file-backed SQLite, matching DocuSeal's
“no database URL means SQLite” deployment shape.

PostgreSQL:

```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/signa
```

SQLite:

```env
DATABASE_TYPE=sqlite
SQLITE_DATABASE_PATH=/app/data/signa.sqlite
```

SQLite is persisted to the Docker volume mounted at `/app/data`. Uploaded files
and generated PDFs are persisted to `/app/storage`.

## Docker Deployment

The simplest deployment uses SQLite:

```bash
cp apps/backend/.env.example .env
docker compose up --build
```

Then open:

- App: `http://localhost:3001`
- API docs: `http://localhost:3001/api/docs`

Minimum production variables to change:

```env
JWT_SECRET=replace-with-at-least-32-random-characters
API_PUBLIC_URL=https://your-domain.com/api
FRONTEND_ORIGIN=https://your-domain.com
MAIL_ENABLED=true
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_AUTH_ENABLED=true
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM_ADDRESS=no-reply@your-domain.com
```

To use PostgreSQL instead of SQLite, provide Postgres settings to the container:

```yaml
environment:
  DATABASE_TYPE: postgres
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/signa
```

Build a production image directly:

```bash
docker build -t signa .
docker run --rm -p 3001:3001 \
  -e JWT_SECRET=replace-with-at-least-32-random-characters \
  -v signa-data:/app/data \
  -v signa-storage:/app/storage \
  signa
```

## Production Build Without Docker

```bash
pnpm install
NEXT_PUBLIC_API_BASE_URL= pnpm build
NODE_ENV=production pnpm start:backend:prod
```

Use `NEXT_PUBLIC_API_BASE_URL=` for same-origin API calls. The frontend will call
`/api`, and Nest will serve both the Next.js frontend and backend API.
