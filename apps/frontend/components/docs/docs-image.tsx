"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocsImage({
  compact,
  name,
}: {
  compact?: boolean;
  name?: string;
}) {
  const [isMissing, setIsMissing] = useState(false);

  if (!name) {
    return null;
  }

  const className = getDocsImageClassName(compact);

  if (!isMissing) {
    return (
      <AvailableDocsImage
        className={className}
        compact={compact}
        name={name}
        onMissing={() => setIsMissing(true)}
      />
    );
  }

  return <MissingDocsImage className={className} name={name} />;
}

function getDocsImageClassName(compact?: boolean) {
  return cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-input bg-[linear-gradient(135deg,#ffffff,#eef5fa)] text-center shadow-inner",
    compact ? "size-24" : "min-h-72 w-full",
  );
}

function AvailableDocsImage({
  className,
  compact,
  name,
  onMissing,
}: {
  className: string;
  compact?: boolean;
  name: string;
  onMissing: () => void;
}) {
  return (
    <figure className={cn(className, "relative")}>
      <Image
        alt={`Signa documentation screenshot: ${name}`}
        className="h-full w-full object-cover"
        fill
        onError={onMissing}
        sizes={compact ? "96px" : "(min-width: 1024px) 760px, 100vw"}
        src={`/images/docs/${name}`}
      />
    </figure>
  );
}

function MissingDocsImage({
  className,
  name,
}: {
  className: string;
  name: string;
}) {
  return (
    <figure className={className}>
      <div className="px-4">
        <BookOpenIcon className="mx-auto size-8 text-[#ef7a4d]" />
        <figcaption className="mt-3 text-xs font-black text-muted-foreground">
          /images/docs/{name}
        </figcaption>
      </div>
    </figure>
  );
}
