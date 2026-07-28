import type { Metadata } from "next";
import { DocsOverview, DocsShell } from "@/components/docs/docs-shell";
import { apiReferenceCards, docsHubCards } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Docs",
  description:
    "User, developer, API, compliance, and deployment documentation for Signa.",
};

export default function DocsPage() {
  return (
    <DocsShell>
      <DocsOverview
        cards={docsHubCards}
        description="Everything needed to run Signa end to end: build templates, send signature requests, embed signing, verify PDFs, operate webhooks, and deploy on-prem."
        guideCards={apiReferenceCards.slice(0, 4)}
        title="API Documentation"
      />
    </DocsShell>
  );
}
