import { Suspense } from "react"

import { SettingsHeader } from "../_components/settings-header"
import { TeamsSettingsBody } from "../_components/teams-settings-body"

export default function SettingsTeamsPage() {
  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 md:px-2">
        <SettingsHeader />
        <Suspense fallback={null}>
          <TeamsSettingsBody />
        </Suspense>
      </div>
    </main>
  )
}
