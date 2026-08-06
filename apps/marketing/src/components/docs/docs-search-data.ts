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
    keywords: getArticleSearchText(item),
    title: item.title,
  })),
  ...resourceArticles.map((item) => ({
    category: item.category,
    description: item.description,
    href: `/resources/${item.slug}`,
    keywords: getArticleSearchText(item),
    title: item.title,
  })),
  {
    category: "Trust",
    description:
      "Audit trails, PAdES signatures, timestamps, LTV evidence, and verification results.",
    href: "/compliance",
    keywords: "security certificates signing reason audit evidence",
    title: "Compliance and trust",
  },
  {
    category: "Trust",
    description:
      "Advanced and qualified electronic signing options and policy considerations.",
    href: "/qualified-electronic-signature",
    keywords: "QES AES SES qualified trust provider identity",
    title: "Qualified electronic signatures",
  },
];

function getArticleSearchText(
  article: (typeof guideArticles)[number] | (typeof resourceArticles)[number],
) {
  return [
    article.audience,
    ...article.prerequisites,
    ...article.outcomes,
    ...article.sections.flatMap((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
      ...(section.steps?.flatMap((step) => [step.title, step.body]) ?? []),
    ]),
  ].join(" ");
}
