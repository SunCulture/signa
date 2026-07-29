import { BookOpenCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function DocsImage({
  compact,
  name,
}: {
  compact?: boolean;
  name?: string;
}) {
  if (!name) {
    return null;
  }

  return (
    <figure
      aria-label={`Documentation illustration for ${name}`}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-[linear-gradient(135deg,#f6fafd,#e7f8f2)] text-signa-700",
        compact ? "size-24" : "min-h-72 w-full",
      )}
    >
      <BookOpenCheckIcon className={compact ? "size-8" : "size-12"} />
    </figure>
  );
}
