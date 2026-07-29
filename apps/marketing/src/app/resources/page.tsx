import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BellRingIcon,
  Building2Icon,
  FileKey2Icon,
  FolderKanbanIcon,
  KeyRoundIcon,
  MailCheckIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadCloudIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";

import {
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { resourceArticles, type DocsArticle } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Resources",
  description:
    "Operational resources for branding, folders, teams, integrations, security, and onboarding.",
  alternates: { canonical: "/resources" },
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
        {resourceArticles.map((resource) => (
          <ResourceLinkCard key={resource.slug} resource={resource} />
        ))}
      </div>
    </section>
  );
}

function ResourceLinkCard({
  resource,
}: {
  resource: DocsArticle;
}) {
  const Icon = resourceCategoryIcons[resource.category] ?? SparklesIcon;

  return (
    <Link
      className="group grid grid-cols-[44px_1fr] gap-4"
      href={`/resources/${resource.slug}`}
    >
      <span className="flex size-11 items-center justify-center text-signa-700 transition group-hover:text-emerald-500">
        <Icon className="size-8" strokeWidth={1.75} />
      </span>
      <span>
        <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {resource.category}
        </span>
        <span className="mt-2 block font-black">{resource.title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {resource.description}
        </span>
        <span className="mt-3 flex items-center gap-2 text-sm font-black text-emerald-500">
          Read resource
          <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}

const resourceCategoryIcons: Record<string, LucideIcon> = {
  Access: UsersRoundIcon,
  Administration: SparklesIcon,
  API: KeyRoundIcon,
  Branding: MailCheckIcon,
  Communication: BellRingIcon,
  Deployment: Building2Icon,
  Integrations: PlugZapIcon,
  Security: ShieldCheckIcon,
  Storage: UploadCloudIcon,
  Templates: FolderKanbanIcon,
  Trust: FileKey2Icon,
};
