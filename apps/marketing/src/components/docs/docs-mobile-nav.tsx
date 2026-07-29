"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav";
import type { DocsNavGroup } from "@/components/docs/docs-nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function DocsMobileNav({ groups }: { groups: DocsNavGroup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            aria-label="Open documentation navigation"
            className="lg:hidden"
            size="icon-lg"
            variant="outline"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent
        className="w-[min(88vw,22rem)] gap-0 bg-background"
        side="left"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>Documentation</SheetTitle>
          <SheetDescription>
            Guides, administration, API reference, and deployment.
          </SheetDescription>
        </SheetHeader>
        <div
          className="flex min-h-0 flex-1 flex-col"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setOpen(false);
            }
          }}
        >
          <DocsSidebarNav groups={groups} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
