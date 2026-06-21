import Link from "next/link"
import { ArrowLeftIcon, BotIcon, CircleHelpIcon, InfoIcon } from "lucide-react"

type SettingsSidebarItem = {
  href?: string
  label: string
  badge?: string
  disabled?: boolean
}

const settingsLinks: readonly SettingsSidebarItem[] = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/e-signature", label: "E-Signature" },
  { href: "/settings/personalization", label: "Personalization" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/teams", label: "Teams" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { badge: "License", href: "/settings/plans", label: "Plans" },
  { href: "/settings/api", label: "API" },
  { disabled: true, label: "Embedding" },
]

type SettingsSection =
  | "Account"
  | "API"
  | "E-Signature"
  | "Integrations"
  | "Notifications"
  | "Personalization"
  | "Plans"
  | "Profile"
  | "Teams"
  | "Users"
  | "Webhooks"

export function SettingsSidebar({ active }: { active: SettingsSection }) {
  return (
    <aside className="w-full shrink-0 md:w-52">
      <Link
        className="mb-4 flex items-center gap-1 text-sm font-medium hover:text-[var(--auth-primary)]"
        href="/templates"
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Back
      </Link>
      <p className="mb-3 border-b border-border pb-3 text-sm font-bold text-[var(--auth-label)]">
        Settings
      </p>
      <nav className="flex flex-col gap-1">
        {settingsLinks.map((item) =>
          item.disabled ? (
            <span
              className="rounded-full px-4 py-2 text-base text-muted-foreground"
              key={`${item.label}:disabled`}
            >
              <span className="flex cursor-default items-center justify-between gap-3">
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-[var(--auth-upgrade)] px-2 py-0.5 text-xs font-bold text-[var(--auth-primary)]">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </span>
          ) : (
            <Link
              className={
                item.label === active
                  ? "rounded-full bg-[var(--auth-muted)] px-4 py-2 text-base"
                  : "rounded-full px-4 py-2 text-base hover:bg-[var(--auth-muted)]"
              }
              href={item.href ?? "#"}
              key={`${item.label}:${item.href}`}
            >
              <span className="flex items-center justify-between gap-3">
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-[var(--auth-upgrade)] px-2 py-0.5 text-xs font-bold text-[var(--auth-primary)]">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          )
        )}
        <label className="mt-1 flex cursor-pointer items-center justify-between rounded-full px-4 py-2 text-base hover:bg-[var(--auth-muted)]">
          <span>Test mode</span>
          <input className="accent-[var(--auth-primary)]" type="checkbox" />
        </label>
      </nav>
      <div className="mx-4 mt-4 border-t border-border pt-3 text-sm">
        <p>Need help? Ask a question:</p>
        <div className="mt-4 flex gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--auth-muted)]">
            <CircleHelpIcon data-icon="inline-start" />
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--auth-muted)]">
            <BotIcon data-icon="inline-start" />
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--auth-muted)]">
            <InfoIcon data-icon="inline-start" />
          </span>
        </div>
        <a
          className="mt-4 block underline underline-offset-4"
          href="mailto:support@signa.local"
        >
          support@signa.local
        </a>
      </div>
    </aside>
  )
}
