import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BookOpenCheckIcon,
  BracesIcon,
  FileSignatureIcon,
  FileType2Icon,
  MonitorSmartphoneIcon,
  PenLineIcon,
  ListChecksIcon,
  SendIcon,
  ServerCogIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import {
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { guideArticles, type DocsArticle } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Guides",
  description: "Step-by-step Signa guides for signing workflows and APIs.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <GuidesIntro />
        <GuideLibrary />
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function GuidesIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">Guides</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Follow practical workflows for preparing templates, sending documents,
        automating submissions, embedding Signa, verifying completed PDFs, and
        operating a production deployment.
      </p>
    </>
  );
}

function GuideLibrary() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black">Guide library</h2>
      <div className="mt-8 grid gap-x-16 gap-y-12 border-t border-border pt-10 md:grid-cols-2 xl:grid-cols-3">
        {guideArticles.map((article) => (
          <GuideLink key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

function GuideLink({ article }: { article: DocsArticle }) {
  const Icon = guideCategoryIcons[article.category] ?? BookOpenCheckIcon;

  return (
    <Link
      className="group grid grid-cols-[44px_minmax(0,1fr)] gap-4"
      href={`/guides/${article.slug}`}
    >
      <span className="flex size-11 items-center justify-center text-signa-700 transition-colors group-hover:text-emerald-500">
        <Icon className="size-8" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {article.category}
        </span>
        <span className="mt-2 block font-black leading-6 text-foreground">
          {article.title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {article.description}
        </span>
        <span className="mt-4 flex items-center gap-2 text-sm font-black text-emerald-500">
          Read guide
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}

const guideCategoryIcons: Record<string, LucideIcon> = {
  API: BracesIcon,
  Completion: BadgeCheckIcon,
  Deployment: ServerCogIcon,
  "Dynamic documents": FileType2Icon,
  Embedding: MonitorSmartphoneIcon,
  "Getting started": BookOpenCheckIcon,
  Integration: MonitorSmartphoneIcon,
  Sending: SendIcon,
  "Sending documents": SendIcon,
  Signing: PenLineIcon,
  Submissions: ListChecksIcon,
  Templates: FileSignatureIcon,
  "Template builder": FileSignatureIcon,
  Troubleshooting: WrenchIcon,
  Verification: BadgeCheckIcon,
};
