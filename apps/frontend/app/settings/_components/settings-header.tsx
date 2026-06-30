"use client";

import Image from "next/image";
import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import { ThemeModeSwitcher } from "@/app/templates/_components/theme-mode-switcher";
import { UserMenu } from "@/app/templates/_components/user-menu";
import { Button } from "@/components/ui/button";
import { useAppI18n } from "@/lib/i18n/use-app-i18n";

export function SettingsHeader() {
  const { dictionary } = useAppI18n();

  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        aria-label="Signa"
        className="relative block h-16 w-32"
        href="/templates"
      >
        <Image
          alt="Signa"
          className="object-contain object-left"
          fill
          priority
          sizes="128px"
          src="/images/logo.png"
        />
      </Link>

      <nav className="flex items-center gap-4 text-base font-bold">
        <Button
          className="h-8 rounded-full bg-[var(--auth-upgrade)] px-4 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-upgrade-hover)]"
          size="sm"
          type="button"
        >
          {dictionary.common.upgrade}
        </Button>
        <span className="text-[var(--auth-primary)]/70">|</span>
        <Link
          className="flex items-center gap-2 transition-colors hover:text-[var(--auth-primary)]"
          href="/settings/account"
        >
          <SettingsIcon data-icon="inline-start" />
          {dictionary.common.settings}
        </Link>
        <ThemeModeSwitcher />
        <UserMenu />
      </nav>
    </header>
  );
}
