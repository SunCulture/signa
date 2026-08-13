import type { Metadata } from "next";

import { BlogIndexClient } from "@/components/marketing/blog-index-client";
import { SiteFooter } from "@/components/marketing/landing-sections";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { Reveal } from "@/components/marketing/reveal";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Practical guides for building, embedding, operating, and verifying trustworthy electronic-signature workflows with Signa.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "The Signa Journal",
    description:
      "Engineering and operating guides for trustworthy document-signing workflows.",
    url: "/blog",
  },
};

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <div className="site-gutter">
        <main className="pt-[69px]" id="main-content" tabIndex={-1}>
          <section>
            <div className="page-frame px-4 pb-12 pt-24 lg:pt-28">
              <div className="grid items-end gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Reveal initialVisible className="lg:col-span-2">
                  <h1 className="text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-normal text-ink">
                    Latest news
                  </h1>
                  <p className="mt-4 max-w-lg text-lg font-medium leading-7 text-ink md:text-xl">
                    Product updates and practical guidance for trustworthy
                    electronic-signature workflows.
                  </p>
                </Reveal>
                <Reveal initialVisible delay={120}>
                  <NewsletterForm source="blog_header" />
                </Reveal>
              </div>
            </div>
          </section>

          <section>
            <div className="page-frame border-t border-line px-4">
              <BlogIndexClient />
            </div>
          </section>

          <section className="relative overflow-hidden">
            <div className="page-frame border-t border-line px-4 py-12">
              <div className="grid items-end gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Reveal className="lg:col-span-2">
                  <h2 className="max-w-3xl text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-none tracking-normal text-ink">
                    Subscribe to the Signa journal
                  </h2>
                  <p className="mt-4 max-w-lg text-lg font-medium leading-7 text-ink md:text-xl">
                    Get product updates, implementation guidance, and document
                    trust research from the Signa team.
                  </p>
                </Reveal>
                <Reveal delay={120}>
                  <NewsletterForm
                    label="Email address"
                    source="blog_footer"
                  />
                </Reveal>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
