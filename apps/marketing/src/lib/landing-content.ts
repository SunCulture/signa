import {
  BadgeCheck,
  Braces,
  FileStack,
  MonitorSmartphone,
  ScrollText,
  Send,
  ServerCog,
  UsersRound,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import { appUrl } from "@/lib/site-config";

export { appUrl };

export type Feature = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    title: "Template builder",
    description:
      "Turn PDF, DOCX, or HTML files into reusable templates with signer roles, fields, and rendered previews.",
    href: "/guides/quick-start",
    icon: FileStack,
  },
  {
    title: "Signature requests",
    description:
      "Route documents to one or many recipients by email or SMS, with signing order and live status tracking.",
    href: "/guides/send-documents-to-recipients",
    icon: Send,
  },
  {
    title: "Embedded signing",
    description:
      "Place hosted signing and builder flows inside React, React Native, or browser applications.",
    href: "/docs/embedding",
    icon: MonitorSmartphone,
  },
  {
    title: "API and webhooks",
    description:
      "Automate templates and submissions through REST, then continue workflows with signed delivery events.",
    href: "/docs/api",
    icon: Webhook,
  },
  {
    title: "Audit evidence",
    description:
      "Preserve signer activity, device and delivery events, timestamps, and completed document records.",
    href: "/compliance",
    icon: ScrollText,
  },
  {
    title: "PDF trust",
    description:
      "Create and inspect PAdES-style signatures, certificate chains, RFC 3161 timestamps, and LTV evidence.",
    href: "/guides/verify-signed-pdfs",
    icon: BadgeCheck,
  },
  {
    title: "Teams and access",
    description:
      "Organize work with teams, roles, invitations, scoped API keys, and authenticator-app MFA.",
    href: "/resources/manage-teams",
    icon: UsersRound,
  },
  {
    title: "Self-hosted control",
    description:
      "Run with Docker, PostgreSQL or SQLite, Redis, and local or S3-compatible document storage.",
    href: "/guides/deploy-signa-on-premise",
    icon: ServerCog,
  },
];

export const submissionCode = `const response = await fetch(
  "https://signa.example.com/api/submissions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": process.env.SIGNA_API_KEY,
    },
    body: JSON.stringify({
      template_id: "tmpl_service_agreement",
      send_email: true,
      submitters: [
        { role: "Client", email: "ada@northstar.co" },
        { role: "Company", email: "legal@northstar.co" },
      ],
      metadata: { agreement_id: "AGR-2026-1842" },
    }),
  },
);`;

export const observableCode = `const response = await fetch("/api/submissions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Token": process.env.SIGNA_API_KEY,
  },
  body: JSON.stringify({
    template_id: "tmpl_service_agreement",
    send_email: true,
    submitters: [
      { role: "Client", email: "ada@northstar.co" },
      { role: "Company", email: "legal@northstar.co" },
    ],
  }),
});`;

export const tabDemos = [
  {
    value: "template",
    label: "Create a template",
    description:
      "Create reusable signing schemas from PDF, DOCX, or HTML source documents.",
    bullets: [
      "Assign fields to named signer roles.",
      "Inspect rendered pages before sending.",
      "Organize templates into folders.",
    ],
    code: `const form = new FormData();
form.append("name", "Service agreement");
form.append("documents", contractFile);

const template = await fetch(
  "https://signa.example.com/api/templates/pdf",
  {
    method: "POST",
    headers: { "X-Auth-Token": process.env.SIGNA_API_KEY },
    body: form,
  },
).then((response) => response.json());`,
  },
  {
    value: "submission",
    label: "Send a signature request",
    description:
      "Create a multi-party request and let Signa deliver each signer their secure link.",
    bullets: [
      "Preserve sequential signing order.",
      "Prefill values and readonly fields.",
      "Map requests back with metadata.",
    ],
    code: submissionCode,
  },
  {
    value: "embed",
    label: "Embed signing",
    description:
      "Render the hosted form inside your product and react to completion without rebuilding signing UI.",
    bullets: [
      "Use React or React Native packages.",
      "Host the signing route on your Signa instance.",
      "Handle load, complete, decline, and error events.",
    ],
    code: `import { SignaForm } from "@signajs/react";

export function ContractSigning({ signingUrl }) {
  return (
    <SignaForm
      src={signingUrl}
      withDownloadButton
      onComplete={(event) => {
        console.log("Signed", event.detail);
      }}
    />
  );
}`,
  },
  {
    value: "verify",
    label: "Verify a signed PDF",
    description:
      "Inspect Signa or third-party signed PDFs through the same verification pipeline used by the app.",
    bullets: [
      "Validate the PDF byte range and CMS signature.",
      "Inspect signer, signing time, and trust chain.",
      "Report timestamp and LTV evidence status.",
    ],
    code: `const form = new FormData();
form.append("file", signedPdf);

const verification = await fetch(
  "https://signa.example.com/api/tools/verify",
  {
    method: "POST",
    headers: { "X-Auth-Token": process.env.SIGNA_API_KEY },
    body: form,
  },
).then((response) => response.json());`,
  },
  {
    value: "webhook",
    label: "Handle completion webhooks",
    description:
      "Continue your workflow from a signed event and validate that Signa sent the request.",
    bullets: [
      "Subscribe to form and submission events.",
      "Verify the HMAC request signature.",
      "Inspect and resend delivery attempts.",
    ],
    code: `import { createHmac, timingSafeEqual } from "node:crypto";

const expected = createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");

const trusted = timingSafeEqual(
  Buffer.from(expected),
  Buffer.from(request.headers["x-signa-signature"]),
);

if (trusted && event.type === "submission.completed") {
  await archiveCompletedAgreement(event.data);
}`,
  },
];

export const deploymentPaths = [
  {
    title: "Self-host Signa",
    label: "Infrastructure",
    description:
      "Operate the complete signing platform in your own environment.",
    accent: "bg-mint",
    action: "Deployment guide",
    href: "/guides/deploy-signa-on-premise",
    primary: true,
    icon: ServerCog,
    items: [
      "Docker with SQLite or PostgreSQL",
      "Local or S3-compatible storage",
      "Redis, SMTP, SMS, and OAuth integrations",
      "Registration and runtime controls",
    ],
  },
  {
    title: "Embed Signa",
    label: "Product teams",
    description:
      "Bring document preparation and signing into your web or mobile product.",
    accent: "bg-sky-200",
    action: "Embedding docs",
    href: "/docs/embedding",
    primary: false,
    icon: Braces,
    items: [
      "React signing form and builder",
      "React Native signing view",
      "Browser custom elements",
      "Completion and decline callbacks",
    ],
  },
  {
    title: "Govern with Signa",
    label: "Regulated workflows",
    description:
      "Configure evidence, verification, and signer policy around your requirements.",
    accent: "bg-coral-200",
    action: "Explore compliance",
    href: "/compliance",
    primary: false,
    icon: BadgeCheck,
    items: [
      "Ordered activity and audit records",
      "PAdES and certificate verification",
      "Timestamp and LTV evidence reporting",
      "MFA and signing-policy controls",
    ],
  },
];

export type LicenseTerm = "annual" | "three_year";

export const licenseOptions: Record<
  LicenseTerm,
  {
    label: string;
    price: number;
    period: string;
    monthlyEquivalent: number;
    note: string;
  }
> = {
  annual: {
    label: "1 year",
    price: 560,
    period: "per year",
    monthlyEquivalent: 47,
    note: "Renew annually",
  },
  three_year: {
    label: "3 years",
    price: 1380,
    period: "for 3 years",
    monthlyEquivalent: 38,
    note: "Save $300 over annual pricing",
  },
};

export const licenseFeatures = [
  "Unlimited signature requests",
  "Custom branding and email content",
  "Automated reminders and webhooks",
  "Gmail and Outlook delivery",
  "Conditional fields and formulas",
  "User roles, teams, and SSO-ready architecture",
  "Bulk send from CSV or XLSX",
  "SMS invitations and verification",
  "API and embedding access",
];
