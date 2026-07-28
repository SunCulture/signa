"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

export function DocsCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 opacity-0 backdrop-blur transition hover:bg-white/10 hover:text-white focus:opacity-100 group-hover:opacity-100"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
