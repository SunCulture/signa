import type { MetadataRoute } from "next";

import { marketingUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${marketingUrl}/sitemap.xml`,
    host: marketingUrl,
  };
}
