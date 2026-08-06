export type BlogSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
  callout?: string;
};

export type BlogSource = {
  label: string;
  href: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  dateLabel: string;
  readingTime: string;
  category: string;
  image: string;
  sections: BlogSection[];
  sources: BlogSource[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "designing-an-electronic-signature-evidence-trail",
    title: "Designing an electronic signature evidence trail",
    excerpt:
      "A practical model for recording signer intent, attribution, document integrity, and delivery without collecting unnecessary data.",
    publishedAt: "2026-07-24",
    dateLabel: "July 24, 2026",
    readingTime: "8 min read",
    category: "Trust",
    image: "/images/blog-evidence-trail.webp",
    sections: [
      {
        id: "start-with-the-question",
        title: "Start with the question your evidence must answer",
        paragraphs: [
          "An electronic signature is not made trustworthy by a decorative signature image. The workflow needs to show which record was presented, who acted, what they intended to do, when the action occurred, and whether the completed document changed afterward.",
          "In the United States, the E-SIGN Act says a signature or contract cannot be denied legal effect solely because it is electronic. That rule does not remove the need to prove consent, identity, authority, or the contents of the record in a particular dispute. Treat legal validity and technical evidence as related, but separate, design concerns.",
        ],
        callout:
          "Use this article as an engineering checklist, not jurisdiction-specific legal advice. Confirm retention, consent, and signature requirements with qualified counsel.",
      },
      {
        id: "record-the-workflow",
        title: "Record the workflow, not just the final click",
        paragraphs: [
          "A useful audit trail follows a request from creation to completion. Link every event with stable submission, document, recipient, and interaction identifiers so an investigator does not have to reconstruct the sequence from unrelated server logs.",
          "OWASP recommends that application logs make the when, where, who, and what of an event available. For signing, that model maps cleanly to timestamps, the Signa instance and route, the recipient or authenticated user, and the action and outcome.",
        ],
        bullets: [
          "Request created, document version fixed, and signer roles assigned.",
          "Invitation queued, delivered, bounced, opened, or resent.",
          "Signing session started and required authentication completed.",
          "Fields changed, consent acknowledged, signature applied, or request declined.",
          "Completed PDF generated, cryptographic evidence attached, and webhook delivered.",
        ],
      },
      {
        id: "minimize-sensitive-data",
        title: "Keep evidence useful without turning logs into a liability",
        paragraphs: [
          "More data is not automatically better evidence. Store normalized event data and protect it with the same tenant and authorization boundaries as the signed document. Avoid writing passwords, access tokens, private keys, raw session identifiers, or full document contents into logs.",
          "IP address, user agent, phone number, and location can be useful in a risk model, but they can also be personal data. Capture them only when the workflow has a defined purpose, retention period, and access policy.",
        ],
      },
      {
        id: "verify-the-record",
        title: "Make the record independently checkable",
        paragraphs: [
          "Preserve the exact completed PDF, its digest, the ordered audit events, and the identifiers needed to trace the request in Signa. Where the workflow requires stronger document evidence, add a PDF digital signature and timestamp so integrity checks do not depend only on an application database.",
          "The operational test is simple: an authorized reviewer should be able to export the completed record, understand the sequence without tribal knowledge, and verify the document without editing production data.",
        ],
      },
    ],
    sources: [
      {
        label: "15 U.S.C. §7001 — General rule of validity",
        href: "https://uscode.house.gov/view.xhtml?req=%28title%3A15+section%3A7001%28c%29+edition%3Aprelim%29",
      },
      {
        label: "OWASP Logging Cheat Sheet",
        href: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
      },
    ],
  },
  {
    slug: "pades-timestamps-and-long-term-validation",
    title: "PAdES, timestamps, and long-term PDF validation",
    excerpt:
      "Understand what PDF digital signatures protect, what RFC 3161 timestamps add, and how long-term validation evidence fits together.",
    publishedAt: "2026-07-18",
    dateLabel: "July 18, 2026",
    readingTime: "9 min read",
    category: "PDF trust",
    image: "/images/blog-pades-validation.webp",
    sections: [
      {
        id: "electronic-vs-digital",
        title: "Electronic signatures and digital signatures solve different layers",
        paragraphs: [
          "An electronic signing workflow records a person’s action and intent. A PDF digital signature uses cryptography to protect a defined byte range in the file and associate that protection with a signing certificate. A strong system can use both: workflow evidence for the human transaction and PAdES evidence for document integrity.",
          "ETSI EN 319 142-1 defines PAdES baseline signatures for PDF documents. The profiles build on PDF signatures and add standardized signed and unsigned attributes for interoperable business and government use cases.",
        ],
      },
      {
        id: "baseline-levels",
        title: "Choose the baseline level from the retention requirement",
        paragraphs: [
          "PAdES baseline levels are cumulative. B-B contains the basic signed attributes. B-T adds trusted time evidence. B-LT incorporates validation material such as certificate and revocation evidence. B-LTA adds archive timestamps intended to support validation over longer periods.",
          "Do not select the highest label by default. Start with how long a document must remain verifiable, what trust services are available, and whether your validation process can refresh evidence before algorithms or certificates age out.",
        ],
      },
      {
        id: "timestamp",
        title: "A timestamp proves existence, not business approval",
        paragraphs: [
          "RFC 3161 describes a Time-Stamp Authority that binds a digest to a time and provides proof that the datum existed at that instant. This can help show that a signature existed before a certificate was revoked.",
          "A timestamp does not prove that the signer had authority, understood the agreement, or completed the surrounding workflow. Keep the timestamp token and the application audit trail, because they answer different questions.",
        ],
      },
      {
        id: "validation-pipeline",
        title: "Build validation as a repeatable pipeline",
        paragraphs: [
          "A production verifier should parse the PDF safely, identify signed byte ranges, verify the CMS signature value, build and evaluate the certificate chain, inspect signing and timestamp attributes, and report available revocation and long-term validation evidence.",
          "Return structured results instead of a single green check. Teams need to distinguish an intact signature from an untrusted chain, an expired certificate, missing revocation evidence, or a malformed timestamp.",
        ],
        bullets: [
          "Document integrity and modification status.",
          "Signer certificate subject, issuer, validity, and chain result.",
          "Claimed signing time versus trusted timestamp time.",
          "Revocation evidence and the time at which it was evaluated.",
          "PAdES profile and any validation warnings.",
        ],
      },
    ],
    sources: [
      {
        label: "ETSI EN 319 142-1 V1.2.1 — PAdES baseline signatures",
        href: "https://www.etsi.org/deliver/etsi_EN/319100_319199/31914201/01.02.01_60/en_31914201v010201p.pdf",
      },
      {
        label: "RFC 3161 — Time-Stamp Protocol",
        href: "https://www.rfc-editor.org/rfc/rfc3161.html",
      },
    ],
  },
  {
    slug: "reliable-webhooks-for-signing-workflows",
    title: "Reliable webhooks for signing workflows",
    excerpt:
      "Verify raw payloads, acknowledge quickly, process idempotently, and make every completion event observable.",
    publishedAt: "2026-07-11",
    dateLabel: "July 11, 2026",
    readingTime: "7 min read",
    category: "Developers",
    image: "/images/blog-reliable-webhooks.webp",
    sections: [
      {
        id: "authenticate-before-parsing",
        title: "Authenticate the raw request before trusting its fields",
        paragraphs: [
          "A webhook endpoint is public by design. Verify its HMAC signature against the exact raw request body before parsing or acting on the event. If a proxy or framework rewrites the body first, the computed digest can change.",
          "Use a high-entropy secret, compare signatures in constant time, require HTTPS, and rotate secrets through a controlled deployment process. GitHub’s webhook guidance follows the same core pattern: protect deliveries with a secret and do not let intermediaries modify the signed payload.",
        ],
        code: `import { createHmac, timingSafeEqual } from "node:crypto";

const expected = createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");

const trusted = timingSafeEqual(
  Buffer.from(expected),
  Buffer.from(signature),
);`,
      },
      {
        id: "acknowledge-fast",
        title: "Acknowledge quickly, then do durable work",
        paragraphs: [
          "Validate the request, persist the delivery identifier and payload, enqueue the business operation, and return a successful response. Downloading completed PDFs, updating a CRM, or sending another email should happen outside the request path.",
          "Fast acknowledgement reduces duplicate deliveries and prevents a temporary downstream slowdown from looking like a webhook failure.",
        ],
      },
      {
        id: "idempotency",
        title: "Assume every event can arrive more than once",
        paragraphs: [
          "At-least-once delivery means duplicates are normal. Put a unique constraint on the provider delivery identifier or the pair of event type and event identifier. If the same event arrives again, return success without repeating side effects.",
          "Business operations should also be idempotent. An event record can be unique while a downstream job is retried after partially completing.",
        ],
        bullets: [
          "Store received, verified, queued, processed, and failed timestamps.",
          "Keep a bounded retry count with backoff and a dead-letter state.",
          "Expose the last response and error without logging secrets.",
          "Support deliberate redelivery after the underlying issue is fixed.",
        ],
      },
      {
        id: "reconcile",
        title: "Use webhooks for speed and the API for reconciliation",
        paragraphs: [
          "A webhook should move your workflow forward quickly, but it should not be your only source of truth. Periodically reconcile important submissions against the Signa API so a prolonged outage or configuration error cannot leave records permanently stale.",
        ],
      },
    ],
    sources: [
      {
        label: "GitHub — Validating webhook deliveries",
        href: "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
      },
      {
        label: "GitHub — Webhook best practices",
        href: "https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks",
      },
    ],
  },
  {
    slug: "embed-document-signing-in-react",
    title: "Embed document signing in React without losing control",
    excerpt:
      "A production integration pattern for loading states, signer URLs, lifecycle callbacks, and server-owned completion.",
    publishedAt: "2026-07-04",
    dateLabel: "July 4, 2026",
    readingTime: "6 min read",
    category: "Tutorials",
    image: "/images/blog-react-embed.webp",
    sections: [
      {
        id: "server-owns-request",
        title: "Let your server own request creation",
        paragraphs: [
          "Create the submission from your backend, not from browser code that contains an API key. Map your internal agreement identifier into Signa metadata, persist the returned submission and submitter identifiers, and send only the signer-specific URL to the client.",
          "The browser should know enough to render the signing session, but it should not have credentials that can create or inspect unrelated submissions.",
        ],
      },
      {
        id: "render",
        title: "Render the hosted workflow with explicit lifecycle states",
        paragraphs: [
          "The Signa React package loads the hosted custom element and exposes initialization, load, completion, and decline callbacks. Keep a stable container size while it loads so the page does not jump when the document becomes ready.",
        ],
        code: `import { SignaForm } from "@signajs/react";

export function Agreement({ signingUrl }) {
  return (
    <SignaForm
      host="https://signa.example.com"
      src={signingUrl}
      withDownloadButton
      onLoad={() => setReady(true)}
      onComplete={() => setLocallyComplete(true)}
    />
  );
}`,
      },
      {
        id: "completion",
        title: "Treat the callback as UX, not final authority",
        paragraphs: [
          "Use the completion callback to update the immediate interface, but confirm the durable status from your backend or a verified webhook before releasing protected resources. Client events can be interrupted, replayed, or lost when a tab closes.",
          "This split gives the signer a responsive experience while the server remains responsible for entitlement and downstream processing.",
        ],
      },
      {
        id: "production-checklist",
        title: "Production checklist",
        paragraphs: [
          "Pin the embed script version, allow the Signa host in your content security policy, test keyboard and mobile behavior, and provide a clear recovery path for expired or already-completed links.",
        ],
        bullets: [
          "Skeleton and explicit load-error state.",
          "Stable minimum height at desktop and mobile widths.",
          "Decline and expiration routes owned by the parent product.",
          "Verified webhook or API reconciliation after completion.",
          "No API keys or unrestricted tokens in client JavaScript.",
        ],
      },
    ],
    sources: [],
  },
  {
    slug: "self-hosted-esigning-production-checklist",
    title: "A production checklist for self-hosted e-signing",
    excerpt:
      "Move from a local Docker demo to a resilient deployment with durable storage, mail delivery, backups, and observable document processing.",
    publishedAt: "2026-06-27",
    dateLabel: "June 27, 2026",
    readingTime: "8 min read",
    category: "Operations",
    image: "/images/blog-self-hosted.webp",
    sections: [
      {
        id: "separate-state",
        title: "Separate application containers from durable state",
        paragraphs: [
          "Treat the Signa frontend and backend as replaceable processes. Keep the database, uploaded source files, generated previews, completed PDFs, and audit records on durable services with independent backup policies.",
          "SQLite is useful for a single-node evaluation. PostgreSQL is the safer default once multiple processes, automated backups, or high availability matter. Configure the connection through DATABASE_URL so the deployment shape can change without application code changes.",
        ],
      },
      {
        id: "storage",
        title: "Make document storage explicit",
        paragraphs: [
          "Local storage is simple and can be correct for one host with a durable volume. S3-compatible storage is usually easier to scale across multiple application instances. In either model, block public listing, use least-privilege credentials, encrypt backups, and test restoration.",
          "The database and blob store form one logical record. Backing up one without the other can produce submissions that exist but no longer have their source or completed documents.",
        ],
      },
      {
        id: "delivery",
        title: "Configure delivery before inviting users",
        paragraphs: [
          "A signing platform can appear healthy while invitations never leave the queue. Configure SMTP, sender identity, public application URL, and any SMS provider before onboarding a team. Test delivery, bounce handling, and links from outside the deployment network.",
        ],
        code: `DATABASE_URL=postgresql://signa:password@db:5432/signa
APP_URL=https://sign.example.com
STORAGE_DRIVER=s3
SMTP_HOST=smtp.example.com
SMTP_PORT=587`,
        callout:
          "Use secret management for real credentials. The values above show the deployment contract, not production secrets.",
      },
      {
        id: "operate",
        title: "Operate the document pipeline, not only the HTTP service",
        paragraphs: [
          "Monitor upload failures, preview generation latency, queue depth, email delivery, webhook retries, and completed-PDF generation. A green health endpoint does not prove that a signer can see a document or receive an invitation.",
        ],
        bullets: [
          "Restore-tested database and object-storage backups.",
          "TLS termination and a stable public URL.",
          "Resource limits for document conversion workers.",
          "Metrics and alerts for queues and failed jobs.",
          "A documented upgrade and rollback procedure.",
        ],
      },
    ],
    sources: [
      {
        label: "OWASP Logging Cheat Sheet",
        href: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
      },
    ],
  },
  {
    slug: "choose-signer-authentication-by-risk",
    title: "Choose signer authentication by risk, not habit",
    excerpt:
      "Match email links, SMS, MFA, and stronger identity controls to the consequence of a mistaken or fraudulent signature.",
    publishedAt: "2026-06-20",
    dateLabel: "June 20, 2026",
    readingTime: "7 min read",
    category: "Security",
    image: "/images/blog-signer-authentication.webp",
    sections: [
      {
        id: "separate-routing",
        title: "Delivery proves routing, not identity",
        paragraphs: [
          "An email link shows that a person obtained a message sent to an address. It does not automatically prove the legal identity, authority, or current control of the intended signer. The same distinction applies to SMS.",
          "Start by rating the consequence of the wrong person signing: financial exposure, access to sensitive data, regulated obligations, reversibility, and the availability of human review.",
        ],
      },
      {
        id: "step-up",
        title: "Step up controls only where the risk requires it",
        paragraphs: [
          "Low-risk acknowledgements may be adequately served by a unique expiring link and a clear consent step. Higher-risk agreements can add an authenticated account, one-time code, signing reason, identity document check, or an approval step by another role.",
          "Avoid collecting stronger identity data without a purpose. Every added factor creates accessibility, recovery, support, retention, and privacy obligations.",
        ],
      },
      {
        id: "phishing",
        title: "Know what MFA does and does not protect",
        paragraphs: [
          "NIST distinguishes multi-factor authentication from phishing-resistant authentication. Manually entered one-time passwords can add protection, but they are not phishing-resistant because an impostor verifier can relay them.",
          "For workflows with high account-takeover risk, evaluate cryptographic authenticators such as WebAuthn in the account authentication layer. Keep the signing event linked to the authenticated session and document the assurance policy applied.",
        ],
      },
      {
        id: "record-policy",
        title: "Record the policy decision with the signature event",
        paragraphs: [
          "Store which authentication policy was required, which checks succeeded, the authenticated user or recipient identifier, and the interaction identifier that connects authentication to signing. Do not put authenticator secrets or raw tokens in the audit trail.",
        ],
        bullets: [
          "Policy name and version.",
          "Required and completed factors.",
          "Authentication and signing timestamps.",
          "Result, failure reason, and recovery path.",
          "Reviewer or exception approval where applicable.",
        ],
      },
    ],
    sources: [
      {
        label: "NIST SP 800-63B — Authentication and authenticator management",
        href: "https://pages.nist.gov/800-63-4/sp800-63b.html",
      },
      {
        label: "NIST Digital Identity Model",
        href: "https://pages.nist.gov/800-63-4/sp800-63/model/",
      },
    ],
  },
];

export const blogCategories = [
  "All",
  ...Array.from(new Set(blogPosts.map((post) => post.category))),
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
