import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";

import { DocsCopyButton } from "@/components/docs/docs-copy-button";

export async function CodeBlock({
  children,
  language = "bash",
  title,
}: {
  children: string;
  language?: BundledLanguage;
  title: string;
}) {
  const html = await codeToHtml(children.trim(), {
    lang: language,
    themes: {
      dark: "github-dark",
      light: "github-dark",
    },
  });

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#1b1b20] text-sm text-slate-200 shadow-xl dark:bg-[#111318]">
      <div className="flex border-b border-white/10 px-5 py-3">
        <span className="font-black text-emerald-400">{title}</span>
      </div>
      <div
        className="[&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:p-5 [&_.shiki]:text-xs [&_.shiki]:leading-6 [&_pre]:overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <DocsCopyButton code={children.trim()} />
    </div>
  );
}
