"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "./AuthProvider"
import { supabase } from "../lib/supabaseClient"

export default function Header() {
  const { session, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch nickname from profiles table
  useEffect(() => {
    if (session?.user?.id) {
      const fetchNickname = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", session.user.id)
            .single()

          if (!error && data) {
            setNickname(data.nickname)
          } else {
            // Fallback to user_metadata if profile doesn't exist
            setNickname(session.user.user_metadata?.nickname || null)
          }
        } catch (err) {
          // Fallback to user_metadata on error
          setNickname(session.user.user_metadata?.nickname || null)
        }
      }
      fetchNickname()
    } else {
      setNickname(null)
    }
  }, [session])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen])

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
  }

  const displayName = nickname || session?.user?.email || "User"

  return (
    <header className="relative z-[1000] border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-1 text-xl font-bold">
          <span>VolleyOn</span>
          <span className="text-2xl">🏐</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/posts">Posts</Link>
          {session && <Link href="/chats">Chats</Link>}

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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-300 p-2 hover:bg-gray-50"
                aria-label="Account menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="hidden text-sm font-medium sm:inline">
                  {displayName}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-[1001] mt-2 w-48 rounded-md border bg-white shadow-lg">
                  <div className="py-1">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {nickname || "User"}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {session.user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
