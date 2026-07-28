import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { docsResources } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Resources",
  description:
    "Operational resources for branding, folders, teams, integrations, security, and onboarding.",
};

export default function ResourcesPage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <ResourcesIntro />
        <ResourcesLibrary />
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function ResourcesIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">Resources</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Operational references for administrators, support teams, and
        implementation owners running Signa in production.
      </p>
    </>
  );
}

function ResourcesLibrary() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black">Resource library</h2>
      <div className="mt-8 grid gap-x-16 gap-y-12 border-t border-border pt-10 md:grid-cols-2 xl:grid-cols-3">
        {docsResources.map((resource) => (
          <ResourceLinkCard key={resource.href} resource={resource} />
        ))}
      </div>
    </section>
  );
}

function ResourceLinkCard({
  resource,
}: {
  resource: (typeof docsResources)[number];
}) {
  return (
    <Link className="group grid grid-cols-[44px_1fr] gap-4" href={resource.href}>
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition group-hover:border-emerald-300 group-hover:text-emerald-500">
        <resource.icon className="size-5" />
      </span>
      <span>
        <span className="font-black">{resource.label}</span>
        <span className="mt-3 flex items-center gap-2 text-sm font-black text-emerald-500">
          Read more
          <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}
