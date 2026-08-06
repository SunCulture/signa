import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Braces,
  Database,
  FileCheck2,
  ServerCog,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/landing-sections";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import {
  alternatives,
  alternativesUpdatedAt,
} from "@/lib/alternatives-content";
import { marketingUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "eSignature Software Alternatives",
  description:
    "Compare Signa with DocuSeal, Docusign, PandaDoc, Adobe Acrobat Sign, Dropbox Sign, and SignNow for self-hosting, APIs, embeds, and PDF evidence.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    title: "Self-hosted eSignature software alternatives",
    description:
      "A practical comparison of deployment, APIs, embedding, document workflows, and operational ownership.",
    url: "/alternatives",
  },
};

const decisionPoints = [
  {
    icon: ServerCog,
    title: "Deployment ownership",
    description:
      "Decide whether your team wants a managed service or will own runtime security, upgrades, backups, monitoring, and recovery.",
  },
  {
    icon: Database,
    title: "Data and storage",
    description:
      "Map where source documents, previews, attachments, completed PDFs, audit records, and identity evidence must live.",
  },
  {
    icon: Braces,
    title: "Integration surface",
    description:
      "Compare the exact APIs, webhooks, embed events, mobile support, authentication model, and rate limits your product uses.",
  },
  {
    icon: FileCheck2,
    title: "Evidence requirements",
    description:
      "Test audit exports, PDF signatures, certificate chains, timestamps, validation data, and long-term retention against policy.",
  },
];

const hubJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${marketingUrl}/alternatives#page`,
    url: `${marketingUrl}/alternatives`,
    name: "Signa eSignature software alternatives",
    description:
      "Compare Signa with established document signing platforms across deployment, integration, workflow, and evidence requirements.",
    dateModified: alternativesUpdatedAt,
    isPartOf: {
      "@id": `${marketingUrl}/#website`,
    },
    about: {
      "@id": `${marketingUrl}/#organization`,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: marketingUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Alternatives",
        item: `${marketingUrl}/alternatives`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "eSignature software comparisons",
    itemListElement: alternatives.map((alternative, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${alternative.competitor} alternative`,
      url: `${marketingUrl}/alternatives/${alternative.slug}`,
    })),
  },
];

export default function AlternativesPage() {
  return (
    <>
      <JsonLd data={hubJsonLd} />
      <SiteHeader />
      <div className="site-gutter">
        <main>
          <section>
            <div className="page-frame border-b px-4 pb-20 pt-32 lg:pb-24">
              <p className="eyebrow">Compare signing platforms</p>
              <h1 className="mt-8 max-w-5xl text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-normal text-ink">
                Find the eSignature operating model that fits your stack
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-copy">
                Compare Signa with established signing tools across deployment,
                APIs, embedding, document preparation, audit evidence, PDF
                trust, and day-two operations. These guides are designed to
                clarify fit, not declare one universal winner.
              </p>
            </div>
          </section>

          <section>
            <div className="page-frame px-4 py-16 lg:py-20">
              <div className="flex items-end justify-between gap-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-signa-700">
                    <Boxes className="size-4" />
                    Comparison library
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold tracking-normal text-ink">
                    Review each alternative by the same decision criteria
                  </h2>
                </div>
                <Link
                  href="/guides/deploy-signa-on-premise"
                  className="hidden items-center gap-2 text-sm font-semibold text-ink hover:text-signa-700 md:flex"
                >
                  Review self-hosting
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="mt-10 grid overflow-hidden rounded-lg border bg-line md:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((alternative) => (
                  <article
                    key={alternative.slug}
                    className="relative min-h-72 bg-white p-7"
                  >
                    <Link
                      href={`/alternatives/${alternative.slug}`}
                      className="absolute inset-0 z-10"
                      aria-label={`Compare Signa with ${alternative.competitor}`}
                    />
                    <p className="text-xs font-semibold uppercase text-signa-700">
                      {alternative.category}
                    </p>
                    <h2 className="mt-5 text-xl font-semibold text-ink">
                      {alternative.primaryKeyword}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-copy">
                      {alternative.metaDescription}
                    </p>
                    <span className="absolute bottom-7 left-7 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      Read comparison
                      <ArrowRight className="size-4" />
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
                <div>
                  <p className="eyebrow">Before you shortlist</p>
                  <h2 className="mt-8 text-3xl font-semibold tracking-normal text-ink">
                    Compare the operating model before the feature checklist
                  </h2>
                  <p className="mt-4 text-base leading-7 text-copy">
                    A self-hosted signing platform can improve infrastructure
                    and data control, but it also transfers availability,
                    security, backup, and upgrade work to your team. Validate
                    that tradeoff first.
                  </p>
                </div>
                <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
                  {decisionPoints.map((point) => {
                    const Icon = point.icon;
                    return (
                      <div key={point.title}>
                        <dt className="flex items-center gap-3 text-base font-semibold text-ink">
                          <Icon className="size-5 text-signa-700" />
                          {point.title}
                        </dt>
                        <dd className="mt-3 text-sm leading-6 text-copy">
                          {point.description}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16">
              <div className="flex flex-col justify-between gap-8 rounded-lg bg-ink p-8 text-white md:flex-row md:items-center lg:p-10">
                <div>
                  <p className="text-xs font-semibold uppercase text-mint">
                    Validate with a real workflow
                  </p>
                  <h2 className="mt-4 max-w-2xl text-3xl font-semibold">
                    Test one representative document from upload to verified
                    completion.
                  </h2>
                </div>
                <Link
                  href="/guides/quick-start"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-semibold text-ink"
                >
                  Start the guide
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
