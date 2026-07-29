export type ComparisonRow = {
  criterion: string;
  signa: string;
  alternative: string;
};

export type ComparisonFaq = {
  answer: string;
  question: string;
};

export type AlternativePage = {
  category: string;
  compareWhen: string[];
  competitor: string;
  competitorBestFor: string[];
  competitorPositioning: string;
  faqs: ComparisonFaq[];
  headline: string;
  intro: string;
  metaDescription: string;
  migrationSteps: string[];
  primaryKeyword: string;
  rows: ComparisonRow[];
  shortName: string;
  signaBestFor: string[];
  slug: string;
  sources: Array<{ href: string; label: string }>;
  title: string;
};

export const alternativesUpdatedAt = "2026-07-30";

const commonSignaFit = [
  "Teams that need the signing application and document storage inside infrastructure they operate.",
  "Product teams building REST, webhook, React, React Native, or browser-based signing workflows.",
  "Operators that want local or S3-compatible storage, SQLite or PostgreSQL, and direct control of upgrades and backups.",
  "Workflows that benefit from inspectable PDF signatures, certificate chains, RFC 3161 timestamps, and LTV evidence status.",
];

const commonMigrationSteps = [
  "Inventory templates, signer roles, field types, delivery channels, authentication rules, and completion events.",
  "Rebuild one representative template in Signa and map external identifiers and metadata to the existing business record.",
  "Run the workflow in parallel through delivery, mobile signing, completion, webhook processing, audit export, and PDF verification.",
  "Move traffic in batches, retain legacy evidence according to policy, and document the rollback window before decommissioning the previous route.",
];

export const alternatives: AlternativePage[] = [
  {
    slug: "docuseal",
    competitor: "DocuSeal",
    shortName: "DocuSeal",
    category: "Self-hosted eSignature",
    primaryKeyword: "DocuSeal alternative",
    title: "DocuSeal Alternative for Self-Hosted eSignatures",
    metaDescription:
      "Compare Signa and DocuSeal for self-hosted document signing, API compatibility, embedding, storage control, audit evidence, and PDF verification.",
    headline:
      "A DocuSeal alternative for teams building signing into their own stack",
    intro:
      "DocuSeal and Signa both address self-hosted document signing. Signa is most relevant when your evaluation also includes a familiar DocuSeal-style REST surface, embedded web and mobile flows, operational ownership, and deeper inspection of completed PDF trust evidence.",
    competitorPositioning:
      "DocuSeal is an established open-source and commercial eSignature platform with cloud and on-premises deployment, a visual form builder, APIs, webhooks, embedding, automated delivery, and private storage options. It is a strong baseline for teams that value its mature ecosystem and open-source edition.",
    compareWhen: [
      "You are evaluating a DocuSeal-compatible API path but want a separately operated product and roadmap.",
      "You need React Native support alongside web and browser embedding.",
      "PDF certificate, timestamp, and long-term validation inspection are part of the operating workflow.",
      "You want to compare licensing, API usage terms, storage, and upgrade ownership before committing.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Teams that specifically want DocuSeal’s open-source edition or its existing cloud service.",
      "Organizations that already depend on DocuSeal integrations, SDKs, automations, or operational expertise.",
      "Buyers whose required feature set is already proven in a current DocuSeal release.",
    ],
    rows: [
      {
        criterion: "Deployment",
        signa:
          "Docker deployment with SQLite or PostgreSQL, Redis when enabled, and local or S3-compatible document storage.",
        alternative:
          "Cloud plus self-hosted open-source, Pro, and Enterprise options documented by DocuSeal.",
      },
      {
        criterion: "API transition",
        signa:
          "A DocuSeal-compatible shape for core templates, submissions, submitters, attachments, webhooks, and tools.",
        alternative:
          "DocuSeal’s native REST API, official wrappers, webhooks, and embedded components.",
      },
      {
        criterion: "Embedding",
        signa:
          "Hosted signing and builder surfaces for React, React Native, and framework-agnostic browser applications.",
        alternative:
          "Embedded signing and builder capabilities, with availability depending on edition and plan.",
      },
      {
        criterion: "PDF trust",
        signa:
          "PAdES-style signing plus verification output for byte ranges, CMS signatures, certificates, timestamps, and LTV evidence.",
        alternative:
          "Automatic PDF eSignature and platform verification; validate the exact trust output your workflow requires.",
      },
      {
        criterion: "Operating model",
        signa:
          "Your team owns runtime configuration, data location, backups, upgrades, monitoring, and incident response.",
        alternative:
          "Choose between DocuSeal-managed cloud and self-hosted editions with their respective responsibilities.",
      },
    ],
    migrationSteps: [
      "Map current DocuSeal template, submission, submitter, attachment, and webhook calls to Signa’s compatibility surface.",
      ...commonMigrationSteps.slice(1),
    ],
    faqs: [
      {
        question: "Is Signa a drop-in replacement for DocuSeal?",
        answer:
          "No migration should be treated as zero-work. Signa intentionally follows a DocuSeal-compatible shape for core resources, but you should contract-test every endpoint, payload field, embed event, and operational dependency used by your application.",
      },
      {
        question: "Can Signa import every DocuSeal template automatically?",
        answer:
          "Do not assume full template portability. Export your source documents and field schema, rebuild a representative workflow, and verify field coordinates, signer roles, delivery behavior, and completed evidence before bulk migration.",
      },
      {
        question: "Which product should a new team choose?",
        answer:
          "Choose from verified requirements. DocuSeal is compelling when its mature open-source or cloud ecosystem matches the brief. Signa is compelling when deployment ownership, product embedding, compatible API concepts, and inspectable PDF trust controls are central.",
      },
    ],
    sources: [
      {
        label: "DocuSeal on-premises product page",
        href: "https://www.docuseal.com/on-premises",
      },
      {
        label: "DocuSeal security and hosting overview",
        href: "https://www.docuseal.com/security",
      },
      {
        label: "Signa deployment guide",
        href: "/guides/deploy-signa-on-premise",
      },
      {
        label: "Signa API reference",
        href: "/docs/api",
      },
    ],
  },
  {
    slug: "docusign",
    competitor: "Docusign",
    shortName: "Docusign",
    category: "Agreement platform",
    primaryKeyword: "Docusign alternative",
    title: "Self-Hosted Docusign Alternative for Product Teams",
    metaDescription:
      "Evaluate Signa as a self-hosted Docusign alternative for embedded eSignatures, REST APIs, webhooks, document control, and verifiable PDF evidence.",
    headline:
      "A self-hosted Docusign alternative for product-led signing workflows",
    intro:
      "Docusign offers a broad managed agreement platform and a large integration ecosystem. Signa serves a different operating model: deploy the signing stack in your environment, embed its workflows in your product, and control document storage, delivery configuration, evidence, and upgrades.",
    competitorPositioning:
      "Docusign is a mature managed agreement platform with eSignature, web forms, workflow, administration, embedded experiences, and a broad API portfolio. Its scale, integrations, and enterprise services can be the right choice when buying an established managed platform is the priority.",
    compareWhen: [
      "Your search is specifically for a self-hosted Docusign alternative rather than another managed eSignature subscription.",
      "Data location, storage credentials, backup policy, and upgrade timing must remain under your control.",
      "Signing must appear inside your product through API and embed surfaces.",
      "Your team wants a smaller operational surface focused on document signing instead of a broader agreement suite.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Enterprises that prioritize Docusign’s established agreement platform, support organization, and integration marketplace.",
      "Teams that want a vendor-managed service and do not want to operate application infrastructure.",
      "Organizations whose procurement, identity, workflow, or industry requirements are already standardized on Docusign.",
    ],
    rows: [
      {
        criterion: "Deployment",
        signa:
          "Designed for self-hosted Docker deployment with infrastructure and storage controlled by the operator.",
        alternative:
          "Docusign’s primary eSignature and API experience is a managed service; confirm specialist deployment requirements directly.",
      },
      {
        criterion: "Product surface",
        signa:
          "Focused template preparation, signature requests, embedding, APIs, webhooks, teams, and evidence controls.",
        alternative:
          "Broad agreement platform spanning eSignature, web forms, workflows, agreement management, administration, and integrations.",
      },
      {
        criterion: "Embedding",
        signa:
          "React, React Native, and browser embeds backed by the same self-hosted signing service.",
        alternative:
          "Managed embedded signing and agreement experiences through Docusign APIs and partner programs.",
      },
      {
        criterion: "Data operations",
        signa:
          "Operator chooses database, blob storage, mail, SMS, queues, domains, retention, backups, and monitoring.",
        alternative:
          "Docusign operates the service under its platform, plan, regional, and contractual controls.",
      },
      {
        criterion: "Best evaluation question",
        signa:
          "Do we want to own this application and integrate it as infrastructure?",
        alternative:
          "Do we want to buy into a broad, established managed agreement ecosystem?",
      },
    ],
    migrationSteps: commonMigrationSteps,
    faqs: [
      {
        question: "Is Signa affiliated with Docusign?",
        answer:
          "No. Signa is an independent product. Docusign is a trademark of its respective owner and is referenced only to help buyers compare operating models.",
      },
      {
        question: "Can Signa replace every Docusign product?",
        answer:
          "No. Docusign has a broad agreement portfolio. Evaluate only the workflows Signa implements, then keep or integrate another system for capabilities outside that scope.",
      },
      {
        question: "Why consider a self-hosted Docusign alternative?",
        answer:
          "Common reasons include infrastructure ownership, document residency, predictable deployment architecture, deeper customization, and direct control of integrations. Those benefits also transfer more security, reliability, backup, and upgrade responsibility to your team.",
      },
    ],
    sources: [
      {
        label: "Docusign API overview",
        href: "https://www.docusign.com/products/apis",
      },
      {
        label: "Docusign embedded signing overview",
        href: "https://www.docusign.com/partners/isv-embed",
      },
      {
        label: "Signa self-hosting guide",
        href: "/guides/deploy-signa-on-premise",
      },
      {
        label: "Signa embedding documentation",
        href: "/docs/embedding",
      },
    ],
  },
  {
    slug: "pandadoc",
    competitor: "PandaDoc",
    shortName: "PandaDoc",
    category: "Document workflow",
    primaryKeyword: "PandaDoc alternative",
    title: "Self-Hosted PandaDoc Alternative for eSignatures",
    metaDescription:
      "Compare Signa with PandaDoc for document signing, self-hosting, embedded workflows, APIs, templates, audit evidence, and operational control.",
    headline:
      "A PandaDoc alternative when self-hosted signing is the requirement",
    intro:
      "PandaDoc combines eSignatures with document creation, proposals, quotes, content, collaboration, and sales workflows. Signa is narrower by design: it is signing infrastructure for teams that want to prepare, send, embed, track, and verify documents from an environment they operate.",
    competitorPositioning:
      "PandaDoc is a managed document workflow platform for creating, collaborating on, sending, and signing business documents. It is particularly relevant to revenue teams that want proposals, quotes, reusable content, analytics, and eSignature in one service.",
    compareWhen: [
      "Your PandaDoc alternative search is driven by self-hosting or data-control requirements.",
      "Your product already creates business documents and needs a signing engine rather than a sales document suite.",
      "REST automation, webhooks, embeds, and completed PDF verification matter more than proposal analytics.",
      "You are prepared to operate the application, storage, delivery services, and backups.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Sales and revenue teams that want a managed proposal, quote, content, collaboration, and eSignature suite.",
      "Organizations that value PandaDoc’s existing CRM and business workflow integrations.",
      "Teams that prefer a vendor-managed document workspace over operating signing infrastructure.",
    ],
    rows: [
      {
        criterion: "Primary job",
        signa:
          "Prepare, route, embed, complete, and verify signing workflows as product infrastructure.",
        alternative:
          "Create and manage sales and business documents through a broader managed workflow platform.",
      },
      {
        criterion: "Deployment",
        signa:
          "Self-hosted application, database, storage, delivery integrations, and runtime controls.",
        alternative:
          "PandaDoc-managed cloud service with plan and regional options documented by PandaDoc.",
      },
      {
        criterion: "Document creation",
        signa:
          "Reusable templates from PDF, DOCX, or HTML with fields, signer roles, and rendered previews.",
        alternative:
          "Rich document creation, content libraries, proposals, quotes, forms, and collaboration.",
      },
      {
        criterion: "Embedding and API",
        signa:
          "REST, webhooks, and web/mobile embeds connected to your Signa instance.",
        alternative:
          "PandaDoc API and embedded signing sessions connected to its managed platform.",
      },
      {
        criterion: "Operational tradeoff",
        signa:
          "More infrastructure control and responsibility; a narrower signing-focused product boundary.",
        alternative:
          "Less infrastructure ownership; broader commercial document workflow capability.",
      },
    ],
    migrationSteps: commonMigrationSteps,
    faqs: [
      {
        question: "Does Signa replace PandaDoc’s proposal editor?",
        answer:
          "Not as a like-for-like sales content suite. Signa accepts PDF, DOCX, and HTML sources and focuses on templates, fields, routing, signing, APIs, and evidence. Keep your existing document-generation layer if it already serves proposals and quotes.",
      },
      {
        question: "Can Signa embed signing in a SaaS product?",
        answer:
          "Yes. Signa documents supported React, React Native, and browser embed surfaces, plus REST APIs and webhooks for orchestration.",
      },
      {
        question: "When is PandaDoc likely the better fit?",
        answer:
          "PandaDoc may be stronger when the main need is a managed revenue-document workspace with authoring, content, collaboration, proposals, quotes, and established integrations.",
      },
    ],
    sources: [
      {
        label: "PandaDoc signature request overview",
        href: "https://www.pandadoc.com/features/sign/signature-request/",
      },
      {
        label: "PandaDoc embedded signing documentation",
        href: "https://developers.pandadoc.com/docs/embedded-signing",
      },
      {
        label: "Signa template guide",
        href: "/guides/create-a-template",
      },
      {
        label: "Signa API reference",
        href: "/docs/api",
      },
    ],
  },
  {
    slug: "adobe-acrobat-sign",
    competitor: "Adobe Acrobat Sign",
    shortName: "Adobe Sign",
    category: "PDF and eSignature",
    primaryKeyword: "Adobe Sign alternative",
    title: "Self-Hosted Adobe Sign Alternative for Developers",
    metaDescription:
      "Evaluate Signa as a self-hosted Adobe Acrobat Sign alternative for REST APIs, embedded signing, PDF workflows, webhooks, and trust verification.",
    headline:
      "A self-hosted Adobe Acrobat Sign alternative for developer-owned workflows",
    intro:
      "Adobe Acrobat Sign connects eSignature with Adobe’s broader PDF and document ecosystem. Signa is an independent, self-hosted option for teams that want the signing application, storage, API surface, delivery configuration, and verification workflow under their own operational control.",
    competitorPositioning:
      "Adobe Acrobat Sign is a managed eSignature service with REST APIs, agreement workflows, web forms, embedded signing, reminders, audit trails, and connections to Adobe PDF services. It can be a strong fit for organizations already standardized on Adobe.",
    compareWhen: [
      "You need an Adobe Sign alternative that runs in infrastructure your team controls.",
      "Your application requires straightforward template, submission, webhook, and embed workflows.",
      "You want PDF signature verification details available within the same product.",
      "You do not need the full Adobe document and enterprise ecosystem for the target workflow.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Organizations standardized on Adobe Acrobat, Adobe PDF services, and established Adobe enterprise agreements.",
      "Teams that want a managed global eSignature service and do not want to operate the application.",
      "Workflows requiring Adobe-specific integrations, certifications, programs, or support arrangements.",
    ],
    rows: [
      {
        criterion: "Deployment",
        signa:
          "Self-hosted Docker stack with operator-selected database, storage, mail, SMS, and queue services.",
        alternative:
          "Adobe-managed Acrobat Sign service with regional access points and enterprise programs.",
      },
      {
        criterion: "API workflow",
        signa:
          "Templates and submissions, direct PDF/DOCX/HTML creation paths, API keys, and HMAC-signed webhooks.",
        alternative:
          "OAuth-based REST APIs for transient documents, agreements, widgets, signing URLs, events, and more.",
      },
      {
        criterion: "PDF focus",
        signa:
          "Create and inspect signing evidence, certificate chains, timestamps, byte ranges, and LTV status.",
        alternative:
          "Deep connection to the Adobe Acrobat and PDF services ecosystem.",
      },
      {
        criterion: "Embedding",
        signa:
          "Web and mobile embed wrappers backed by your own Signa domain.",
        alternative:
          "Adobe-managed embedded signing and partner programs.",
      },
      {
        criterion: "Team responsibility",
        signa:
          "Your organization owns availability, security hardening, upgrades, backups, and recovery.",
        alternative:
          "Adobe owns service operations under the selected plan and agreement.",
      },
    ],
    migrationSteps: commonMigrationSteps,
    faqs: [
      {
        question: "Does Signa use the Adobe Acrobat Sign API?",
        answer:
          "No. Signa runs as its own application and API. Migration requires mapping Adobe agreements, participants, fields, events, and stored evidence to Signa resources.",
      },
      {
        question: "Can Signa verify signed PDF evidence?",
        answer:
          "Signa includes tooling to inspect PDF byte ranges, CMS signatures, signer and certificate details, timestamps, and long-term validation evidence. Verification results still need to be interpreted against your trust and legal policy.",
      },
      {
        question: "When should a team stay with Adobe Acrobat Sign?",
        answer:
          "Stay with Adobe when its managed service, PDF ecosystem, enterprise support, identity options, or existing integrations are essential and already validated for your organization.",
      },
    ],
    sources: [
      {
        label: "Adobe Acrobat Sign API overview",
        href: "https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/",
      },
      {
        label: "Adobe Acrobat Sign API usage guide",
        href: "https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/apiusage",
      },
      {
        label: "Signa PDF verification guide",
        href: "/guides/verify-signed-pdfs",
      },
      {
        label: "Signa compliance overview",
        href: "/compliance",
      },
    ],
  },
  {
    slug: "dropbox-sign",
    competitor: "Dropbox Sign",
    shortName: "Dropbox Sign",
    category: "Developer eSignature API",
    primaryKeyword: "Dropbox Sign alternative",
    title: "Self-Hosted Dropbox Sign Alternative for APIs",
    metaDescription:
      "Compare Signa and Dropbox Sign for eSignature APIs, embedded signing, templates, webhooks, self-hosting, storage control, and PDF evidence.",
    headline:
      "A self-hosted Dropbox Sign alternative for API-driven products",
    intro:
      "Dropbox Sign, formerly HelloSign, is known for managed eSignature APIs and embedded workflows. Signa is relevant when the same product team also needs to operate the signing service, choose its storage and delivery providers, and inspect completed PDF evidence from its own environment.",
    competitorPositioning:
      "Dropbox Sign is a managed eSignature platform with templates, signature requests, APIs, embedded signing, callbacks, and integrations. Its developer experience and managed operations can be attractive when teams want to integrate rather than host the service.",
    compareWhen: [
      "Your Dropbox Sign alternative search is driven by self-hosting, residency, or infrastructure ownership.",
      "You need web and React Native embed options backed by your own service domain.",
      "Your workflow includes private object storage and operator-managed retention.",
      "PDF trust inspection and a DocuSeal-compatible resource model are useful to the integration.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Teams that want Dropbox Sign’s managed API and embedded signing without operating infrastructure.",
      "Organizations already using Dropbox Sign templates, callbacks, branding, and integrations.",
      "Buyers that value a mature vendor service and support model over deployment ownership.",
    ],
    rows: [
      {
        criterion: "Hosting",
        signa:
          "Runs in your Docker environment with your database, storage, domain, and delivery services.",
        alternative:
          "Dropbox-managed eSignature service consumed through its product and APIs.",
      },
      {
        criterion: "Developer workflow",
        signa:
          "API keys, templates, submissions, attachments, webhooks, and React, React Native, or browser embeds.",
        alternative:
          "Dropbox Sign API, templates, signature requests, embedded signing, and callbacks.",
      },
      {
        criterion: "Storage control",
        signa:
          "Local disk or private S3-compatible storage selected and operated by your team.",
        alternative:
          "Documents are processed under the Dropbox Sign service and its contractual controls.",
      },
      {
        criterion: "Evidence",
        signa:
          "Audit events plus PDF cryptographic, certificate, timestamp, and LTV inspection.",
        alternative:
          "Managed completion records and audit capabilities; verify exact output against your policy.",
      },
      {
        criterion: "Main tradeoff",
        signa:
          "Infrastructure control in exchange for operational responsibility.",
        alternative:
          "Managed convenience in exchange for relying on the vendor service boundary.",
      },
    ],
    migrationSteps: commonMigrationSteps,
    faqs: [
      {
        question: "Is Dropbox Sign the same as HelloSign?",
        answer:
          "Dropbox Sign is the current name of the eSignature product previously known as HelloSign. Existing searches and integrations may still use the HelloSign name.",
      },
      {
        question: "Can Signa replace a HelloSign or Dropbox Sign embed?",
        answer:
          "Signa provides its own hosted signing surfaces and events, but it is not the same SDK. Replace the session-creation flow, embed component, callback handling, and error states in a controlled migration.",
      },
      {
        question: "What is the largest operational difference?",
        answer:
          "With Signa, your team operates the application and its dependencies. With Dropbox Sign, the vendor operates the managed eSignature service.",
      },
    ],
    sources: [
      {
        label: "Dropbox Sign developer documentation",
        href: "https://developers.hellosign.com/",
      },
      {
        label: "Dropbox Sign product overview",
        href: "https://sign.dropbox.com/",
      },
      {
        label: "Signa embedding documentation",
        href: "/docs/embedding",
      },
      {
        label: "Signa storage guide",
        href: "/resources/manage-attachments-and-storage",
      },
    ],
  },
  {
    slug: "signnow",
    competitor: "airSlate SignNow",
    shortName: "SignNow",
    category: "Embedded eSignature API",
    primaryKeyword: "SignNow alternative",
    title: "Self-Hosted SignNow Alternative for Embedded Signing",
    metaDescription:
      "Compare Signa and airSlate SignNow for embedded eSignatures, APIs, webhooks, branding, self-hosting, storage, and document evidence.",
    headline:
      "A self-hosted SignNow alternative for embedded signing",
    intro:
      "airSlate SignNow provides a managed eSignature API with embedded signing, sending, editing, branding, and sandbox capabilities. Signa is designed for teams whose evaluation begins with a different constraint: the application and document data must run in infrastructure they operate.",
    competitorPositioning:
      "airSlate SignNow is a managed eSignature platform and API with embedded signing, embedded sending, an embedded editor, branding, webhooks, SDKs, and a developer sandbox. It can reduce infrastructure work for teams comfortable with its hosted service.",
    compareWhen: [
      "You need a SignNow alternative that is self-hosted rather than another managed API.",
      "Database, object storage, SMTP, SMS, and queue choices must remain in your deployment.",
      "Your product needs web or mobile signing embeds and webhook-driven orchestration.",
      "You want signing and PDF verification in one operator-controlled platform.",
    ],
    signaBestFor: commonSignaFit,
    competitorBestFor: [
      "Teams that want SignNow’s managed API, SDKs, sandbox, and embedded product surfaces.",
      "Organizations that prefer vendor operations and solution support over self-hosting.",
      "Integrations already built around SignNow OAuth, document, invite, and embedded-session concepts.",
    ],
    rows: [
      {
        criterion: "Deployment",
        signa:
          "Self-hosted Docker application with operator-managed persistence and integrations.",
        alternative:
          "airSlate-managed SignNow service and developer sandbox.",
      },
      {
        criterion: "Embedding",
        signa:
          "Signing and builder embeds for React, React Native, and browser applications.",
        alternative:
          "Embedded signing, sending, and editor flows exposed by the SignNow API.",
      },
      {
        criterion: "Authentication",
        signa:
          "Scoped API keys for application workflows plus workspace access controls.",
        alternative:
          "OAuth-based API credentials and access tokens documented by SignNow.",
      },
      {
        criterion: "Branding",
        signa:
          "Workspace theme, primary color, logo, email content, and self-hosted domain controls.",
        alternative:
          "Managed brand customization across its supported embedded and delivery experiences.",
      },
      {
        criterion: "Responsibility",
        signa:
          "Operator owns hardening, availability, backup, recovery, scaling, and upgrades.",
        alternative:
          "Vendor operates the platform; your team owns integration and account configuration.",
      },
    ],
    migrationSteps: commonMigrationSteps,
    faqs: [
      {
        question: "Does Signa support embedded signing?",
        answer:
          "Yes. Signa documents React, React Native, and browser embed options for hosted signing and builder flows.",
      },
      {
        question: "Does Signa provide a managed developer sandbox?",
        answer:
          "Signa supports test-mode workflows inside the product, but a self-hosted evaluation still requires your team to deploy and configure an instance.",
      },
      {
        question: "Which option reduces infrastructure work?",
        answer:
          "A managed service such as SignNow generally removes more application operations. Signa is intended for teams that accept those responsibilities in exchange for deployment and data control.",
      },
    ],
    sources: [
      {
        label: "airSlate SignNow developer overview",
        href: "https://www.signnow.com/developers",
      },
      {
        label: "SignNow embedded signing guide",
        href: "https://www.signnow.com/developers/samples/embedded-signing",
      },
      {
        label: "Signa embedding documentation",
        href: "/docs/embedding",
      },
      {
        label: "Signa security preferences guide",
        href: "/resources/configure-security-preferences",
      },
    ],
  },
];

export function getAlternative(slug: string) {
  return alternatives.find((alternative) => alternative.slug === slug);
}
