import Image from "next/image";

import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-label="Signa"
      className={cn("inline-flex h-12 w-20 items-center", className)}
    >
      <Image
        src="/images/signa-logo.png"
        alt=""
        width={371}
        height={292}
        priority
        className="h-full w-full object-contain object-left"
      />
    </span>
  );
}
