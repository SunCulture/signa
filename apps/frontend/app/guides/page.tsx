import type { Metadata } from "next";
import {
  ArticleList,
  DocsContainer,
  DocsHero,
  DocsShell,
} from "@/components/docs/docs-shell";
import { guideArticles } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Guides",
  description: "Step-by-step Signa guides for signing workflows and APIs.",
};

export default function GuidesPage() {
  return (
    <DocsShell>
      <DocsHero
        badge="Guides"
        description="Practical workflows for template creation, API submissions, embedded text tags, dynamic documents, and PDF verification."
        title="Guides"
      />
      <DocsContainer>
        <ArticleList articles={guideArticles} basePath="/guides" />
      </DocsContainer>
    </DocsShell>
  );
}
