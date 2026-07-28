import type { Metadata } from "next";
import {
  DocsContainer,
  DocsHero,
  DocsShell,
} from "@/components/docs/docs-shell";
import { qesSections } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Qualified Electronic Signature | Signa",
  description:
    "Signa electronic signature levels, advanced signing controls, and qualified electronic signature planning.",
};

export default function QualifiedElectronicSignaturePage() {
  return (
    <DocsShell>
      <DocsHero
        badge="Electronic signatures"
        description="Use simple signatures for everyday agreements, advanced controls for regulated workflows, and external qualified trust providers where QES is legally required."
        title="Qualified electronic signatures"
      />
      <SignatureLevelSections />
    </DocsShell>
  );
}

function SignatureLevelSections() {
  return (
    <DocsContainer className="grid gap-5 lg:grid-cols-3">
      {qesSections.map((section) => (
        <article
          className="rounded-[2rem] border border-border bg-card p-6 shadow-sm"
          key={section.title}
        >
          <span className="inline-flex rounded-2xl bg-secondary p-3 text-primary">
            <section.icon className="size-6" />
          </span>
          <h2 className="mt-6 text-4xl font-black">{section.title}</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {section.description}
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-6">
            {section.items.map((item) => (
              <li className="rounded-2xl bg-secondary px-4 py-3" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </DocsContainer>
  );
}
