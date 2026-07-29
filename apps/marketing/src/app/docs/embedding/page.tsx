import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CodeBlock,
  DocsContainer,
  DocsFooter,
  DocsShell,
} from "@/components/docs/docs-shell";
import { embeddingExamples } from "@/lib/docs/content";

export const metadata: Metadata = {
  title: "Signa Embedded Signing",
  description:
    "Embed Signa signing and builder flows in React, React Native, and browser applications.",
  alternates: { canonical: "/docs/embedding" },
};

export default function EmbeddingDocsPage() {
  return (
    <DocsShell>
      <DocsContainer className="py-16">
        <EmbeddingIntro />
        <SupportedLibraries />
        <EmbeddingExamples />
        <CdnUsage />
        <DocsFooter />
      </DocsContainer>
    </DocsShell>
  );
}

function EmbeddingIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-normal">
        Embedded signing and builder
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
        Use the same Signa signing and template-builder flows inside product
        surfaces. The supported SDKs are thin wrappers around the hosted Signa
        form and builder URLs, which keeps signing logic centralized and mobile
        behavior consistent.
      </p>
    </>
  );
}

function SupportedLibraries() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black">Official libraries</h2>
      <div className="mt-8 grid gap-x-16 gap-y-12 border-t border-border pt-10 md:grid-cols-2 xl:grid-cols-3">
        <LibraryCard
          description="Use SignaForm and SignaBuilder in React, Next.js, Remix, Vite, and other browser React apps."
          icon={<ReactMark />}
          title="React"
        />
        <LibraryCard
          description="Use a WebView wrapper for Expo and React Native apps that need native navigation around hosted signing."
          icon={<ReactMark />}
          title="React Native"
        />
        <LibraryCard
          description="Load Signa custom elements from a CDN when you need framework-agnostic signing or builder embeds."
          icon={<BrowserMark />}
          title="Browser"
        />
      </div>
    </section>
  );
}

function LibraryCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="grid grid-cols-[44px_1fr] gap-4">
      <span className="flex size-11 items-center justify-center">{icon}</span>
      <div>
        <h3 className="font-black">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <span className="mt-4 inline-flex text-sm font-black text-emerald-500">
          Supported now
        </span>
      </div>
    </article>
  );
}

function EmbeddingExamples() {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">Usage examples</h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {embeddingExamples.map((example) => (
          <article key={example.title} className="space-y-4">
            <h3 className="font-black">{example.title}</h3>
            <CodeBlock language="bash" title="Install">
              {example.command}
            </CodeBlock>
            <CodeBlock language="tsx" title="Usage">
              {example.code}
            </CodeBlock>
          </article>
        ))}
      </div>
    </section>
  );
}

function CdnUsage() {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="text-2xl font-black">CDN delivery</h2>
      <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
        Published package builds are available from npm-backed CDNs such as
        jsDelivr. Pin a version for production embeds, and point the element at
        the Signa host that owns the signing route.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CodeBlock language="html" title="Signing form script">
          {`<script src="https://cdn.jsdelivr.net/npm/@signajs/react@0.1.4/dist/form.js"></script>
<signa-form src="https://signa.example.com/s/{submitterSlug}"></signa-form>`}
        </CodeBlock>
        <CodeBlock language="html" title="Builder script">
          {`<script src="https://cdn.jsdelivr.net/npm/@signajs/react@0.1.4/dist/builder.js"></script>
<signa-builder host="https://signa.example.com" token="{builderToken}"></signa-builder>`}
        </CodeBlock>
      </div>
    </section>
  );
}

function ReactMark() {
  return (
    <svg aria-hidden="true" className="size-10" viewBox="-11.5 -10.23174 23 20.46348">
      <circle cx="0" cy="0" fill="#61dafb" r="2.05" />
      <g fill="none" stroke="#61dafb" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function BrowserMark() {
  return (
    <svg aria-hidden="true" className="size-10" fill="none" viewBox="0 0 40 40">
      <rect height="28" rx="7" stroke="#1b365d" strokeWidth="3" width="32" x="4" y="7" />
      <path d="M5 16h30" stroke="#1b365d" strokeWidth="3" />
      <circle cx="11" cy="11.5" fill="#ef7a4d" r="1.8" />
      <circle cx="17" cy="11.5" fill="#9be3c8" r="1.8" />
    </svg>
  );
}
