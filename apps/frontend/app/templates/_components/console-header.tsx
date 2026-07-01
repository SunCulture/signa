"use client";

import Image from "next/image";
import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppI18n } from "@/lib/i18n/use-app-i18n";
import { ThemeModeSwitcher } from "./theme-mode-switcher";
import { UserMenu } from "./user-menu";

export function ConsoleHeader() {
  const { dictionary } = useAppI18n();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <Link
        aria-label="Signa dashboard"
        className="relative block h-14 w-28 shrink-0 sm:h-16 sm:w-32"
        href="/templates"
      >
        <Image
          alt="Signa"
          className="object-contain object-left"
          fill
          priority
          sizes="(max-width: 640px) 112px, 128px"
          src="/images/logo.png"
        />
      </Link>

      <nav
        aria-label="Console navigation"
        className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm font-bold sm:gap-3 sm:text-base"
      >
        <Button
          className="hidden h-8 rounded-full bg-[var(--auth-upgrade)] px-4 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-upgrade-hover)] sm:inline-flex"
          size="sm"
          type="button"
        >
          {dictionary.common.upgrade}
        </Button>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[var(--auth-primary)] transition-colors hover:bg-[var(--auth-muted)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/settings/account"
        >
          <SettingsIcon data-icon="inline-start" />
          <span className="hidden sm:inline">{dictionary.common.settings}</span>
        </Link>
        <ThemeModeSwitcher />
        <UserMenu />
      </nav>
    </header>
  );
}
