import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  MoonIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/docs/docs-code-block";
import { DocsFooter } from "@/components/docs/docs-footer";
import { DocsImage } from "@/components/docs/docs-image";
import { guideLinks, resourceLinks } from "@/components/docs/docs-nav-links";
import { DocsSearch } from "@/components/docs/docs-search";
import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav";
import { cn } from "@/lib/utils";
import { type DocsArticle, type DocsCard } from "@/lib/docs/content";

export { CodeBlock } from "@/components/docs/docs-code-block";
export { DocsFooter } from "@/components/docs/docs-footer";

type DocsShellProps = {
  children: ReactNode;
};

export function DocsShell({ children }: DocsShellProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <DocsSidebar />
      <div className="min-h-svh lg:pl-80">
        <DocsHeader />
        {children}
      </div>
    </main>
  );
}

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-5 sm:px-8">
        <DocsSearch />
        <DocsHeaderNav />
      </div>
    </header>
  );
}

function DocsHeaderNav() {
  return (
    <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
      <Link className="transition hover:text-foreground" href="/docs/api">
        API
      </Link>
      <Link className="transition hover:text-foreground" href="/docs">
        Documentation
      </Link>
      <Link className="transition hover:text-foreground" href="/resources">
        Support
      </Link>
      <span className="h-5 w-px bg-border" />
      <ThemeToggleButton />
      <DocsSignInButton />
    </nav>
  );
}

function ThemeToggleButton() {
  return (
    <Button
      aria-label="Toggle theme"
      className="size-8 rounded-full text-muted-foreground hover:text-foreground"
      size="icon"
      type="button"
      variant="ghost"
    >
      <MoonIcon className="size-4" />
    </Button>
  );
}

function DocsSignInButton() {
  return (
    <Button
      asChild
      className="h-9 rounded-full bg-foreground px-5 font-bold text-background hover:bg-foreground/85 dark:bg-primary dark:text-primary-foreground"
    >
      <Link href="/auth/login">Sign in</Link>
    </Button>
  );
}

export function DocsHero({
  badge,
  description,
  title,
}: {
  badge: string;
  description: string;
  title: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <DocsHeroBackground />
      <DocsContainer className="relative py-16 sm:py-20">
        <DocsHeroContent
          badge={badge}
          description={description}
          title={title}
        />
      </DocsContainer>
    </section>
  );
}

function DocsHeroBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(#d9eaf5_1px,transparent_1px),linear-gradient(90deg,#d9eaf5_1px,transparent_1px)] bg-[size:40px_40px] opacity-60 dark:opacity-10" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_35%_0%,rgba(155,227,200,0.55),transparent_42%),radial-gradient(circle_at_70%_0%,rgba(217,234,245,0.75),transparent_38%)] dark:bg-[radial-gradient(circle_at_35%_0%,rgba(39,99,157,0.5),transparent_42%),radial-gradient(circle_at_70%_0%,rgba(155,227,200,0.16),transparent_38%)]" />
    </>
  );
}

function DocsHeroContent({
  badge,
  description,
  title,
}: {
  badge: string;
  description: string;
  title: string;
}) {
  return (
    <>
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-input bg-background/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm">
        <SparklesIcon className="size-4 text-[#ef7a4d]" />
        {badge}
      </p>
      <h1 className="max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        {description}
      </p>
      <DocsHeroActions />
    </>
  );
}

function DocsHeroActions() {
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Button
        asChild
        className="h-10 rounded-full bg-foreground px-5 font-bold text-background hover:bg-foreground/85"
      >
        <Link href="/guides/quick-start">
          Quickstart
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
      <Button
        asChild
        className="h-10 rounded-full border-input bg-background/80 px-5 font-bold"
        variant="outline"
      >
        <Link href="/docs/embedding">Explore SDKs</Link>
      </Button>
    </div>
  );
}

export function CardGrid({ cards }: { cards: DocsCard[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Link
          className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-input hover:shadow-lg"
          href={card.href}
          key={card.title}
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
            <card.icon className="size-5" />
          </span>
          <h2 className="mt-5 text-lg font-black">{card.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {card.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-500">
            Read more
            <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ArticleList({
  articles,
  basePath,
}: {
  articles: DocsArticle[];
  basePath: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {articles.map((article) => (
        <Link
          className="group flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-input hover:shadow-lg"
          href={`${basePath}/${article.slug}`}
          key={article.slug}
        >
          <DocsImage name={article.image} compact />
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              {article.category}
            </span>
            <h2 className="mt-2 text-lg font-black">{article.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {article.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ArticlePage({ article }: { article: DocsArticle }) {
  return (
    <DocsShell>
      <DocsArticleBody article={article} />
    </DocsShell>
  );
}

export function DocsContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-5xl px-5 sm:px-8", className)}>
      {children}
    </section>
  );
}

function DocsSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-80 border-r border-border bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-7">
          <DocsLogo />
        </div>
        <DocsSidebarNav guideLinks={guideLinks} resourceLinks={resourceLinks} />
      </div>
    </aside>
  );
}

function DocsLogo() {
  return (
    <Link
      className="flex items-center gap-3 rounded-full text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      href="/"
    >
      <span className="relative block size-8">
        <Image
          alt="Signa"
          className="object-contain"
          fill
          priority
          sizes="32px"
          src="/images/logo.png"
        />
      </span>
      <span className="text-2xl font-black">Signa</span>
    </Link>
  );
}

function DocsArticleBody({ article }: { article: DocsArticle }) {
  return (
    <DocsContainer className="py-16">
      <article>
        <h1 className="text-4xl font-black tracking-normal">{article.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
          {article.description}
        </p>
        <InfoCallout>
          Before you send production requests, create an API key in{" "}
          <Link className="font-black text-emerald-500" href="/settings/api">
            Settings &gt; API
          </Link>{" "}
          and keep test mode separate from live signing.
        </InfoCallout>
        <ArticleSteps steps={article.steps} />
        <QuickstartCodeBlocks />
      </article>
      <DocsFooter />
    </DocsContainer>
  );
}

function ArticleSteps({ steps }: { steps: string[] }) {
  return (
    <div className="mt-14 space-y-12">
      {steps.map((step, index) => (
        <section key={step}>
          <h2 className="text-2xl font-black">
            {index === 0 ? "Choose your client" : `Step ${index + 1}`}
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
            {step}
          </p>
        </section>
      ))}
    </div>
  );
}

function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
      {children}
    </div>
  );
}

function QuickstartCodeBlocks() {
  return (
    <div className="mt-8 space-y-10">
      <CodeBlock language="bash" title="Install the React package">
        pnpm add @signajs/react
      </CodeBlock>
      <CodeBlock language="bash" title="Create a submission">
        {`curl -X POST https://signa.example.com/api/submissions \\
  -H "X-Auth-Token: {token}" \\
  -H "Content-Type: application/json" \\
  -d '{"template_id": "12", "submitters": [{"email": "client@example.com"}]}'`}
      </CodeBlock>
    </div>
  );
}

export function DocsOverview({
  cards,
  description,
  guideCards,
  title,
}: {
  cards: DocsCard[];
  description: string;
  guideCards?: DocsCard[];
  title: string;
}) {
  return (
    <DocsContainer className="py-16">
      <DocsOverviewIntro description={description} title={title} />
      <DocsOverviewGettingStarted />
      {guideCards ? <DocsOverviewGuides cards={guideCards} /> : null}
      <DocsOverviewResources cards={cards} />
      <DocsFooter />
    </DocsContainer>
  );
}

function DocsOverviewIntro({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">{title}</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        {description}
      </p>
      <DocsHeroActions />
    </>
  );
}

function DocsOverviewGettingStarted() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black">Getting started</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Create a workspace, prepare templates, send recipients, and verify the
        completed document from the same Signa console.
      </p>
      <Link
        className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-500"
        href="/settings/api"
      >
        Get your API key
        <ArrowRightIcon className="size-4" />
      </Link>
    </section>
  );
}

function DocsOverviewGuides({ cards }: { cards: DocsCard[] }) {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Guides</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <DocsOverviewGuideLink card={card} key={card.title} />
        ))}
      </div>
    </section>
  );
}

function DocsOverviewGuideLink({ card }: { card: DocsCard }) {
  return (
    <Link href={card.href}>
      <h3 className="font-black">{card.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {card.description}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-500">
        Read more
        <ArrowRightIcon className="size-4" />
      </span>
    </Link>
  );
}

function DocsOverviewResources({ cards }: { cards: DocsCard[] }) {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Resources</h2>
      <div className="mt-8">
        <CardGrid cards={cards} />
      </div>
    </section>
  );
}
