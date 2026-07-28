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
const publicPrefixes = [
  "/auth",
  "/ai-assistant",
  "/api/docs",
  "/compliance",
  "/d",
  "/docs",
  "/guides",
  "/qualified-electronic-signature",
  "/resources",
  "/s",
]
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
        publicPrefixes.some((prefix) => hasRoutePrefix(pathname, prefix))

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

function hasRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
