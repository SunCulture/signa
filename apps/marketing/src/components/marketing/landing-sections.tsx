import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  KeyRound,
  MonitorSmartphone,
  RadioTower,
  ScrollText,
  ServerCog,
  Webhook,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  appUrl,
  deploymentPaths,
  features,
  observableCode,
  submissionCode,
} from "@/lib/landing-content";
import { cn } from "@/lib/utils";

import { ApiTabs } from "./api-tabs";
import { CodePanel } from "./code-panel";
import { LicenseCard } from "./license-card";
import { Reveal } from "./reveal";
import { Wordmark } from "./wordmark";

const primaryCta = cn(
  buttonVariants(),
  "h-10 gap-2 bg-ink px-4 text-base text-white shadow-button hover:bg-signa-800",
);

const secondaryCta = cn(
  buttonVariants({ variant: "outline" }),
  "h-10 gap-2 border-line bg-white px-4 text-base text-ink shadow-button hover:bg-surface",
);

function ArrowLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
      {children}
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
    </span>
  );
}

function RequestCard() {
  return (
    <div className="h-full rounded-lg bg-white p-8 shadow-code ring-1 ring-signa-200">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-copy">Signature request</p>
          <p className="mt-4 text-2xl font-semibold text-ink">
            Service agreement
          </p>
        </div>
        <span className="rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-signa-800">
          In progress
        </span>
      </div>

      <div className="relative mt-10 h-px bg-signa-200">
        <span className="absolute left-0 top-1/2 size-4 -translate-y-1/2 rounded-full bg-mint ring-4 ring-mint-soft" />
        <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signa-300" />
        <span className="absolute right-0 top-1/2 size-4 -translate-y-1/2 rounded-full bg-white ring-2 ring-signa-400" />
      </div>

      <div className="mt-16 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-copy">Client</p>
          <p className="mt-1 text-sm font-semibold text-ink">Ada Okafor</p>
          <p className="text-xs text-copy">Completed · 09:42</p>
        </div>
        <div>
          <p className="text-xs text-copy">Company</p>
          <p className="mt-1 text-sm font-semibold text-ink">Legal team</p>
          <p className="text-xs text-copy">Waiting to sign</p>
        </div>
      </div>

      <Separator className="my-6 bg-line" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Agreement ID</p>
          <p className="text-xs text-copy">AGR-2026-1842</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Delivery</p>
          <p className="text-xs text-copy">Email · ordered</p>
        </div>
      </div>
    </div>
  );
}

export async function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden pt-[69px]">
        <div className="page-frame relative min-h-[660px] overflow-hidden px-4 pb-56 pt-24 lg:min-h-[650px] lg:pb-80 lg:pt-28">
          <div
            aria-hidden
            className="signa-flow pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
          />
          <div className="relative z-10">
            <Reveal initialVisible>
              <h1 className="max-w-5xl text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-normal text-ink lg:text-balance">
                Document signing infrastructure you can own
              </h1>
            </Reveal>
            <Reveal delay={100} initialVisible>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-7 text-ink md:text-xl">
                Build, send, embed, and verify signing workflows from one
                self-hostable platform, complete with APIs, webhooks, audit
                trails, and production-ready PDF signatures.
              </p>
            </Reveal>
            <Reveal
              delay={180}
              initialVisible
              className="mt-12 flex flex-wrap gap-2"
            >
              <Link href="/sign-up" className={primaryCta}>
                Start with Signa
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/docs" className={secondaryCta}>
                Read the docs
                <ArrowRight className="size-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="page-frame px-4 pb-8 pt-24">
          <div className="relative z-20 -mt-72 grid min-w-0 gap-8 lg:-mt-80 lg:grid-cols-2 lg:gap-16">
            <Reveal initialVisible className="min-w-0">
              <CodePanel
                code={submissionCode}
                preview
                className="h-full min-h-[430px]"
              />
            </Reveal>
            <Reveal delay={120} initialVisible className="min-w-0">
              <RequestCard />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

const supportedSurfaces = [
  { label: "@signajs/react", icon: Braces },
  { label: "React Native", icon: MonitorSmartphone },
  { label: "REST API", icon: RadioTower },
  { label: "Webhooks", icon: Webhook },
  { label: "Self-hosted", icon: ServerCog },
];

function SurfaceGroup() {
  return (
    <div className="brand-marquee-group flex shrink-0 items-center justify-around gap-14 pr-14">
      {supportedSurfaces.map((surface) => {
        const Icon = surface.icon;
        return (
          <span
            key={surface.label}
            className="inline-flex h-8 items-center gap-2 whitespace-nowrap text-sm font-semibold text-signa-700"
          >
            <Icon className="size-4 text-signa-500" />
            {surface.label}
          </span>
        );
      })}
    </div>
  );
}

function BrandStrip() {
  return (
    <section>
      <div className="page-frame overflow-hidden border-y bg-white px-4 py-10">
        <p className="mb-7 text-center text-[11px] font-semibold uppercase text-copy">
          Built for the surfaces your team already ships
        </p>
        <div className="brand-marquee-viewport overflow-hidden">
          <div className="brand-marquee-track flex w-max">
            <SurfaceGroup />
            <SurfaceGroup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const accents = [
    "bg-mint-soft text-signa-800",
    "bg-coral-100 text-coral-700",
    "bg-sky-100 text-signa-800",
    "bg-signa-100 text-signa-800",
  ];

  return (
    <ul className="mt-12 grid gap-px overflow-hidden rounded-lg bg-line shadow-card ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <li
            key={feature.title}
            className="group relative flex min-h-[285px] flex-col justify-between bg-white px-5 pb-7 pt-6 transition-colors hover:bg-surface"
          >
            <Link
              href={feature.href}
              className="absolute inset-0"
              aria-label={`Learn more about ${feature.title}`}
            />
            <div>
              <span
                className={cn(
                  "inline-flex rounded-lg p-2 transition-colors group-hover:bg-ink group-hover:text-white",
                  accents[index % accents.length],
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 font-medium text-ink">{feature.title}</h3>
              <p className="mt-1 text-sm leading-5 text-copy">
                {feature.description}
              </p>
            </div>
            <ArrowLink>Explore</ArrowLink>
          </li>
        );
      })}
      <li
        aria-hidden="true"
        className="hidden min-h-[285px] bg-signa-100 lg:block xl:hidden"
      />
    </ul>
  );
}

function TechnicalMarquee() {
  const rows = [
    [
      "bg-mint-soft text-signa-900",
      "POST /api/submissions · 201 CREATED · REQUEST AGR-2026-1842 · EMAIL QUEUED",
    ],
    [
      "bg-coral-100 text-coral-800",
      "WEBHOOK submission.completed · HMAC VERIFIED · DELIVERY 200 · ATTEMPT 1",
    ],
    [
      "bg-sky-100 text-signa-900",
      "PDF SIGNED · BYTE RANGE VALID · TIMESTAMP PRESENT · AUDIT LOG ATTACHED",
    ],
  ];

  return (
    <div
      aria-hidden
      className="relative flex min-h-[360px] w-full min-w-0 max-w-full items-center overflow-hidden rounded-lg bg-surface ring-1 ring-line"
    >
      <div className="w-full space-y-1 overflow-hidden font-mono text-xs">
        {rows.map(([className, text], index) => (
          <div
            key={text}
            className={cn(
              "technical-row w-max whitespace-nowrap border-y border-dashed px-4 py-1",
              className,
            )}
            style={{ animationDirection: index === 1 ? "reverse" : "normal" }}
          >
            {text} · {text}
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-40 w-[48%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white shadow-code ring-2 ring-white">
        <Wordmark className="h-24 w-32" />
      </div>
    </div>
  );
}

function TimelineCard() {
  const events = [
    ["Request created", "Two signers added.", "Mar 12, 08:15 AM"],
    ["Invitation delivered", "Client opened the email.", "Mar 12, 09:47 AM"],
    ["Form viewed", "Signing session started.", "Mar 12, 09:50 AM"],
    ["Client completed", "Evidence recorded.", "Mar 12, 3:30 PM"],
    ["Company pending", "Next signer notified.", "Mar 14"],
  ];

  return (
    <div className="min-h-[355px] rounded-lg bg-white px-7 py-6 shadow-code ring-1 ring-line">
      <p className="text-xs text-copy">Service agreement</p>
      <p className="mt-3 text-xl font-semibold text-ink">1 of 2 completed</p>
      <ul className="mt-8 space-y-4">
        {events.map(([title, copy, time], index) => (
          <li key={title} className="relative flex gap-3 text-xs">
            {index !== events.length - 1 && (
              <span className="absolute left-[7px] top-4 h-7 w-px bg-line" />
            )}
            <span
              className={cn(
                "relative mt-1 size-3.5 shrink-0 rounded-full ring-1",
                index === events.length - 1
                  ? "bg-coral-100 ring-coral-500"
                  : "bg-mint-soft ring-signa-500",
              )}
            />
            <p className="min-w-0 flex-1 text-copy">
              <strong className="font-medium text-ink">{title}</strong> {copy}
            </p>
            <time className="shrink-0 whitespace-nowrap text-[10px] text-copy">
              {time}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

const trustPoints = [
  {
    icon: ScrollText,
    title: "Ordered audit trail",
    description:
      "Capture signing, delivery, webhook, device, and session events in one record.",
  },
  {
    icon: FileCheck2,
    title: "Document integrity",
    description:
      "Verify signed byte ranges, CMS signatures, signers, and signing times.",
  },
  {
    icon: BadgeCheck,
    title: "Certificate evidence",
    description:
      "Inspect trust chains, RFC 3161 timestamps, and DSS/VRI LTV status.",
  },
  {
    icon: Fingerprint,
    title: "Policy controls",
    description:
      "Require MFA, signing reasons, signer IDs, or authenticated downloads.",
  },
];

export async function MainSections() {
  return (
    <>
      <BrandStrip />

      <section id="platform">
        <div className="page-frame px-4 py-16 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Signing workflows, end to end</p>
            <h2 className="mt-8 text-3xl font-semibold tracking-normal text-ink md:text-4xl">
              From source document to trusted evidence
            </h2>
            <p className="mt-3 text-base text-copy">
              Prepare reusable documents, route every signer, embed the
              experience, and retain a verifiable completion record without
              stitching together separate products.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/sign-up" className={primaryCta}>
                Create your workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/guides" className={secondaryCta}>
                Browse guides
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
          <FeatureGrid />
        </div>
      </section>

      <section id="developers">
        <div className="page-frame border-t px-4 py-16 lg:py-24">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal className="min-w-0">
              <p className="eyebrow">Built for integration</p>
              <h2 className="mt-8 max-w-lg text-3xl font-semibold tracking-normal text-ink md:text-4xl">
                One signing engine. Every product surface.
              </h2>
              <p className="mt-3 text-base text-copy">
                Use the dashboard when humans need control, REST when systems
                need automation, and supported embeds when signing belongs
                inside your own experience.
              </p>
              <ul className="mt-8 grid gap-3 text-sm font-medium text-ink sm:grid-cols-2">
                {[
                  [Braces, "DocuSeal-compatible REST shape"],
                  [Webhook, "HMAC-signed webhooks"],
                  [MonitorSmartphone, "Web and mobile embeds"],
                  [KeyRound, "Scoped API keys"],
                ].map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof Braces;
                  return (
                    <li key={label as string} className="flex items-center gap-2">
                      <ItemIcon className="size-4 text-signa-600" />
                      {label as string}
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/docs/api"
                className="group mt-8 inline-flex"
              >
                <ArrowLink>Explore the API</ArrowLink>
              </Link>
            </Reveal>
            <Reveal className="min-w-0" delay={120}>
              <TechnicalMarquee />
            </Reveal>
          </div>
        </div>
      </section>

      <section>
        <div className="page-frame border-t px-4 py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative min-h-[590px] min-w-0">
              <Reveal className="absolute left-0 right-[10%] top-0">
                <CodePanel
                  code={observableCode}
                  preview
                  className="h-[355px]"
                />
              </Reveal>
              <div className="absolute bottom-0 left-[10%] right-0 z-10">
                <TimelineCard />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-normal text-ink md:text-4xl">
                Every request stays observable
              </h2>
              <p className="mt-3 text-base text-copy">
                Follow a document from creation through delivery, signing,
                completion, and downstream webhook processing.
              </p>
              <dl className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2">
                {features.slice(0, 4).map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title}>
                      <dt className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Icon className="size-4 text-signa-600" />
                        {feature.title}
                      </dt>
                      <dd className="mt-2 text-sm text-copy">
                        {feature.description}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <Link
                href="/docs/embedding"
                className="group mt-9 flex items-center gap-4 rounded-lg bg-white p-2 shadow-card ring-1 ring-line transition-shadow hover:shadow-code"
              >
                <span className="flex aspect-square w-28 items-center justify-center rounded-md bg-mint-soft text-signa-800">
                  <Braces className="size-10" />
                </span>
                <span>
                  <strong className="block text-sm text-ink">
                    @signajs/react
                  </strong>
                  <span className="mt-1 block text-sm text-copy">
                    Embed the signing form or template builder in your product.
                  </span>
                  <span className="mt-3 block">
                    <ArrowLink>View embed options</ArrowLink>
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="trust">
        <div className="page-frame border-t px-4 py-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <p className="eyebrow">Trust you can inspect</p>
              <h2 className="mt-8 max-w-lg text-3xl font-semibold tracking-normal text-ink md:text-4xl">
                Evidence that travels with the document
              </h2>
              <p className="mt-3 text-base text-copy">
                Signa records signer intent and activity, protects completed
                PDFs, and exposes verification details for teams that need more
                than a completion badge.
              </p>
              <Link
                href="/compliance"
                className="group mt-8 inline-flex"
              >
                <ArrowLink>Review trust and compliance</ArrowLink>
              </Link>
            </Reveal>
            <Reveal delay={120}>
              <dl className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
                {trustPoints.map((point) => {
                  const Icon = point.icon;
                  return (
                    <div key={point.title}>
                      <dt className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Icon className="size-5 text-signa-600" />
                        {point.title}
                      </dt>
                      <dd className="mt-2 text-sm text-copy">
                        {point.description}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      <section>
        <div className="page-frame border-t">
          <Reveal className="trust-band px-4 py-16 lg:px-20 lg:py-20">
            <ApiTabs />
          </Reveal>
        </div>
      </section>

      <section>
        <div className="page-frame border-t p-4">
          <Reveal className="group overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line">
            <Link
              href="/guides/deploy-signa-on-premise"
              className="grid lg:grid-cols-2"
              aria-label="Read the Signa self-hosting guide"
            >
              <div className="p-8 lg:p-12">
                <p className="eyebrow">Deployment control</p>
                <h2 className="mt-8 text-2xl font-semibold tracking-normal text-ink md:text-3xl">
                  Run Signa where your documents, identities, and retention
                  policies already live.
                </h2>
                <p className="mt-8 text-base text-copy">
                  Start on SQLite, move to PostgreSQL, keep blobs local or in
                  S3-compatible storage, and connect the mail, SMS, OAuth, and
                  queue providers your environment requires.
                </p>
                <span className="mt-4 block">
                  <ArrowLink>Read the self-hosting guide</ArrowLink>
                </span>
              </div>
              <div className="deployment-visual flex min-h-80 items-center justify-center p-8">
                <div className="text-center">
                  <Wordmark className="mx-auto h-40 w-52" />
                  <p className="mt-4 font-mono text-xs font-medium text-signa-800">
                    YOUR INFRASTRUCTURE · YOUR SIGNING STACK
                  </p>
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export function PricingSection() {
  return (
    <section id="deployment">
      <div className="page-frame border-t px-4 py-16 lg:py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Paths to production</p>
          <h2 className="mt-8 text-4xl font-semibold tracking-normal text-ink md:text-5xl">
            Choose how Signa fits your stack
          </h2>
          <p className="mt-3 text-base text-copy">
            Operate the platform yourself, embed signing into your product, or
            configure stronger evidence and policy controls for regulated
            workflows.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {deploymentPaths.map((path, index) => {
            const Icon = path.icon;
            return (
              <Reveal key={path.title} delay={index * 90}>
                <div className="flex h-full flex-col rounded-xl bg-white p-8 shadow-card ring-1 ring-line">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex rounded-lg p-2 text-ink",
                        path.accent,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-copy">
                        {path.label}
                      </p>
                      <h3 className="font-semibold text-ink">{path.title}</h3>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-copy">
                    {path.description}
                  </p>
                  <ul className="my-6 space-y-3">
                    {path.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-copy"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signa-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={path.href}
                    className={cn(
                      path.primary ? primaryCta : secondaryCta,
                      "mt-auto w-full",
                    )}
                  >
                    {path.action}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
        <LicenseCard />
      </div>
    </section>
  );
}

export function SiteFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        { label: "Templates", href: `${appUrl}/templates` },
        { label: "Submissions", href: `${appUrl}/submissions` },
        { label: "Teams", href: "/resources/manage-teams" },
        { label: "Compliance", href: "/compliance" },
        { label: "Journal", href: "/blog" },
      ],
    },
    {
      title: "Developers",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "API reference", href: "/docs/api" },
        { label: "Embedding", href: "/docs/embedding" },
        { label: "Webhooks", href: "/docs/webhooks" },
      ],
    },
    {
      title: "Operate",
      links: [
        {
          label: "Self-hosting",
          href: "/resources/deploy-signa-on-premise",
        },
        {
          label: "Storage",
          href: "/resources/manage-attachments-and-storage",
        },
        {
          label: "Security",
          href: "/resources/configure-security-preferences",
        },
        { label: "Sign in", href: "/sign-in" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ];

  return (
    <footer id="contact">
      <div className="page-frame border-t px-4 py-14">
        <div className="grid gap-12 text-xs text-copy sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark className="h-24 w-32" />
            <p className="mt-2 max-w-48 font-medium leading-5 text-copy">
              Document signing infrastructure for teams that need control.
            </p>
            <p className="mt-4 font-medium text-ink">
              © {new Date().getFullYear()} Signa
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-base font-medium text-ink">{column.title}</h3>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium transition-colors hover:text-signa-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
