"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BundledLanguage } from "shiki";
import {
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TemplateResponse } from "@/lib/api/templates";
import { cn } from "@/lib/utils";

type TemplateEmbeddingPanelProps = {
  isUpdatingSharedLink: boolean;
  onSharedLinkChange: (enabled: boolean) => Promise<void>;
  onTestingShareChange: (enabled: boolean) => Promise<void>;
  template: TemplateResponse;
};

type FrameworkId = "angular" | "javascript" | "react" | "vue";

const snippetLanguageByFramework: Record<FrameworkId, BundledLanguage> = {
  angular: "typescript",
  javascript: "html",
  react: "tsx",
  vue: "vue",
};

const highlightedSnippetCache = new Map<string, string>();

const frameworks: Array<{
  id: FrameworkId;
  label: string;
  Logo: () => ReactNode;
}> = [
  { id: "javascript", label: "JavaScript", Logo: JavaScriptLogo },
  { id: "react", label: "React", Logo: ReactLogo },
  { id: "vue", label: "Vue", Logo: VueLogo },
  { id: "angular", label: "Angular", Logo: AngularLogo },
];

export function TemplateEmbeddingPanel({
  isUpdatingSharedLink,
  onSharedLinkChange,
  onTestingShareChange,
  template,
}: TemplateEmbeddingPanelProps) {
  const [selectedFramework, setSelectedFramework] =
    useState<FrameworkId>("javascript");
  const embeddingUrl = useEmbeddingUrl(template);
  const snippet = buildEmbeddingSnippet(selectedFramework, embeddingUrl);

  return (
    <div className="space-y-5">
      <CopyableValue label="Template ID" value={template.id} />
      <CopyableValue label="Embedding URL" value={embeddingUrl} />
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">Enable shared link</span>
        <Switch
          checked={template.shared_link}
          disabled={isUpdatingSharedLink}
          onCheckedChange={(checked) => void onSharedLinkChange(checked)}
        />
      </div>
      <FrameworkPicker
        selectedFramework={selectedFramework}
        onSelectFramework={setSelectedFramework}
      />
      <EmbeddingCodeBlock
        language={snippetLanguageByFramework[selectedFramework]}
        snippet={snippet}
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">Share template with Test mode</span>
        <Switch
          checked={template.shared_with_test_mode}
          disabled={isUpdatingSharedLink}
          onCheckedChange={(checked) => void onTestingShareChange(checked)}
        />
      </div>
      {isUpdatingSharedLink ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--auth-muted-foreground)]">
          <Loader2Icon className="size-3.5 animate-spin" />
          Updating shared link
        </div>
      ) : null}
    </div>
  );
}

function useEmbeddingUrl(template: TemplateResponse) {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/d/${template.slug}`;
  }, [template.slug]);
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          className="h-12 rounded-full border-[var(--auth-input-border)] px-5 shadow-none focus-visible:ring-0"
          id={id}
          readOnly
          value={value}
        />
        <Button
          className="h-12 rounded-full bg-[var(--auth-primary)] px-5 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
          onClick={() => void copyToClipboard(value, `${label} copied`)}
          type="button"
        >
          <CopyIcon data-icon="inline-start" />
          COPY
        </Button>
      </div>
    </div>
  );
}

function FrameworkPicker({
  onSelectFramework,
  selectedFramework,
}: {
  onSelectFramework: (framework: FrameworkId) => void;
  selectedFramework: FrameworkId;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {frameworks.map(({ id, label, Logo }) => (
        <Button
          className={cn(
            "h-10 rounded-xl border-[var(--auth-primary)] font-bold",
            selectedFramework === id
              ? "bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)]"
              : "bg-transparent text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]",
          )}
          key={id}
          onClick={() => onSelectFramework(id)}
          type="button"
          variant="outline"
        >
          <Logo />
          {label}
        </Button>
      ))}
    </div>
  );
}

function EmbeddingCodeBlock({
  language,
  snippet,
}: {
  language: BundledLanguage;
  snippet: string;
}) {
  const highlightedSnippet = useHighlightedSnippet(snippet, language);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#2b1136] text-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#7c5b82]" />
          <span className="size-3 rounded-full bg-[#6f5377]" />
          <span className="size-3 rounded-full bg-[#5f4968]" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            className="h-8 rounded-full px-3 text-xs font-bold text-white hover:bg-white/10"
            type="button"
            variant="ghost"
          >
            <a
              href="https://www.docuseal.com/docs/embedding"
              rel="noreferrer"
              target="_blank"
            >
              LEARN MORE
              <ExternalLinkIcon data-icon="inline-end" />
            </a>
          </Button>
          <Button
            className="h-8 rounded-full px-3 text-xs font-bold text-white hover:bg-white/10"
            onClick={() => void copyToClipboard(snippet, "Snippet copied")}
            type="button"
            variant="ghost"
          >
            <CopyIcon data-icon="inline-start" />
            COPY
          </Button>
        </div>
      </div>
      <div className="max-h-64 overflow-auto px-5 py-4 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin] [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0 [&_.shiki]:text-sm [&_.shiki]:leading-7 [&_.shiki_code]:grid [&_.shiki_code]:min-w-max">
        {highlightedSnippet ? (
          <div dangerouslySetInnerHTML={{ __html: highlightedSnippet }} />
        ) : (
          <pre className="m-0 min-w-max p-0 text-sm leading-7 text-white/85">
            <code>{snippet}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

function useHighlightedSnippet(snippet: string, language: BundledLanguage) {
  const cacheKey = `${language}:${snippet}`;
  const [highlightedSnippetState, setHighlightedSnippetState] = useState(() => ({
    cacheKey,
    html: highlightedSnippetCache.get(cacheKey) ?? "",
  }));

  useEffect(() => {
    let isMounted = true;
    const cachedSnippet = highlightedSnippetCache.get(cacheKey);

    if (cachedSnippet) {
      queueMicrotask(() => {
        if (isMounted) {
          setHighlightedSnippetState({ cacheKey, html: cachedSnippet });
        }
      });

      return () => {
        isMounted = false;
      };
    }

    async function highlightSnippet() {
      const { codeToHtml } = await import("shiki");
      const html = await codeToHtml(snippet, {
        lang: language,
        theme: "vitesse-dark",
      });

      highlightedSnippetCache.set(cacheKey, html);

      if (isMounted) {
        setHighlightedSnippetState({ cacheKey, html });
      }
    }

    void highlightSnippet();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, language, snippet]);

  if (highlightedSnippetState.cacheKey !== cacheKey) {
    return "";
  }

  return highlightedSnippetState.html;
}

function buildEmbeddingSnippet(framework: FrameworkId, embeddingUrl: string) {
  if (framework === "react") {
    return buildReactSnippet(embeddingUrl);
  }

  if (framework === "vue") {
    return buildVueSnippet(embeddingUrl);
  }

  if (framework === "angular") {
    return buildAngularSnippet(embeddingUrl);
  }

  return buildJavaScriptSnippet(embeddingUrl);
}

function buildReactSnippet(embeddingUrl: string) {
  return `import React from "react"
import { SignaForm } from '@signajs/react'

export function App() {
  return (
    <SignaForm
      src="${embeddingUrl}"
    />
  );
}`;
}

function buildVueSnippet(embeddingUrl: string) {
  return `<template>
  <SignaForm
    :src="'${embeddingUrl}'"
  />
</template>

<script>
import { SignaForm } from '@signa/vue'

export default {
  name: 'App',
  components: {
    SignaForm
  }
}
</script>`;
}

function buildAngularSnippet(embeddingUrl: string) {
  return `import { Component } from '@angular/core';
import { SignaFormComponent } from '@signa/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SignaFormComponent],
  template: \`
    <div class="app">
      <signa-form
        [src]="'${embeddingUrl}'">
      </signa-form>
    </div>
  \`
})
export class AppComponent {}`;
}

function buildJavaScriptSnippet(embeddingUrl: string) {
  return `<script src="https://cdn.signa.com/js/form.js"></script>

<signa-form data-src="${embeddingUrl}"></signa-form>`;
}

async function copyToClipboard(value: string, message: string) {
  await navigator.clipboard.writeText(value);
  toast.success(message);
}

function JavaScriptLogo() {
  return (
    <span className="flex size-5 items-center justify-center rounded-sm bg-[#ffd600] text-[10px] font-black text-black">
      JS
    </span>
  );
}

function ReactLogo() {
  return (
    <svg className="size-5" viewBox="-11.5 -10.23174 23 20.46348">
      <circle cx="0" cy="0" fill="#61dafb" r="2.05" />
      <g fill="none" stroke="#61dafb" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function VueLogo() {
  return (
    <svg className="size-5" viewBox="0 0 261.76 226.69">
      <g transform="matrix(1.3333 0 0 -1.3333 -76.311 313.34)">
        <g transform="translate(178.06 235.01)">
          <path
            d="m0 0-22.669-39.264-22.669 39.264h-75.491l98.16-170.02 98.16 170.02z"
            fill="#41b883"
          />
        </g>
        <g transform="translate(178.06 235.01)">
          <path
            d="m0 0-22.669-39.264-22.669 39.264h-36.227l58.896-102.01 58.896 102.01z"
            fill="#34495e"
          />
        </g>
      </g>
    </svg>
  );
}

function AngularLogo() {
  return (
    <svg className="size-5" viewBox="-8 0 272 272">
      <path
        d="M0.0996108949,45.522179 L125.908171,0.697276265 L255.103502,44.7252918 L234.185214,211.175097 L125.908171,271.140856 L19.3245136,211.971984 L0.0996108949,45.522179 Z"
        fill="#E23237"
      />
      <path
        d="M255.103502,44.7252918 L125.908171,0.697276265 L125.908171,271.140856 L234.185214,211.274708 L255.103502,44.7252918 Z"
        fill="#B52E31"
      />
      <path
        d="M126.107393,32.27393 L47.7136187,206.692607 L76.9992218,206.194553 L92.7377432,166.848249 L163.063035,166.848249 L180.29572,206.692607 L208.286381,207.190661 L126.107393,32.27393 Z M126.306615,88.155642 L152.803113,143.5393 L102.997665,143.5393 L126.306615,88.155642 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
