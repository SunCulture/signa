import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Scale,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/landing-sections";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import {
  alternatives,
  alternativesUpdatedAt,
  getAlternative,
  type AlternativePage,
} from "@/lib/alternatives-content";
import { marketingUrl } from "@/lib/site-config";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return alternatives.map((alternative) => ({
    slug: alternative.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const alternative = getAlternative(slug);

  if (!alternative) {
    return {};
  }

  const path = `/alternatives/${alternative.slug}`;

  return {
    title: alternative.title,
    description: alternative.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: alternative.title,
      description: alternative.metaDescription,
      url: path,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: alternative.title,
      description: alternative.metaDescription,
    },
  };
}

function comparisonJsonLd(alternative: AlternativePage) {
  const url = `${marketingUrl}/alternatives/${alternative.slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: alternative.title,
      description: alternative.metaDescription,
      dateModified: alternativesUpdatedAt,
      datePublished: alternativesUpdatedAt,
      isPartOf: {
        "@id": `${marketingUrl}/#website`,
      },
      about: [
        {
          "@type": "SoftwareApplication",
          name: "Signa",
          applicationCategory: "BusinessApplication",
        },
        {
          "@type": "SoftwareApplication",
          name: alternative.competitor,
          applicationCategory: "BusinessApplication",
        },
      ],
      inLanguage: "en",
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
        {
          "@type": "ListItem",
          position: 3,
          name: `${alternative.competitor} alternative`,
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: alternative.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}

export default async function AlternativeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const alternative = getAlternative(slug);

  if (!alternative) {
    notFound();
  }

  const related = alternatives
    .filter((item) => item.slug !== alternative.slug)
    .slice(0, 3);

  return (
    <>
      <JsonLd data={comparisonJsonLd(alternative)} />
      <SiteHeader />
      <div className="site-gutter">
        <main id="main-content" tabIndex={-1}>
          <section>
            <div className="page-frame border-b px-4 pb-16 pt-28 lg:pb-20">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-copy"
              >
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
                <span aria-hidden>/</span>
                <Link href="/alternatives" className="hover:text-ink">
                  Alternatives
                </Link>
                <span aria-hidden>/</span>
                <span className="text-ink">{alternative.competitor}</span>
              </nav>
              <p className="eyebrow mt-12">{alternative.category}</p>
              <h1 className="mt-8 max-w-5xl text-[clamp(2.8rem,7vw,4.5rem)] font-semibold leading-[1.02] tracking-normal text-ink">
                {alternative.headline}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-copy">
                {alternative.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link
                  href="#comparison"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-button"
                >
                  Compare the operating models
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/guides/quick-start"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink shadow-button ring-1 ring-line"
                >
                  Test Signa
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame px-4 py-16 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
                <div>
                  <p className="eyebrow">Why teams compare</p>
                  <h2 className="mt-8 text-3xl font-semibold tracking-normal text-ink">
                    Similar signing outcome, different product boundary
                  </h2>
                  <p className="mt-4 text-base leading-7 text-copy">
                    {alternative.competitorPositioning}
                  </p>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Put this comparison on the shortlist when:
                  </h2>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {alternative.compareWhen.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-6 text-copy"
                      >
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-signa-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="comparison">
            <div className="page-frame border-t px-4 py-16 lg:py-20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-signa-700">
                <Scale className="size-4" />
                Side-by-side
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-normal text-ink">
                Signa and {alternative.shortName} compared by operating
                requirement
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-copy">
                Validate every material requirement against a current release,
                your selected plan or license, and a representative end-to-end
                test. Product capabilities and commercial terms can change.
              </p>

              <div className="mt-10 overflow-hidden rounded-lg border">
                <div className="hidden grid-cols-[0.55fr_1fr_1fr] bg-ink text-sm font-semibold text-white md:grid">
                  <div className="p-4">Decision area</div>
                  <div className="border-l border-white/15 p-4">Signa</div>
                  <div className="border-l border-white/15 p-4">
                    {alternative.competitor}
                  </div>
                </div>
                {alternative.rows.map((row) => (
                  <div
                    key={row.criterion}
                    className="grid border-t first:border-t-0 md:grid-cols-[0.55fr_1fr_1fr]"
                  >
                    <div className="bg-slate-50 p-4 text-sm font-semibold text-ink">
                      {row.criterion}
                    </div>
                    <div className="p-4 text-sm leading-6 text-copy md:border-l">
                      <span className="mb-2 block text-xs font-semibold uppercase text-signa-700 md:hidden">
                        Signa
                      </span>
                      {row.signa}
                    </div>
                    <div className="border-t p-4 text-sm leading-6 text-copy md:border-l md:border-t-0">
                      <span className="mb-2 block text-xs font-semibold uppercase text-signa-700 md:hidden">
                        {alternative.competitor}
                      </span>
                      {row.alternative}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                <div>
                  <p className="text-xs font-semibold uppercase text-signa-700">
                    Signa is strongest when
                  </p>
                  <h2 className="mt-5 text-2xl font-semibold text-ink">
                    Infrastructure ownership is a product requirement
                  </h2>
                  <ul className="mt-6 space-y-4">
                    {alternative.signaBestFor.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-6 text-copy"
                      >
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-signa-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-copy">
                    {alternative.shortName} may be stronger when
                  </p>
                  <h2 className="mt-5 text-2xl font-semibold text-ink">
                    Its established product and service model matches the brief
                  </h2>
                  <ul className="mt-6 space-y-4">
                    {alternative.competitorBestFor.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-6 text-copy"
                      >
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-slate-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
                <div>
                  <p className="eyebrow">Migration path</p>
                  <h2 className="mt-8 text-3xl font-semibold tracking-normal text-ink">
                    Migrate a workflow, not just an API call
                  </h2>
                  <p className="mt-4 text-base leading-7 text-copy">
                    Preserve the business record, signer experience, delivery
                    behavior, evidence, and failure handling before changing
                    production traffic.
                  </p>
                </div>
                <ol className="space-y-7">
                  {alternative.migrationSteps.map((step, index) => (
                    <li key={step} className="flex gap-5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm leading-6 text-copy">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
                <div>
                  <p className="eyebrow">Questions</p>
                  <h2 className="mt-8 text-3xl font-semibold tracking-normal text-ink">
                    Common evaluation questions
                  </h2>
                </div>
                <div className="divide-y border-y">
                  {alternative.faqs.map((faq) => (
                    <section key={faq.question} className="py-7">
                      <h3 className="text-lg font-semibold text-ink">
                        {faq.question}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-copy">
                        {faq.answer}
                      </p>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t px-4 py-16">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Product sources and implementation guides
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {alternative.sources.map((source) => {
                      const external = source.href.startsWith("http");
                      return (
                        <li key={source.href}>
                          <Link
                            href={source.href}
                            className="inline-flex items-center gap-2 text-sm font-medium text-signa-700 hover:text-ink"
                            {...(external
                              ? {
                                  target: "_blank",
                                  rel: "noopener noreferrer",
                                }
                              : {})}
                          >
                            {source.label}
                            {external ? (
                              <ExternalLink className="size-3.5" />
                            ) : (
                              <ArrowRight className="size-3.5" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Continue comparing
                  </h2>
                  <div className="mt-5 grid gap-2">
                    {related.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/alternatives/${item.slug}`}
                        className="flex items-center justify-between border-b py-3 text-sm font-semibold text-ink hover:text-signa-700"
                      >
                        {item.primaryKeyword}
                        <ArrowRight className="size-4" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-14 max-w-4xl border-t pt-6 text-xs leading-5 text-copy">
                {alternative.competitor} and its product names are trademarks
                of their respective owners. Signa is independent and is not
                affiliated with or endorsed by {alternative.competitor}. This
                page uses those names only for factual product comparison.
              </p>
              <Link
                href="/alternatives"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink"
              >
                <ArrowLeft className="size-4" />
                All eSignature alternatives
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
