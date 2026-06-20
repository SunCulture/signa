"use client";

import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PendingImportedFieldsBanner({
  isSaving,
  onKeep,
  onRemove,
}: {
  isSaving: boolean;
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border-2 border-[var(--auth-primary)] bg-[var(--auth-upgrade)] px-4 py-2 text-[var(--auth-primary)] shadow-[0_22px_70px_-30px_var(--auth-primary),0_0_0_5px_color-mix(in_srgb,var(--auth-upgrade),transparent_58%)]">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)]">
          <InfoIcon className="size-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-black">
          Uploaded PDF contains form fields. Keep or remove them?
        </p>
        <Button
          className="h-9 rounded-full px-4 text-xs font-black text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-primary),transparent_88%)]"
          disabled={isSaving}
          onClick={onRemove}
          type="button"
          variant="ghost"
        >
          REMOVE
        </Button>
        <Button
          className="h-9 rounded-full bg-[var(--auth-primary)] px-5 text-xs font-black text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
          disabled={isSaving}
          onClick={onKeep}
          type="button"
        >
          KEEP
        </Button>
      </div>
    </div>
  );
}
