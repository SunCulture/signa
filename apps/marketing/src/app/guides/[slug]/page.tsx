import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { ArticlePage } from "@/components/docs/docs-shell";
import { findGuide, guideArticles } from "@/lib/docs/content";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return guideArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const article = findGuide((await params).slug);

  return {
    title: article ? `${article.title} | Signa Guides` : "Signa Guide",
    description: article?.description,
    alternates: article
      ? { canonical: `/guides/${article.slug}` }
      : undefined,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;

  if (slug === "deploy-signa-on-premise") {
    redirect("/resources/deploy-signa-on-premise");
  }

  const article = findGuide(slug);

  if (!article) {
    notFound();
  }

  return <ArticlePage article={article} />;
}
