"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FlaskConicalIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTestMode } from "@/lib/hooks/use-test-mode"

const hiddenPrefixes = ["/auth", "/s", "/d"]

export function TestModeAlert() {
  const pathname = usePathname()
  const { isPending, isTestMode, setTestMode } = useTestMode()

  if (!isTestMode || hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <div className="fixed left-1/2 top-3 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg">
      <FlaskConicalIcon className="size-4 shrink-0" />
      <span>
        Test mode is active.{" "}
        <Link className="underline underline-offset-2" href="/settings/api">
          View testing API settings
        </Link>
      </span>
      <Button
        aria-label="Exit test mode"
        className="size-7 rounded-full text-amber-950 hover:bg-amber-200"
        disabled={isPending}
        onClick={() => setTestMode(false)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
