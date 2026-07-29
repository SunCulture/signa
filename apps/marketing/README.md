# Signa Marketing

This workspace is the standalone Signa marketing, documentation, journal, and
licensing website. It is a full-stack Next.js App Router application intended
for independent Vercel deployment. Product data remains in the Signa
application; newsletter and future licensing records use Supabase.

Production: [https://signa-docs.vercel.app](https://signa-docs.vercel.app)

The landing page retains the approved editorial layout and responsive behavior
while presenting Signa's implemented template, submission, embedding,
webhook, compliance, and self-hosting capabilities. Examples and CTA routes
are aligned with the product application and documentation.

The app uses Tailwind CSS v4, shadcn/Base UI primitives, local Geist fonts, and
server-rendered Shiki syntax highlighting. Static marketing pages are
prerendered by Next.js.

Public documentation is owned by this workspace:

- [Documentation](https://signa-docs.vercel.app/docs), [API](https://signa-docs.vercel.app/docs/api), [embedding](https://signa-docs.vercel.app/docs/embedding), and [webhooks](https://signa-docs.vercel.app/docs/webhooks)
- [Guides](https://signa-docs.vercel.app/guides) and generated guide detail routes
- [Resources](https://signa-docs.vercel.app/resources) and generated resource detail routes
- [Compliance](https://signa-docs.vercel.app/compliance) and [qualified electronic signatures](https://signa-docs.vercel.app/qualified-electronic-signature)

The product frontend redirects its former documentation URLs here.

## Development

From the repository root:

```bash
pnpm install
cp apps/marketing/.env.example apps/marketing/.env.local
pnpm dev:marketing
```

Open `http://localhost:3002`.

## Supabase

Configure the server-side project URL and secret:

```env
NEXT_PUBLIC_MARKETING_URL=https://signa-docs.vercel.app
NEXT_PUBLIC_APP_URL=https://app.example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY` is server-only and is used by
`POST /api/newsletter`. The subscriber table has RLS enabled, grants no access
to `anon` or `authenticated`, and can only be changed through this validated
Route Handler. Supabase is required for newsletter submissions, but its
availability does not block static marketing and documentation builds.

Apply the committed schema after linking the marketing workspace to a Supabase
project:

```bash
cd apps/marketing
pnpm dlx supabase@latest link --project-ref your-project-ref
pnpm dlx supabase@latest db push
```

The migration is stored in `supabase/migrations`.

## Vercel

Import the repository as a new Vercel project and set the project Root
Directory to `apps/marketing`. Keep the detected framework as Next.js and the
detected package manager as pnpm. Vercel reads the workspace and lockfile from
the repository root, so custom install, build, and output commands are not
needed. The workspace pins Node.js 24 through `package.json`.

Configure these variables for both Preview and Production:

```env
NEXT_PUBLIC_MARKETING_URL=https://signa-docs.vercel.app
NEXT_PUBLIC_APP_URL=https://app.example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`NEXT_PUBLIC_MARKETING_URL` is the canonical public origin. Preview builds
should continue to use the production marketing origin for canonical metadata.
The production build does not contact Supabase or require its credentials.
After configuring all deployment variables, validate them explicitly with:

```bash
pnpm --filter marketing validate:env
```

Apply the Supabase migration before enabling the production domain. After the
first deployment, verify `/robots.txt`, `/sitemap.xml`, one documentation page,
one journal article, the product sign-in link, and a newsletter subscription.

## Verification

```bash
pnpm --filter marketing typecheck
pnpm --filter marketing lint
pnpm --filter marketing build
pnpm --filter marketing validate:env
```
