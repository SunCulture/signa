import {
  apiReferenceCards,
  docsHubCards,
  guideArticles,
  resourceArticles,
} from "@/lib/docs/content";

export const docsSearchItems = [
  ...docsHubCards.map((item) => ({
    category: "Documentation",
    description: item.description,
    href: item.href,
    title: item.title,
  })),
  ...apiReferenceCards.map((item) => ({
    category: "API",
    description: item.description,
    href: item.href,
    title: item.title,
  })),
  ...guideArticles.map((item) => ({
    category: item.category,
    description: item.description,
    href: `/guides/${item.slug}`,
    title: item.title,
  })),
  ...resourceArticles.map((item) => ({
    category: item.category,
    description: item.description,
    href: `/resources/${item.slug}`,
    title: item.title,
  })),
  {
    category: "Trust",
    description:
      "Audit trails, PAdES signatures, timestamps, LTV evidence, and verification results.",
    href: "/compliance",
    title: "Compliance and trust",
  },
  {
    category: "Trust",
    description:
      "Advanced and qualified electronic signing options and policy considerations.",
    href: "/qualified-electronic-signature",
    title: "Qualified electronic signatures",
  },
];
