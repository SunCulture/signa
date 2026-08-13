import { Suspense } from "react"

import { SettingsHeader } from "../_components/settings-header"
import { UsersSettingsBody } from "../_components/users-settings-body"

export default function SettingsUsersPage() {
  return (
    <main
      className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]"
      id="main-content"
      tabIndex={-1}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 md:px-2">
        <SettingsHeader />
        <Suspense fallback={null}>
          <UsersSettingsBody />
        </Suspense>
      </div>
    </main>
  )
}
