import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const article = findGuide((await params).slug);

  if (!article) {
    notFound();
  }

  return <ArticlePage article={article} />;
}
