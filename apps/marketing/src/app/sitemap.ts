import type { MetadataRoute } from "next";

import {
  alternatives,
  alternativesUpdatedAt,
} from "@/lib/alternatives-content";
import { blogPosts } from "@/lib/blog-content";
import { guideArticles, resourceArticles } from "@/lib/docs/content";
import { marketingUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: marketingUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${marketingUrl}/blog`,
      lastModified: new Date(blogPosts[0].publishedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...[
      "/docs",
      "/docs/api",
      "/docs/embedding",
      "/docs/webhooks",
      "/guides",
      "/resources",
      "/alternatives",
      "/compliance",
      "/qualified-electronic-signature",
      "/privacy",
      "/terms",
    ].map((path) => ({
      url: `${marketingUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "/docs" ? 0.9 : 0.8,
    })),
    ...guideArticles.map((article) => ({
      url: `${marketingUrl}/guides/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...resourceArticles.map((article) => ({
      url: `${marketingUrl}/resources/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...alternatives.map((alternative) => ({
      url: `${marketingUrl}/alternatives/${alternative.slug}`,
      lastModified: new Date(alternativesUpdatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...blogPosts.map((post) => ({
      url: `${marketingUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
