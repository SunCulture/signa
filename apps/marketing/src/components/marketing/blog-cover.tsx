import Image from "next/image";

import { cn } from "@/lib/utils";

export function BlogCover({
  alt,
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  src,
}: {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  src: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-signa-100",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
      />
    </div>
  );
}
