import Link from "next/link";
import { ArrowRightIcon, MessageCircleIcon, XIcon } from "lucide-react";

export function DocsFooter() {
  return (
    <footer className="mt-20 border-t border-border pt-10">
      <DocsFeedbackRow />
      <DocsCopyrightRow />
    </footer>
  );
}

function DocsFeedbackRow() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Was this page helpful?</span>
        <span className="inline-flex rounded-full border border-border bg-background p-1">
          <button className="rounded-full px-4 py-1 font-bold hover:bg-secondary">
            Yes
          </button>
          <button className="rounded-full px-4 py-1 font-bold hover:bg-secondary">
            No
          </button>
        </span>
      </div>
      <div className="text-right">
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-black"
          href="/guides/quick-start"
        >
          Next
          <ArrowRightIcon className="size-4" />
        </Link>
        <p className="mt-3 font-black">Quickstart</p>
      </div>
    </div>
  );
}

function DocsCopyrightRow() {
  return (
    <div className="mt-12 flex items-center justify-between border-t border-border py-8 text-sm text-muted-foreground">
      <span>Copyright 2026. All rights reserved.</span>
      <div className="flex items-center gap-5">
        <XIcon className="size-4" />
        <MessageCircleIcon className="size-4" />
      </div>
    </div>
  );
}
