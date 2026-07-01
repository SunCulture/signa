import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BellRingIcon,
  BracesIcon,
  FileSignatureIcon,
  KeyRoundIcon,
  Layers3Icon,
  LockKeyholeIcon,
  MailCheckIcon,
  PenLineIcon,
  RadarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadCloudIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    title: "Build",
    description: "Upload PDF, DOCX, or HTML and place every signer field.",
    icon: UploadCloudIcon,
  },
  {
    title: "Send",
    description: "Invite recipients by email, phone, bulk list, or API.",
    icon: MailCheckIcon,
  },
  {
    title: "Verify",
    description: "Track events, audit trails, certificates, and signed files.",
    icon: ShieldCheckIcon,
  },
];

const featureGroups = [
  {
    title: "Template studio",
    description: "Roles, folders, reusable fields, conditions, and live previews.",
    icon: Layers3Icon,
    tone: "bg-[#e8f5ff] text-[#16304f]",
  },
  {
    title: "Signing room",
    description: "Mobile-first signing with typed, drawn, uploaded, and saved signatures.",
    icon: PenLineIcon,
    tone: "bg-[#fff1e8] text-[#7a2e16]",
  },
  {
    title: "Auditability",
    description: "Device metadata, location capture, event logs, and PDF verification.",
    icon: RadarIcon,
    tone: "bg-[#e9fbf4] text-[#124235]",
  },
  {
    title: "Developer API",
    description: "DocuSeal-compatible endpoints, webhooks, API keys, and embedding.",
    icon: BracesIcon,
    tone: "bg-[#f4edff] text-[#35124f]",
  },
];

const proofPoints = [
  "Multi-party signing",
  "PDF/DOCX support",
  "Self-sign and owner auto-sign",
  "Webhook delivery logs",
  "Test mode",
  "LTV-ready verification path",
];

export default function Home() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#fffaf7] text-[#16304f]">
      <HeroSection />
      <WorkflowSection />
      <FeatureSection />
      <ApiSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[88svh] flex-col border-b border-[#d8e7ef] bg-[#fffaf7]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(#d9eaf5_1px,transparent_1px),linear-gradient(90deg,#d9eaf5_1px,transparent_1px)] bg-[size:44px_44px] opacity-55" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          className="flex items-center gap-3 rounded-full text-[#16304f] outline-none focus-visible:ring-3 focus-visible:ring-[#27639d]/30"
          href="/"
        >
          <Image
            alt="Signa"
            className="size-11 object-contain"
            height={44}
            priority
            src="/images/logo.png"
            width={44}
          />
          <span className="text-2xl font-bold tracking-normal">Signa</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            asChild
            className="hidden h-11 rounded-full border-[#16304f] px-5 font-bold text-[#16304f] hover:bg-[#16304f] hover:text-white sm:inline-flex"
            variant="outline"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button
            asChild
            className="h-11 rounded-full bg-[#16304f] px-5 font-bold text-white hover:bg-[#010203]"
          >
            <Link href="/auth/register">
              Start free
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:pt-2">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#afd1e9] bg-white/85 px-4 py-2 text-sm font-bold text-[#274a6d] shadow-sm">
            <SparklesIcon className="size-4 text-[#f47f52]" />
            Open document signing, built for serious workflows
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-normal text-[#16304f] sm:text-7xl">
            Document signing for teams that move fast.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#274a6d] sm:text-xl">
            Signa turns templates, field teams, customers, and API-triggered
            agreements into a clean signing flow with audit trails, roles,
            webhooks, and verification built in.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-13 rounded-full bg-[#16304f] px-7 text-base font-bold text-white hover:bg-[#010203]"
            >
              <Link href="/auth/register">
                Create workspace
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              className="h-13 rounded-full border-[#16304f] bg-white/80 px-7 text-base font-bold text-[#16304f] hover:bg-[#16304f] hover:text-white"
              variant="outline"
            >
              <Link href="/auth/login">Open console</Link>
            </Button>
          </div>
          <div className="mt-9 flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <span
                className="rounded-full border border-[#d9eaf5] bg-white/85 px-3 py-1.5 text-sm font-semibold text-[#274a6d]"
                key={point}
              >
                {point}
              </span>
            ))}
          </div>
        </div>
        <HeroVisualCluster />
      </div>
    </section>
  );
}

function HeroVisualCluster() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden min-h-[610px] overflow-visible lg:block"
    >
      <div className="absolute inset-x-0 top-6 h-[500px] rounded-[44px] border border-[#d9eaf5] bg-white/55 shadow-[0_44px_110px_-82px_#16304f] backdrop-blur-sm" />
      <div className="absolute inset-x-12 top-16 h-[410px] rounded-[36px] bg-[radial-gradient(circle_at_72%_18%,rgba(244,127,82,0.18),transparent_30%),radial-gradient(circle_at_28%_78%,rgba(155,227,200,0.28),transparent_38%)]" />

      <div className="absolute left-8 top-20 w-[405px] rounded-[28px] border border-[#d9eaf5] bg-white/88 p-4 shadow-[0_30px_80px_-64px_#16304f]">
        <div className="flex items-center justify-between border-b border-[#d9eaf5] pb-3">
          <div>
            <p className="text-sm font-bold text-[#16304f]">Template console</p>
            <p className="text-xs font-semibold text-[#53728f]">
              Live signing queue
            </p>
          </div>
          <span className="rounded-full bg-[#e9fbf4] px-3 py-1 text-xs font-bold text-[#124235]">
            Synced
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          <ConsoleRow
            accent="bg-[#f47f52]"
            label="Onboarding packet"
            meta="2 of 3 signed"
            status="Waiting"
          />
          <ConsoleRow
            accent="bg-[#0f9f6e]"
            label="Field service agreement"
            meta="Completed"
            status="Verified"
          />
          <ConsoleRow
            accent="bg-[#27639d]"
            label="Customer handover"
            meta="Sent 4m ago"
            status="Email"
          />
        </div>
      </div>

      <div className="absolute right-4 top-40 h-[430px] w-[335px] rotate-3 rounded-[28px] border border-[#d9eaf5] bg-white shadow-[0_44px_100px_-70px_#16304f]">
        <div className="flex h-16 items-center gap-3 border-b border-[#d9eaf5] px-5">
          <FileSignatureIcon className="size-7 text-[#f47f52]" />
          <div>
            <p className="text-sm font-bold text-[#16304f]">Service Contract</p>
            <p className="text-xs font-semibold text-[#53728f]">
              3 recipients ready
            </p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <DocumentLine width="w-11/12" />
          <DocumentLine width="w-8/12" />
          <DocumentLine width="w-10/12" />
          <div className="mt-7 grid grid-cols-2 gap-4">
            <SignatureBox label="Client" />
            <SignatureBox label="Engineer" />
          </div>
          <div className="rounded-2xl border border-[#afd1e9] bg-[#f6fafd] p-4">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheckIcon className="size-5 text-[#0f9f6e]" />
              <span className="text-sm font-bold">Audit trail active</span>
            </div>
            <DocumentLine width="w-10/12" />
            <DocumentLine width="w-7/12" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-28 left-20 w-[340px] -rotate-3 rounded-[28px] border border-[#ffd6c2] bg-[#fff1e8] p-4 shadow-[0_30px_80px_-66px_#7a2e16]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#f47f52]">
            <WorkflowMiniIcon />
          </span>
          <div>
            <p className="text-sm font-bold text-[#7a2e16]">
              Owner auto-sign applied
            </p>
            <p className="text-xs font-semibold text-[#9b563b]">
              Business role completed before send
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-44 w-72 rotate-2 rounded-3xl border border-[#ffd6c2] bg-[#fff7f2] p-5 shadow-[0_30px_80px_-66px_#7a2e16]">
        <div className="flex items-center gap-3">
          <BellRingIcon className="size-7 text-[#f47f52]" />
          <div>
            <p className="text-sm font-bold text-[#7a2e16]">
              Webhook delivered
            </p>
            <p className="text-xs font-semibold text-[#9b563b]">
              submission.completed
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-64 rounded-3xl border border-[#c7f1df] bg-[#e9fbf4] p-5 shadow-[0_24px_70px_-58px_#124235]">
        <div className="flex items-center gap-3">
          <LockKeyholeIcon className="size-7 text-[#0f9f6e]" />
          <div>
            <p className="text-sm font-bold text-[#124235]">Verified PDF</p>
            <p className="text-xs font-semibold text-[#39715f]">
              certificate chain recorded
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsoleRow({
  accent,
  label,
  meta,
  status,
}: {
  accent: string;
  label: string;
  meta: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#eef5fa] bg-[#f6fafd] px-3 py-3">
      <span className={`size-2.5 rounded-full ${accent}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#16304f]">{label}</p>
        <p className="text-xs font-semibold text-[#53728f]">{meta}</p>
      </div>
      <span className="rounded-full border border-[#afd1e9] bg-white px-2.5 py-1 text-[11px] font-bold text-[#274a6d]">
        {status}
      </span>
    </div>
  );
}

function WorkflowMiniIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 7.5h6.5c2.8 0 5 2.2 5 5v0c0 2.8-2.2 5-5 5H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="m7 4-3.5 3.5L7 11M17 13l3.5 3.5L17 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function DocumentLine({ width }: { width: string }) {
  return <div className={`h-3 rounded-full bg-[#d9eaf5] ${width}`} />;
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div className="h-24 rounded-2xl border border-dashed border-[#f47f52] bg-[#fff7f2] p-3">
      <p className="text-xs font-bold uppercase text-[#9b563b]">{label}</p>
      <div className="mt-5 h-4 w-24 rounded-full bg-[#f47f52]/45" />
    </div>
  );
}

function WorkflowSection() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-[#f47f52]">
              Fast path to signed
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-normal text-[#16304f] sm:text-5xl">
              One workflow from template to verifiable document.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#53728f]">
            The product is quiet where it should be and explicit where trust
            matters: roles, signing order, audit logs, and final PDF evidence.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <article
              className="rounded-3xl border border-[#d9eaf5] bg-[#f6fafd] p-6"
              key={step.title}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#16304f] text-white">
                  <step.icon className="size-6" />
                </span>
                <span className="text-4xl font-bold text-[#afd1e9]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#16304f]">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-[#53728f]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="border-y border-[#d9eaf5] bg-[#eef5fa] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <p className="text-sm font-bold uppercase text-[#27639d]">
            Built like infrastructure
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-[#16304f] sm:text-5xl">
            Polished for people. Useful for systems.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#53728f]">
            Use the console for daily operations, or drive signing from your
            own app with API keys, callbacks, and predictable submission state.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featureGroups.map((feature) => (
            <article
              className={`${feature.tone} rounded-3xl border border-white/70 p-6 shadow-sm`}
              key={feature.title}
            >
              <feature.icon className="size-8" />
              <h3 className="mt-7 text-2xl font-bold">{feature.title}</h3>
              <p className="mt-3 text-base leading-7 opacity-80">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApiSection() {
  return (
    <section className="bg-[#16304f] px-5 py-16 text-white sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase text-[#9be3c8]">
            Ready for integration
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
            Create submissions from your product and keep everyone in sync.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#d9eaf5]">
            Programmatic submissions, owner auto-sign, event tracking, mail
            queues, webhooks, and signing metadata are part of the same flow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-full bg-white px-6 font-bold text-[#16304f] hover:bg-[#d9eaf5]"
            >
              <Link href="/auth/register">Start building</Link>
            </Button>
            <Button
              asChild
              className="h-12 rounded-full border-white/60 px-6 font-bold text-white hover:bg-white hover:text-[#16304f]"
              variant="outline"
            >
              <Link href="/auth/login">Go to API settings</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-[#0b1f35] p-4 shadow-[0_30px_100px_-70px_#000]">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <KeyRoundIcon className="size-5 text-[#9be3c8]" />
              <span className="font-bold">Submission API</span>
            </div>
            <span className="rounded-full bg-[#9be3c8] px-3 py-1 text-xs font-bold text-[#12392e]">
              Live
            </span>
          </div>
          <pre className="overflow-hidden rounded-2xl bg-[#06111d] p-5 text-sm leading-7 text-[#d9eaf5]">
            <code>{`POST /api/templates/{id}/submissions
{
  "send_email": true,
  "submitters": [
    { "role": "Business", "auto_sign": true },
    { "role": "Engineer", "email": "field@team.co" },
    { "role": "Client", "phone": "+254712123456" }
  ]
}`}</code>
          </pre>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Event", "submission.created"],
              ["Queue", "mail delivered"],
              ["Audit", "device captured"],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
                key={label}
              >
                <p className="text-xs font-bold uppercase text-[#9abeda]">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
