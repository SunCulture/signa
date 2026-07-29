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
- [Alternatives](https://signa-docs.vercel.app/alternatives) and focused comparison routes for DocuSeal, Docusign, PandaDoc, Adobe Acrobat Sign, Dropbox Sign, and SignNow

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

## Search Metadata And Brand Icons

The App Router owns the production metadata assets:

- `src/app/favicon.ico`: stable multi-resolution browser and search favicon.
- `src/app/icon.png`: 512px App Router icon.
- `src/app/apple-icon.png`: 180px Apple touch icon.
- `src/app/manifest.ts`: install metadata and 192px/512px application icons.
- `src/app/opengraph-image.tsx`: generated social sharing image.
- `src/app/robots.ts` and `src/app/sitemap.ts`: crawl and canonical URL discovery.
- `src/app/alternatives`: search-intent comparison pages with unique metadata,
  visible FAQs, citations, internal links, and structured data.
- `src/components/seo/json-ld.tsx`: server-rendered JSON-LD for the site,
  breadcrumbs, page collections, comparisons, and FAQs.

The compact favicon uses the quill/nib from the Signa logo without the
handwritten wordmark so it remains identifiable at browser-tab size. Keep the
favicon URL stable and keep `NEXT_PUBLIC_MARKETING_URL` aligned with the
production hostname before deploying.

The alternatives library targets real evaluation intent rather than metadata
keyword stuffing. Keep every comparison factual, cite current first-party
product sources, document where the competitor may be a better fit, and update
`alternativesUpdatedAt` whenever a comparison is materially reviewed.

After the production deployment:

1. Verify a Google Search Console Domain property through DNS.
2. Submit `https://signa-docs.vercel.app/sitemap.xml`.
3. Use URL Inspection to request indexing for `/alternatives` and the initial
   comparison pages.
4. Validate representative pages with Google Rich Results Test and confirm the
   rendered canonical, breadcrumbs, and visible FAQ content.
5. Monitor indexing, queries, page experience, and Core Web Vitals before
   expanding the comparison library.

References:

- [Next.js icon metadata files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)
- [Next.js manifest metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Google Search favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Google people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers)
- [Vercel sitemap guidance for Next.js](https://vercel.com/kb/guide/how-do-i-generate-a-sitemap-for-my-nextjs-app-on-vercel)

## Verification

```bash
pnpm --filter marketing typecheck
pnpm --filter marketing lint
pnpm --filter marketing build
pnpm --filter marketing validate:env
```
