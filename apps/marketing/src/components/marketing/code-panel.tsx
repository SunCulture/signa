import { codeToHtml } from "shiki";

import { cn } from "@/lib/utils";

export async function highlightCode(code: string) {
  return codeToHtml(code, {
    lang: "javascript",
    theme: "github-dark-default",
  });
}

export async function CodePanel({
  code,
  className,
  preview = false,
}: {
  code: string;
  className?: string;
  preview?: boolean;
}) {
  const highlighted = await highlightCode(code);

  return (
    <div
      className={cn(
        "code-panel min-w-0 max-w-full rounded-lg bg-code text-xs shadow-code",
        preview ? "code-panel-preview overflow-hidden" : "overflow-auto",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
