"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "./AuthProvider"

const PUBLIC_PATHS = new Set(["/login", "/signup"])

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!session && !PUBLIC_PATHS.has(pathname)) {
      router.replace("/login")
    }
  }, [loading, session, pathname, router])

  if (loading) return null
  if (!session && !PUBLIC_PATHS.has(pathname)) return null

  return <>{children}</>
}
