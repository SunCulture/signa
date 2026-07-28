import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CodeBlock,
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";

export const metadata: Metadata = {
  title: "Signa API Reference",
  description:
    "Self-serve Signa API documentation for templates, submissions, submitters, attachments, webhooks, verification, and embedding.",
};

type Method = "DELETE" | "GET" | "POST" | "PUT";

type ApiAttribute = {
  description: string;
  name: string;
  required?: boolean;
  type: string;
};

type ApiEndpoint = {
  attributes?: ApiAttribute[];
  description: string;
  method: Method;
  path: string;
  request: string;
  response: string;
  title: string;
};

type ApiGroup = {
  description: string;
  endpoints: ApiEndpoint[];
  id: string;
  model: ApiAttribute[];
  title: string;
};

const apiGroups: ApiGroup[] = [
  {
    description:
      "Templates store source documents, generated preview pages, signer roles, field schema, folder placement, preferences, and version history.",
    endpoints: [
      {
        attributes: [
          attr("limit", "integer", "Maximum templates to return, up to 100."),
          attr("folder_name", "string", "Filter templates by folder name."),
          attr("archived", "boolean", "Include or filter archived templates."),
          attr("include", "string", "Optional related data such as fields."),
        ],
        description:
          "List templates visible to the authenticated account or team.",
        method: "GET",
        path: "/api/templates",
        request: `curl -G https://signa.example.com/api/templates \\
  -H "X-Auth-Token: {token}" \\
  -d limit=10 \\
  -d include=fields`,
        response: `{
  "data": [
    {
      "id": "12",
      "name": "Service Contract",
      "folder_name": "Default",
      "submitters": [{ "name": "Client" }],
      "fields": []
    }
  ],
  "pagination": { "count": 1, "next": null, "prev": null }
}`,
        title: "List templates",
      },
      {
        attributes: [
          attr("name", "string", "Template name shown in the console.", true),
          attr("documents", "file[]", "One or more PDF documents.", true),
          attr("folder_name", "string", "Folder name. Defaults to Default."),
          attr("external_id", "string", "Your app's idempotent template key."),
          attr("shared_link", "boolean", "Enable public /d/{slug} usage."),
        ],
        description:
          "Create a fillable template from PDF files. Embedded {{field}} text tags are detected where possible.",
        method: "POST",
        path: "/api/templates/pdf",
        request: `curl https://signa.example.com/api/templates/pdf \\
  -H "X-Auth-Token: {token}" \\
  -F name="Service Contract" \\
  -F folder_name="Default" \\
  -F documents[]=@contract.pdf`,
        response: `{
  "id": "12",
  "name": "Service Contract",
  "folder_name": "Default",
  "documents": [
    { "filename": "contract.pdf", "url": "https://signa.example.com/api/storage/blobs/..." }
  ]
}`,
        title: "Create template from PDF",
      },
      {
        attributes: [
          attr("name", "string", "Template name shown in the console.", true),
          attr("document", "file", "DOCX template file.", true),
          attr("folder_name", "string", "Folder name. Defaults to Default."),
          attr("variables", "object", "Optional DOCX variable defaults."),
        ],
        description:
          "Create a template from DOCX. Use [[variables]] for generated document text and {{fields}} for signer inputs.",
        method: "POST",
        path: "/api/templates/docx",
        request: `curl https://signa.example.com/api/templates/docx \\
  -H "X-Auth-Token: {token}" \\
  -F name="Offer Letter" \\
  -F document=@offer.docx`,
        response: `{
  "id": "18",
  "name": "Offer Letter",
  "schema": [{ "name": "offer", "attachment_uuid": "..." }]
}`,
        title: "Create template from DOCX",
      },
    ],
    id: "templates",
    model: [
      attr("id", "string", "Unique template identifier."),
      attr("slug", "string", "Public shared-link slug when enabled."),
      attr("name", "string", "Human-readable template name."),
      attr("schema", "array", "Documents and generated page schema."),
      attr("fields", "array", "Signer fields with type, role, page, and coordinates."),
      attr("submitters", "array", "Roles configured for the template."),
      attr("preferences", "object", "Template-level signing and delivery settings."),
      attr("archived_at", "timestamp", "Set when the template is archived."),
    ],
    title: "Templates",
  },
  {
    description:
      "Submissions are signature requests. They can be created from templates or directly from PDF, DOCX, or HTML for one-off API workflows.",
    endpoints: [
      {
        attributes: [
          attr("template_id", "string", "Filter submissions by template."),
          attr("status", "string", "pending, completed, declined, or expired."),
          attr("email", "string", "Filter by submitter email."),
          attr("include", "string", "Optional related data such as fields."),
        ],
        description:
          "List submissions and their recipient progress for the authenticated account.",
        method: "GET",
        path: "/api/submissions",
        request: `curl -G https://signa.example.com/api/submissions \\
  -H "X-Auth-Token: {token}" \\
  -d template_id=12 \\
  -d status=pending`,
        response: `{
  "data": [
    {
      "id": "36",
      "status": "pending",
      "source": "api",
      "submitters": [{ "email": "client@example.com", "status": "sent" }]
    }
  ]
}`,
        title: "List submissions",
      },
      {
        attributes: [
          attr("template_id", "string", "Template used to create the request.", true),
          attr("submitters", "array", "Recipients with role, email, phone, and values.", true),
          attr("send_email", "boolean", "Queue signature request emails."),
          attr("send_sms", "boolean", "Queue SMS signing links."),
          attr("submitters_order", "string", "preserved or random."),
          attr("auto_sign_owner", "boolean", "Auto-complete the configured owner role."),
          attr("metadata", "object", "Your app's correlation data."),
        ],
        description:
          "Create a signature request from an existing template. This is the primary API path for production apps.",
        method: "POST",
        path: "/api/submissions",
        request: `curl https://signa.example.com/api/submissions \\
  -H "X-Auth-Token: {token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "12",
    "submitters_order": "preserved",
    "send_email": true,
    "metadata": { "contract_id": "SC-1001" },
    "submitters": [
      {
        "role": "Client",
        "email": "client@example.com",
        "values": { "Client Name": "Ada Lovelace" }
      }
    ]
  }'`,
        response: `{
  "id": "36",
  "status": "pending",
  "submitters": [
    {
      "email": "client@example.com",
      "slug": "61102d70-fc1e-4a44-894d-1ea8eeec9305",
      "url": "https://signa.example.com/s/61102d70-fc1e-4a44-894d-1ea8eeec9305"
    }
  ]
}`,
        title: "Create submission from template",
      },
      {
        attributes: [
          attr("name", "string", "Submission name.", true),
          attr("document", "file", "PDF file for one-off signing.", true),
          attr("submitters", "array", "Recipients and roles.", true),
          attr("fields", "array", "Optional explicit field coordinates."),
          attr("send_email", "boolean", "Queue signature request emails."),
        ],
        description:
          "Create a one-off signing request from a PDF without saving a reusable template first.",
        method: "POST",
        path: "/api/submissions/pdf",
        request: `curl https://signa.example.com/api/submissions/pdf \\
  -H "X-Auth-Token: {token}" \\
  -F name="One-off NDA" \\
  -F document=@nda.pdf \\
  -F 'submitters=[{"email":"client@example.com","role":"Client"}]'`,
        response: `{
  "id": "41",
  "source": "api",
  "status": "pending",
  "documents": [{ "name": "One-off NDA", "url": "https://signa.example.com/api/storage/blobs/..." }]
}`,
        title: "Create submission from PDF",
      },
      {
        attributes: [
          attr("id", "string", "Submission identifier.", true),
          attr("merge", "boolean", "Return one combined PDF when available."),
        ],
        description:
          "Download partially filled documents or final signed documents once the submission is complete.",
        method: "GET",
        path: "/api/submissions/:id/documents",
        request: `curl https://signa.example.com/api/submissions/36/documents?merge=true \\
  -H "X-Auth-Token: {token}"`,
        response: `{
  "id": "36",
  "documents": [
    {
      "name": "service-contract-client-2026-07-28.pdf",
      "url": "https://signa.example.com/api/storage/blobs/..."
    }
  ]
}`,
        title: "Get submission documents",
      },
    ],
    id: "submissions",
    model: [
      attr("id", "string", "Unique submission identifier."),
      attr("slug", "string", "Submission route slug."),
      attr("source", "string", "invite, bulk, api, embed, link, pdf, docx, or html."),
      attr("status", "string", "pending, completed, declined, or expired."),
      attr("submitters", "array", "Recipients and their signing status/links."),
      attr("audit_log_url", "string", "Audit trail PDF URL."),
      attr("combined_document_url", "string", "Final merged completed document URL."),
      attr("metadata", "object", "Caller-supplied correlation data."),
    ],
    title: "Submissions",
  },
  {
    description:
      "Submitters represent each signer. Update submitters to prefill values, resend delivery, mark owner auto-sign flows, or inspect signing links.",
    endpoints: [
      {
        attributes: [
          attr("id", "string", "Submitter identifier.", true),
        ],
        description:
          "Retrieve a submitter with signing URL, values, documents, and status.",
        method: "GET",
        path: "/api/submitters/:id",
        request: `curl https://signa.example.com/api/submitters/500001 \\
  -H "X-Auth-Token: {token}"`,
        response: `{
  "id": "500001",
  "email": "client@example.com",
  "role": "Client",
  "status": "sent",
  "url": "https://signa.example.com/s/61102d70-fc1e-4a44-894d-1ea8eeec9305",
  "values": []
}`,
        title: "Get submitter",
      },
      {
        attributes: [
          attr("email", "string", "Updated signer email."),
          attr("phone", "string", "E.164 phone number."),
          attr("values", "object", "Field values keyed by field name."),
          attr("readonly_fields", "array", "Field names the signer cannot edit."),
          attr("send_email", "boolean", "Resend email after updating."),
          attr("completed", "boolean", "Mark submitter completed for allowed auto-sign flows."),
        ],
        description:
          "Update recipient identity, prefilled values, delivery flags, or auto-sign completion state.",
        method: "PUT",
        path: "/api/submitters/:id",
        request: `curl -X PUT https://signa.example.com/api/submitters/500001 \\
  -H "X-Auth-Token: {token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "values": { "Client Name": "Ada Lovelace" },
    "send_email": true
  }'`,
        response: `{
  "id": "500001",
  "email": "client@example.com",
  "status": "sent",
  "values": [{ "field": "Client Name", "value": "Ada Lovelace" }]
}`,
        title: "Update submitter",
      },
    ],
    id: "submitters",
    model: [
      attr("id", "string", "Unique submitter identifier."),
      attr("submission_id", "string", "Parent submission identifier."),
      attr("email", "string", "Signer email address."),
      attr("phone", "string", "Signer phone number."),
      attr("role", "string", "Template role assigned to the signer."),
      attr("slug", "string", "Public signer route slug."),
      attr("url", "string", "Public signing URL."),
      attr("values", "array", "Prefilled or completed field values."),
    ],
    title: "Submitters",
  },
  {
    description:
      "Attachments cover source uploads, generated previews, final signed PDFs, audit logs, and file/image field values.",
    endpoints: [
      {
        attributes: [
          attr("file", "file", "PDF, DOCX, image, or supported attachment file.", true),
        ],
        description:
          "Upload an attachment into the configured storage provider. Production deployments should use S3-compatible storage.",
        method: "POST",
        path: "/api/attachments",
        request: `curl https://signa.example.com/api/attachments \\
  -H "X-Auth-Token: {token}" \\
  -F file=@service-contract.pdf`,
        response: `{
  "id": "att_01j1y75w4c",
  "uuid": "d94e615f-76e3-46d5-8f98-36bdacb8664a",
  "filename": "service-contract.pdf",
  "content_type": "application/pdf",
  "url": "https://signa.example.com/api/attachments/att_01j1y75w4c/download"
}`,
        title: "Upload attachment",
      },
      {
        attributes: [
          attr("id", "string", "Attachment identifier.", true),
        ],
        description:
          "Download or proxy a stored attachment through Signa authorization instead of exposing private storage directly.",
        method: "GET",
        path: "/api/attachments/:id/download",
        request: `curl https://signa.example.com/api/attachments/att_01j1y75w4c/download \\
  -H "X-Auth-Token: {token}"`,
        response: `HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="service-contract.pdf"`,
        title: "Download attachment",
      },
    ],
    id: "attachments",
    model: [
      attr("id", "string", "Unique attachment identifier."),
      attr("uuid", "string", "Stable storage UUID used by template schema."),
      attr("filename", "string", "Original or generated file name."),
      attr("content_type", "string", "Detected MIME type."),
      attr("url", "string", "Authorized download URL."),
      attr("created_at", "timestamp", "Stored object timestamp."),
    ],
    title: "Attachments",
  },
  {
    description:
      "Tools support PDF merge and verification workflows for completed documents and imported third-party signed PDFs.",
    endpoints: [
      {
        attributes: [
          attr("files", "file[]", "PDF files to merge.", true),
        ],
        description:
          "Merge multiple PDF files into one document while preserving page order.",
        method: "POST",
        path: "/api/tools/merge-pdfs",
        request: `curl https://signa.example.com/api/tools/merge-pdfs \\
  -H "X-Auth-Token: {token}" \\
  -F files[]=@part-a.pdf \\
  -F files[]=@part-b.pdf`,
        response: `HTTP/1.1 200 OK
Content-Type: application/pdf`,
        title: "Merge PDFs",
      },
      {
        attributes: [
          attr("file", "file", "Signed PDF to verify.", true),
        ],
        description:
          "Verify Signa or third-party PDF signatures. Results include byte range integrity, signer, timestamp, trust chain, and LTV evidence status.",
        method: "POST",
        path: "/api/tools/verify",
        request: `curl https://signa.example.com/api/tools/verify \\
  -H "X-Auth-Token: {token}" \\
  -F file=@signed-document.pdf`,
        response: `{
  "signatures": [
    {
      "valid": true,
      "trusted": true,
      "signer": "client@example.com",
      "subfilter": "ETSI.CAdES.detached",
      "timestamp": "2026-07-28T10:15:30.000Z",
      "ltv_status": "valid"
    }
  ]
}`,
        title: "Verify signed PDF",
      },
    ],
    id: "tools",
    model: [
      attr("valid", "boolean", "Signature cryptographic and ByteRange status."),
      attr("trusted", "boolean", "Certificate trust root classification."),
      attr("signer", "string", "Signer identity extracted from Signa metadata or certificate."),
      attr("subfilter", "string", "PDF signature subfilter, such as ETSI.CAdES.detached."),
      attr("timestamp", "timestamp", "RFC3161 timestamp token time when present."),
      attr("ltv_status", "string", "valid, missing, invalid, or unavailable."),
    ],
    title: "Tools",
  },
];

export default function ApiDocsPage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <article>
          <ApiIntro />
          <ApiDocsCallout />
          <ApiProtocolBasics />
          <ApiWorkflowExamples />
          {apiGroups.map((group) => (
            <ApiGroupSection group={group} key={group.id} />
          ))}
        </article>
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function attr(
  name: string,
  type: string,
  description: string,
  required = false,
): ApiAttribute {
  return { description, name, required, type };
}

function ApiIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">API reference</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Use Signa from backend systems with API keys, templates, submissions,
        submitters, attachments, webhooks, verification tools, and embedded
        signing packages.
      </p>
    </>
  );
}

function ApiDocsCallout() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">
          Exhaustive OpenAPI
        </p>
        <h2 className="mt-1 text-2xl font-black">Use Swagger for every field</h2>
      </div>
      <Button asChild className="rounded-full font-black">
        <Link href="/api/docs">
          Open live API docs
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}

function ApiProtocolBasics() {
  return (
    <section className="mt-14 scroll-mt-24 border-t border-border pt-10" id="authentication">
      <h2 className="text-2xl font-black">Authentication</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Create an API key in Settings &gt; API and send it as X-Auth-Token.
        Keys inherit the active account/team scope. Store keys server-side,
        rotate them when team access changes, and never expose them in browser
        or mobile clients.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CodeBlock language="bash" title="Authenticated request">
          {`curl https://signa.example.com/api/templates \\
  -H "X-Auth-Token: {token}"`}
        </CodeBlock>
        <CodeBlock language="json" title="Common error">
          {`{
  "statusCode": 401,
  "message": "Unauthorized",
  "requestId": "9df2e9b5-4f08-4bd1-bc3e-eab7f7d05f9a"
}`}
        </CodeBlock>
      </div>
      <ApiProtocolNotes />
    </section>
  );
}

function ApiProtocolNotes() {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2" id="pagination">
      <ApiNote
        description="List endpoints accept limit and filter parameters where supported. Responses include pagination metadata when the endpoint returns a collection."
        title="Pagination"
      />
      <ApiNote
        description="Errors include request IDs so API consumers can match user-facing failures with backend logs and webhook delivery logs."
        id="errors"
        title="Errors"
      />
    </div>
  );
}

function ApiNote({
  description,
  id,
  title,
}: {
  description: string;
  id?: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-24 rounded-2xl border border-border bg-card p-5" id={id}>
      <h3 className="font-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

function ApiWorkflowExamples() {
  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Production workflow</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          "Create a template in the console or with /api/templates/pdf.",
          "Create a submission with roles, submitters, values, metadata, and delivery flags.",
          "Open the returned /s/{submitterSlug} in hosted, React, or React Native signing.",
          "Listen for submission.completed webhooks and verify the HMAC signature.",
          "Download final documents and audit logs from the submission documents endpoint.",
          "Verify PDFs when your workflow needs cryptographic trust-chain reporting.",
        ].map((step, index) => (
          <li className="rounded-2xl border border-border bg-card p-5" key={step}>
            <span className="text-sm font-black text-emerald-500">
              {index + 1}
            </span>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ApiGroupSection({ group }: { group: ApiGroup }) {
  return (
    <section className="mt-16 scroll-mt-24 border-t border-border pt-10" id={group.id}>
      <h2 className="text-3xl font-black">{group.title}</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        {group.description}
      </p>
      <ApiModel model={group.model} title={`${group.title} model`} />
      {group.endpoints.map((endpoint) => (
        <ApiEndpoint endpoint={endpoint} key={endpoint.title} />
      ))}
    </section>
  );
}

function ApiModel({
  model,
  title,
}: {
  model: ApiAttribute[];
  title: string;
}) {
  return (
    <section className="mt-10">
      <h3 className="font-black">{title}</h3>
      <ApiAttributes attributes={model} />
    </section>
  );
}

function ApiEndpoint({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <ApiEndpointHeader endpoint={endpoint} />
      <div className="mt-6 grid items-start gap-x-12 gap-y-6 xl:grid-cols-[1fr_420px]">
        <div>
          <p className="leading-7 text-muted-foreground">
            {endpoint.description}
          </p>
          {endpoint.attributes ? (
            <ApiAttributes attributes={endpoint.attributes} />
          ) : null}
        </div>
        <ApiEndpointExamples endpoint={endpoint} />
      </div>
    </section>
  );
}

function ApiEndpointHeader({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <>
      <div className="flex items-center gap-x-3">
        <MethodBadge method={endpoint.method} />
        <span className="size-1 rounded-full bg-border" />
        <span className="font-mono text-xs text-muted-foreground">
          {endpoint.path}
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-black">{endpoint.title}</h3>
    </>
  );
}

function MethodBadge({ method }: { method: Method }) {
  const colorByMethod: Record<Method, string> = {
    DELETE: "border-rose-300 bg-rose-400/10 text-rose-500",
    GET: "border-emerald-300 bg-emerald-400/10 text-emerald-500",
    POST: "border-sky-300 bg-sky-400/10 text-sky-500",
    PUT: "border-amber-300 bg-amber-400/10 text-amber-500",
  };

  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[0.625rem] font-black ${colorByMethod[method]}`}
    >
      {method}
    </span>
  );
}

function ApiAttributes({ attributes }: { attributes: ApiAttribute[] }) {
  return (
    <ul className="mt-4 divide-y divide-border">
      {attributes.map((attribute) => (
        <ApiAttributeRow attribute={attribute} key={attribute.name} />
      ))}
    </ul>
  );
}

function ApiAttributeRow({ attribute }: { attribute: ApiAttribute }) {
  return (
    <li className="py-4">
      <dl className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <dt className="sr-only">Name</dt>
        <dd>
          <code className="rounded-md border border-border bg-secondary px-2 py-1 text-sm font-black">
            {attribute.name}
          </code>
        </dd>
        <dt className="sr-only">Type</dt>
        <dd className="font-mono text-xs text-muted-foreground">
          {attribute.type}
        </dd>
        {attribute.required ? (
          <dd className="text-xs font-black text-rose-500">required</dd>
        ) : null}
        <dt className="sr-only">Description</dt>
        <dd className="w-full text-sm leading-6 text-muted-foreground">
          {attribute.description}
        </dd>
      </dl>
    </li>
  );
}

function ApiEndpointExamples({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-24">
      <CodeBlock language="bash" title="Request">
        {endpoint.request}
      </CodeBlock>
      <CodeBlock language="json" title="Response">
        {endpoint.response}
      </CodeBlock>
    </aside>
  );
}
