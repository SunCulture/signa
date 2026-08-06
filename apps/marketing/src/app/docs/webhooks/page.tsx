import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  CodeBlock,
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { appUrl } from "@/lib/landing-content";
import { webhookEvents } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Webhooks",
  description:
    "Webhook event types, HMAC signatures, retries, and delivery logging in Signa.",
  alternates: { canonical: "/docs/webhooks" },
};

export default function WebhooksDocsPage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <article>
          <WebhooksIntro />
          <RegisteringWebhooks />
          <ConsumingWebhooks />
          <WebhookDeliveryRules />
          <WebhookEventTypes />
          <WebhookSecurity />
          <WebhookTesting />
        </article>
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function WebhooksIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">Webhooks</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Integrate your application with Signa lifecycle events. Webhooks notify
        your system when forms are viewed, submissions are completed, templates
        change, or delivery workflows need attention.
      </p>
    </>
  );
}

function RegisteringWebhooks() {
  return (
    <section className="mt-14 scroll-mt-24" id="registering-webhooks">
      <h2 className="text-2xl font-black">Registering webhooks</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Create a webhook URL from{" "}
        <Link
          className="font-black text-emerald-500"
          href={`${appUrl}/settings/webhooks`}
        >
          Settings &gt; Webhooks
        </Link>
        . Pick the events your integration needs, save the URL, and copy the
        HMAC secret for request verification.
      </p>
    </section>
  );
}

function ConsumingWebhooks() {
  return (
    <section className="mt-12 scroll-mt-24" id="consuming-webhooks">
      <h2 className="text-2xl font-black">Consuming webhooks</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Inspect the event type, verify the HMAC signature, then process the
        payload. Signa stores response status, response body, errors, retries,
        and manual resend attempts for production debugging.
      </p>
      <WebhookPayloadExample />
      <Link
        className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-500"
        href="#event-types"
      >
        See all event types
        <ArrowRightIcon className="size-4" />
      </Link>
    </section>
  );
}

function WebhookDeliveryRules() {
  return (
    <section className="mt-12 scroll-mt-24" id="delivery-and-retries">
      <h2 className="text-2xl font-black">Delivery and retries</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Webhooks are delivered from the queue so the signer experience is not
        blocked by your endpoint. Treat every webhook as at-least-once delivery:
        persist the event id, make processing idempotent, and return a 2xx
        response only after your application has safely accepted the payload.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          "Use event.id as your idempotency key.",
          "Store raw request bodies until HMAC verification completes.",
          "Inspect delivery attempts, response codes, response bodies, and stored errors from Signa activity logs.",
        ].map((item) => (
          <div className="rounded-2xl border border-border bg-card p-5" key={item}>
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WebhookPayloadExample() {
  return (
    <CodeBlock language="json" title="Example webhook payload">
      {`{
  "id": "evt_01h9w8d7e6",
  "type": "submission.completed",
  "payload": {
    "id": "36",
    "template_id": "12",
    "submitters": [
      {
        "email": "client@example.com",
        "status": "completed"
      }
    ]
  }
}`}
    </CodeBlock>
  );
}

function WebhookEventTypes() {
  return (
    <section className="mt-14 scroll-mt-24 border-t border-border pt-10" id="event-types">
      <h2 className="text-2xl font-black">Event types</h2>
      <div className="mt-6 grid gap-x-12 lg:grid-cols-[1fr_420px]">
        <ul className="divide-y divide-border">
          {webhookEvents.map((event) => (
            <WebhookEventRow event={event} key={event} />
          ))}
        </ul>
        <WebhookVerificationExample />
      </div>
    </section>
  );
}

function WebhookEventRow({ event }: { event: string }) {
  return (
    <li className="py-4">
      <code className="rounded-md border border-border bg-secondary px-2 py-1 text-sm font-black">
        {event}
      </code>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Fired when the {event.split(".").join(" ")} lifecycle transition
        occurs.
      </p>
    </li>
  );
}

function WebhookVerificationExample() {
  return (
    <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0">
      <CodeBlock language="ts" title="Verify a request">
        {`import crypto from "node:crypto";

const signature = request.headers["x-signa-signature"];
const expected = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");

if (signature !== expected) {
  throw new Error("Webhook signature mismatch");
}`}
      </CodeBlock>
    </aside>
  );
}

function WebhookSecurity() {
  return (
    <section className="mt-14 scroll-mt-24 border-t border-border pt-10" id="security">
      <h2 className="text-2xl font-black">Security</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Every webhook includes a signature header generated from the raw request
        payload and the webhook secret. Compare signatures before trusting the
        payload, and rotate secrets from the webhook settings page when needed.
      </p>
      <CodeBlock language="bash" title="Local endpoint test">
        {`curl https://your-app.example.com/webhooks/signa \\
  -H "Content-Type: application/json" \\
  -H "x-signa-signature: {computed_hmac}" \\
  -d '{"id":"evt_test","type":"submission.completed","payload":{"id":"36"}}'`}
      </CodeBlock>
    </section>
  );
}

function WebhookTesting() {
  return (
    <section className="mt-14 scroll-mt-24 border-t border-border pt-10" id="production-checklist">
      <h2 className="text-2xl font-black">Production checklist</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          "Use HTTPS with a publicly reachable endpoint.",
          "Verify x-signa-signature against the raw request body.",
          "Reject unverified payloads before parsing business data.",
          "Persist event ids and make handlers idempotent.",
          "Return quickly and move expensive work to your own queue.",
          "Use submission metadata/external_id to map events back to your records.",
        ].map((item) => (
          <li className="rounded-2xl border border-border bg-card p-5" key={item}>
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
