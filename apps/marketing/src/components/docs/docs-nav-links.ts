export type DocsNavLink = {
  href: string;
  label: string;
};

export type DocsNavGroup = {
  label: string;
  links: DocsNavLink[];
};

export const docsNavGroups: DocsNavGroup[] = [
  {
    label: "Start",
    links: [
      { href: "/docs", label: "Documentation home" },
      { href: "/guides/quick-start", label: "Quick start" },
      { href: "/guides/create-a-template", label: "Create a template" },
      {
        href: "/guides/add-fields-and-signer-roles",
        label: "Fields and signer roles",
      },
    ],
  },
  {
    label: "Use Signa",
    links: [
      {
        href: "/guides/send-documents-to-recipients",
        label: "Send documents",
      },
      {
        href: "/guides/bulk-send-with-a-recipient-list",
        label: "Bulk send",
      },
      { href: "/guides/sign-yourself", label: "Sign yourself" },
      { href: "/guides/publish-a-start-form", label: "Public start forms" },
      {
        href: "/guides/track-a-signature-request",
        label: "Track requests",
      },
      {
        href: "/guides/download-and-verify-completed-documents",
        label: "Completed documents",
      },
      { href: "/guides", label: "All user guides" },
    ],
  },
  {
    label: "Administer",
    links: [
      { href: "/resources/quick-start", label: "Workspace checklist" },
      {
        href: "/resources/personalize-branding-and-email",
        label: "Branding and email",
      },
      {
        href: "/resources/configure-notifications",
        label: "Notifications",
      },
      { href: "/resources/manage-users", label: "Users" },
      { href: "/resources/manage-teams", label: "Teams" },
      {
        href: "/resources/configure-security-preferences",
        label: "Security preferences",
      },
      {
        href: "/resources/configure-signing-certificates",
        label: "Certificates and trust",
      },
      { href: "/resources", label: "All admin resources" },
    ],
  },
  {
    label: "Develop",
    links: [
      { href: "/docs/api#authentication", label: "Authentication" },
      { href: "/docs/api#templates", label: "Templates API" },
      { href: "/docs/api#submissions", label: "Submissions API" },
      { href: "/docs/api#submitters", label: "Submitters API" },
      { href: "/docs/api#attachments", label: "Attachments API" },
      { href: "/docs/api#tools", label: "Tools API" },
      { href: "/docs/webhooks", label: "Webhooks" },
      { href: "/docs/embedding", label: "Embedding and SDKs" },
      { href: "/resources/manage-api-keys", label: "Manage API keys" },
    ],
  },
  {
    label: "Operate",
    links: [
      {
        href: "/resources/deploy-signa-on-premise",
        label: "On-premise deployment",
      },
      {
        href: "/resources/manage-attachments-and-storage",
        label: "Attachments and storage",
      },
      {
        href: "/resources/connect-integrations",
        label: "Integrations",
      },
      { href: "/guides/troubleshooting", label: "Troubleshooting" },
      { href: "/compliance", label: "Compliance and trust" },
      {
        href: "/qualified-electronic-signature",
        label: "Qualified signatures",
      },
    ],
  },
];

export const guideLinks = docsNavGroups
  .filter((group) => ["Start", "Use Signa", "Develop"].includes(group.label))
  .flatMap((group) => group.links);

export const resourceLinks = docsNavGroups
  .filter((group) => ["Administer", "Operate"].includes(group.label))
  .flatMap((group) => group.links);

export const docsPageLinks = Array.from(
  new Map(
    docsNavGroups
      .flatMap((group) => group.links)
      .map((link) => [
        link.href.split("#")[0],
        {
          href: link.href.split("#")[0],
          label: link.label,
        },
      ]),
  ).values(),
);
