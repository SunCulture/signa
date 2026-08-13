import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/marketing/wordmark";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="site-gutter min-h-svh" id="main-content" tabIndex={-1}>
      <article className="page-frame min-h-svh px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <Link href="/" aria-label="Go to the Signa homepage">
          <Wordmark className="h-16 w-28" />
        </Link>
        <div className="mt-16 max-w-3xl">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-8 text-4xl font-semibold tracking-normal text-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-copy">Last updated {updated}</p>
          <div className="mt-12 space-y-8 text-base leading-7 text-copy [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mt-3">
            {children}
          </div>
          <Link
            href="/sign-up"
            className="group mt-14 inline-flex items-center gap-2 text-sm font-medium text-ink"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Return to sign up
          </Link>
        </div>
      </article>
    </main>
  );
}
