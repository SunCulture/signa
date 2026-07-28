import type { Metadata } from "next";
import {
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { complianceSections } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Compliance",
  description:
    "Signa compliance, audit trail, certificate, timestamp, and PDF verification documentation.",
};

export default function CompliancePage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <article>
          <ComplianceIntro />
          <ComplianceCallout />
          <ComplianceSections />
          <ComplianceEvidence />
          <ComplianceBoundaries />
        </article>
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function ComplianceIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">
        Compliance and trust
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Signa records signer intent, protects completed PDFs with PAdES-style
        signatures, verifies trust chains, and exposes audit evidence for teams
        that need production-grade document accountability.
      </p>
    </>
  );
}

function ComplianceCallout() {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
      Signa supports SES/AES-style workflows. Qualified electronic signatures
      require an external qualified trust service provider and jurisdictional
      identity proofing.
    </div>
  );
}

function ComplianceSections() {
  return (
    <section className="mt-16 grid gap-x-16 gap-y-12 border-t border-border pt-10 md:grid-cols-2">
      {complianceSections.map((section) => (
        <section key={section.title}>
          <div className="flex items-start gap-4">
            <span className="inline-flex rounded-2xl bg-secondary p-3 text-primary">
              <section.icon className="size-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>
          <ul className="mt-5 divide-y divide-border text-sm leading-6">
            {section.items.map((item) => (
              <li className="py-3 text-muted-foreground" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function ComplianceEvidence() {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Verification evidence Signa shows</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {[
          "Signed byte range verification",
          "Signer and signing time extraction",
          "Certificate chain and trust classification",
          "PAdES subfilter detection",
          "RFC3161 timestamp token reporting",
          "DSS/VRI LTV evidence status",
        ].map((item, index) => (
          <div className="rounded-2xl border border-border bg-card p-5" key={item}>
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-black text-primary">
              {index + 1}
            </span>
            <p className="mt-4 font-black">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComplianceBoundaries() {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Operational boundaries</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Legal acceptance depends on your jurisdiction, identity policy,
        certificate authority, retention settings, and signer authentication
        requirements. Keep test mode separate, configure production certificates
        and timestamp URLs deliberately, and validate sample documents with the
        same PDF viewers your customers use.
      </p>
    </section>
  );
}
