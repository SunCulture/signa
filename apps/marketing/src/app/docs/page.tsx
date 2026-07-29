import type { Metadata } from "next";
import { DocsOverview, DocsShell } from "@/components/docs/docs-shell";
import { docsHubCards } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Docs",
  description:
    "User, developer, API, compliance, and deployment documentation for Signa.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <DocsShell>
      <DocsOverview
        cards={docsHubCards}
        description="Learn Signa from first document to production operations. Follow user workflows, administer a workspace, integrate the API, and operate a secure self-hosted deployment."
        title="Signa documentation"
      />
    </DocsShell>
  );
}
