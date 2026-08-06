"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { Wordmark } from "./wordmark";

const navItems = [
  { label: "Platform", href: "/#platform" },
  { label: "Developers", href: "/#developers" },
  { label: "Trust", href: "/#trust" },
  { label: "Deploy", href: "/#deployment" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="site-gutter">
        <div className="page-frame border-b bg-white/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex h-9 items-center justify-between">
            <Link href="/" aria-label="Go to homepage">
              <Wordmark />
            </Link>

            <nav
              className="hidden items-center gap-5 md:flex"
              aria-label="Primary"
            >
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-ink transition-colors hover:text-slate-500"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants(),
                  "h-9 bg-mint px-4 text-sm text-ink shadow-button hover:bg-mint/85",
                )}
              >
                Open Signa
              </Link>
            </nav>

            <Sheet>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="inline-flex size-9 items-center justify-center text-ink md:hidden"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="data-[side=right]:inset-x-2 data-[side=right]:w-auto data-[side=right]:max-w-none overflow-hidden border-x bg-white p-0"
              >
                <div
                  aria-hidden
                  className="signa-flow signa-flow-menu pointer-events-none absolute inset-x-0 bottom-0 h-[64%]"
                />
                <SheetHeader className="relative z-10 px-6 pt-20">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Browse the Signa site.
                  </SheetDescription>
                  <Wordmark className="text-xl" />
                </SheetHeader>
                <nav
                  aria-label="Mobile navigation"
                  className="relative z-10 mt-36 flex flex-col px-6"
                >
                  {navItems.map((item) => (
                    <SheetClose
                      key={item.label}
                      nativeButton={false}
                      render={
                        <Link
                          href={item.href}
                          className="text-[clamp(3rem,15vw,4.5rem)] font-semibold leading-[1.05] tracking-normal text-ink"
                        />
                      }
                    >
                      {item.label}
                    </SheetClose>
                  ))}
                </nav>
                <div className="relative z-10 mt-auto p-6">
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/sign-in"
                        className={cn(
                          buttonVariants(),
                          "h-10 w-full bg-mint text-ink shadow-button hover:bg-mint/90",
                        )}
                      />
                    }
                  >
                    Open Signa
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
