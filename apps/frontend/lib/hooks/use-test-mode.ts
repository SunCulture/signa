"use client"

import { useSyncExternalStore, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getAuthSession,
  startTestingAccount,
  stopTestingAccount,
  subscribeToAuthSessionChange,
} from "@/lib/api/auth"

export function useTestMode() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const isTestMode = useSyncExternalStore(
    subscribeToAuthSessionChange,
    getTestModeSnapshot,
    getTestModeFallback,
  )

  function setTestMode(enabled: boolean) {
    startTransition(() => {
      void (enabled ? startTestingAccount() : stopTestingAccount())
        .then(() => {
          void queryClient.invalidateQueries()
          toast.success(enabled ? "Test mode enabled" : "Test mode disabled")
        })
        .catch((error: unknown) => {
          toast.error("Test mode could not be changed", {
            description: getErrorMessage(error),
          })
        })
    })
  }

  return {
    isPending,
    isTestMode,
    setTestMode,
  }
}

function getTestModeSnapshot(): boolean {
  return getAuthSession()?.account.is_test_mode === true
}

function getTestModeFallback(): boolean {
  return false
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}
