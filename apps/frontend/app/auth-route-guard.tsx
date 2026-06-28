"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  getAuthSession,
  subscribeToAuthSessionChange,
} from "@/lib/api/auth"

const authPrefix = "/auth"
const authenticatedFallback = "/templates"
const loginPath = "/auth/login"
const publicPrefixes = ["/auth", "/ai-assistant", "/s", "/d"]
const publicPaths = ["/"]

export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    function guardRoute() {
      const hasSession = Boolean(getAuthSession())
      const isAuthRoute = pathname.startsWith(authPrefix)
      const isPublicRoute =
        publicPaths.includes(pathname) ||
        publicPrefixes.some((prefix) => pathname.startsWith(prefix))

      if (hasSession && isAuthRoute) {
        router.replace(authenticatedFallback)
        return
      }

      if (!hasSession && !isPublicRoute) {
        router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`)
      }
    }

    guardRoute()

    return subscribeToAuthSessionChange(guardRoute)
  }, [pathname, router])

  return children
}
