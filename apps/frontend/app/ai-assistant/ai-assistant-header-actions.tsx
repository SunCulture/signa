"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"

import {
  getAuthSession,
  subscribeToAuthSessionChange,
} from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/app/templates/_components/user-menu"

export function AiAssistantHeaderActions() {
  const isAuthenticated = useSyncExternalStore(
    subscribeToAuthSessionChange,
    getAuthSnapshot,
    getUnauthenticatedSnapshot
  )

  if (isAuthenticated) {
    return <UserMenu />
  }

  return (
    <div className="flex items-center gap-3">
      <Button asChild className="rounded-full px-5" variant="ghost">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild className="rounded-full px-6">
        <Link href="/auth/register">Get Started</Link>
      </Button>
    </div>
  )
}

function getAuthSnapshot(): boolean {
  return Boolean(getAuthSession())
}

function getUnauthenticatedSnapshot(): boolean {
  return false
}
