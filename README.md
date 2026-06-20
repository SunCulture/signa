# Signa

Signa is a TypeScript and React recreation of DocuSeal.

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
