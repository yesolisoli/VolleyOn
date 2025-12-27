"use client"

import Link from "next/link"
import { useAuth } from "./AuthProvider"

export default function Header() {
  const { session, loading, signOut } = useAuth()

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="font-bold">
          Volleyball Community
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/posts">Posts</Link>
          <Link href="/games">Games</Link>
          <Link href="/map">Map</Link>

          {!loading && !session && (
            <>
              <Link href="/login" className="rounded border px-3 py-1">
                Login
              </Link>
              <Link href="/signup" className="rounded bg-black px-3 py-1 text-white">
                Sign up
              </Link>
            </>
          )}

          {!loading && session && (
            <button onClick={signOut} className="rounded border px-3 py-1">
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
