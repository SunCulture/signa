# Signa Frontend

The Signa frontend is a Next.js App Router application containing the
authenticated console, public signing flows, embedded runtime assets, landing
page, and public documentation.

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

## Route Surfaces

- `/templates`, `/submissions`, and `/settings` are authenticated console
  routes.
- `/s/[slug]` and `/d/[slug]` are public signing and template form routes.
- `/docs`, `/guides`, `/resources`, `/compliance`, and
  `/qualified-electronic-signature` are public documentation routes.
- `/docs/api`, `/docs/embedding`, and `/docs/webhooks` provide developer
  onboarding.
- `/api/docs` proxies the generated NestJS OpenAPI explorer.

Public documentation must remain outside the auth redirect guard so users can
self-onboard before creating an account.

## Build-Time Configuration

Next.js reads these values during `next build`; rebuild the image after
changing them:

| Variable                       | Default | Purpose                                                                  |
| ------------------------------ | ------- | ------------------------------------------------------------------------ |
| `SHOW_LANDING_PAGE`            | `false` | Redirect `/` to login on-prem; set `true` to expose the marketing page.  |
| `NEXT_PUBLIC_API_BASE_URL`     | empty   | Empty uses same-origin `/api`; set only for a deliberately separate API. |
| `NEXT_PUBLIC_SIGNING_BASE_URL` | local   | Public origin used when generating signing and QR links.                 |

Google Picker and OAuth browser variables are documented in the root README
and `.env.example`.

## Verification

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

The production build is the authoritative check for App Router server/client
boundaries, generated static documentation routes, and build-time environment
configuration.
