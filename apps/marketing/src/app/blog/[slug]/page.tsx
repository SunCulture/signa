import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { BlogCover } from "@/components/marketing/blog-cover";
import { CodePanel } from "@/components/marketing/code-panel";
import {
  SiteFooter,
} from "@/components/marketing/landing-sections";
import { SiteHeader } from "@/components/marketing/site-header";
import { Wordmark } from "@/components/marketing/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { blogPosts, getBlogPost } from "@/lib/blog-content";
import { cn } from "@/lib/utils";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      authors: ["Signa Engineering"],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <div className="site-gutter">
        <main className="pt-[69px]">
          <article>
            <div className="page-frame px-4 pb-16 pt-16 lg:pb-24 lg:pt-20">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-copy transition-colors hover:text-ink"
              >
                <ArrowLeft className="size-4" />
                Back to the journal
              </Link>

              <header className="mt-10">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase text-copy">
                  <span>{post.category}</span>
                  <span className="size-1 rounded-full bg-signa-400" />
                  <time dateTime={post.publishedAt}>{post.dateLabel}</time>
                  <span className="size-1 rounded-full bg-signa-400" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-3.5" />
                    {post.readingTime}
                  </span>
                </div>
                <h1 className="mt-5 max-w-5xl text-[clamp(2.8rem,7vw,4.5rem)] font-semibold leading-[1.03] tracking-normal text-ink">
                  {post.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-copy">
                  {post.excerpt}
                </p>
              </header>

              <BlogCover
                alt={post.title}
                src={post.image}
                sizes="(max-width: 1280px) 100vw, 1120px"
                className="mt-10 aspect-[16/7] min-h-72 rounded-lg bg-cover shadow-card ring-1 ring-line"
              />

              <div className="mt-14 grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(220px,0.7fr)] lg:gap-20">
                <div className="min-w-0">
                  {post.sections.map((section) => (
                    <section
                      key={section.id}
                      id={section.id}
                      className="blog-prose scroll-mt-28 border-t border-line py-9 first:border-t-0 first:pt-0"
                    >
                      <h2>{section.title}</h2>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.bullets ? (
                        <ul>
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                      {section.code ? (
                        <CodePanel
                          code={section.code}
                          className="my-8 max-h-[440px] shadow-none ring-1 ring-line"
                        />
                      ) : null}
                      {section.callout ? (
                        <aside className="mt-7 border-l-2 border-coral-500 bg-coral-100 px-5 py-4 text-sm leading-6 text-coral-800">
                          {section.callout}
                        </aside>
                      ) : null}
                    </section>
                  ))}

                  {post.sources.length > 0 ? (
                    <section className="border-t border-line pt-9">
                      <h2 className="text-xl font-semibold text-ink">
                        Primary references
                      </h2>
                      <ul className="mt-4 space-y-3">
                        {post.sources.map((source) => (
                          <li key={source.href}>
                            <a
                              href={source.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-start gap-2 text-sm font-medium text-signa-700 hover:text-signa-900"
                            >
                              {source.label}
                              <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>

                <aside className="lg:sticky lg:top-28">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-signa-100 ring-1 ring-line">
                      <Wordmark className="h-10 w-10" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Signa Engineering
                      </p>
                      <p className="text-sm text-copy">{post.dateLabel}</p>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-line pt-5">
                    <p className="text-sm font-semibold text-ink">In this guide</p>
                    <nav className="mt-3" aria-label="Article sections">
                      <ul className="space-y-2">
                        {post.sections.map((section) => (
                          <li key={section.id}>
                            <a
                              href={`#${section.id}`}
                              className="text-sm leading-5 text-copy transition-colors hover:text-ink"
                            >
                              {section.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </aside>
              </div>

              <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-line pt-10 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-ink">
                    Build the workflow in Signa
                  </p>
                  <p className="mt-1 text-sm text-copy">
                    Continue with the product guides and API reference.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className={cn(
                    buttonVariants(),
                    "h-10 gap-2 bg-ink text-white hover:bg-signa-800",
                  )}
                >
                  Open the guides
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
