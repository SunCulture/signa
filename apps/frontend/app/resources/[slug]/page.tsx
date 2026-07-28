import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/docs/docs-shell";
import { findResource, resourceArticles } from "@/lib/docs/content";

type ResourcePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return resourceArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ResourcePageProps): Promise<Metadata> {
  const article = findResource((await params).slug);

  return {
    title: article ? `${article.title} | Signa Resources` : "Signa Resource",
    description: article?.description,
  };
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const article = findResource((await params).slug);

  if (!article) {
    notFound();
  }

  return <ArticlePage article={article} />;
}
