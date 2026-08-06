# Signa Frontend

The Signa frontend is a Next.js App Router application containing the
authenticated console, public signing flows, and embedded runtime assets. The
marketing, documentation, and journal site lives in
[`apps/marketing`](../marketing/README.md), is deployed independently, and is
available at [signa-docs.vercel.app](https://signa-docs.vercel.app).

Use the [workspace README](../../README.md) for deployment and the
[`@signajs/react`](../../packages/signa-react/README.md) and
[`@signajs/react-native`](../../packages/signa-react-native/README.md) READMEs
for embedding.

## Development

Run commands from the repository root:

```bash
pnpm install
pnpm dev:frontend
```

Open `http://localhost:3000`. During local development the API defaults to
`http://localhost:3001/api`. In the production container, browser requests use
same-origin `/api` and Next.js proxies them to the internal NestJS server.
The root route redirects to `/templates`; the auth guard redirects signed-out
users to login. The product frontend has no landing-page feature flag.
Self-service registration is controlled by the backend `REGISTRATION_MODE`
setting.

## Route Surfaces

- `/templates`, `/submissions`, and `/settings` are authenticated console
  routes.
- `/s/[slug]` and `/d/[slug]` are public signing and template form routes.
- `/api/docs` proxies the generated NestJS OpenAPI explorer.

Requests to the former `/docs`, `/guides`, `/resources`, `/compliance`, and
`/qualified-electronic-signature` routes redirect to
`NEXT_PUBLIC_MARKETING_URL`. The product app no longer owns or bundles the
documentation implementation.

## Build-Time Configuration

Next.js reads these values during `next build`; rebuild the image after
changing them:

| Variable                       | Default | Purpose                                                                  |
| ------------------------------ | ------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`     | empty   | Empty uses same-origin `/api`; set only for a deliberately separate API. |
| `NEXT_PUBLIC_MARKETING_URL`    | `http://localhost:3002` | Marketing and documentation origin used by legacy route redirects. Set it to `https://signa-docs.vercel.app` in production. |
| `NEXT_PUBLIC_SIGNING_BASE_URL` | local   | Public origin used when generating signing and QR links.                 |

Google Picker and OAuth browser variables are documented in the root README
and [`apps/frontend/.env.example`](.env.example).

## Verification

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

The production build is the authoritative check for App Router server/client
boundaries and build-time environment configuration.
