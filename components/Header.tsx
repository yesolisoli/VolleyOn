"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "./AuthProvider"
import { supabase } from "../lib/supabaseClient"

type ChatRoom = {
  id: string
  title: string
  is_private: boolean
  updated_at: string
}

export default function Header() {
  const router = useRouter()
  const { session, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch nickname and profile photo from profiles table
  useEffect(() => {
    if (session?.user?.id) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("nickname, profile_photo_url")
            .eq("id", session.user.id)
            .single()

          if (!error && data) {
            setNickname(data.nickname)
            setProfilePhotoUrl(data.profile_photo_url)
          } else {
            // Fallback to user_metadata if profile doesn't exist
            setNickname(session.user.user_metadata?.nickname || null)
            setProfilePhotoUrl(null)
          }
        } catch (err) {
          // Fallback to user_metadata on error
          setNickname(session.user.user_metadata?.nickname || null)
          setProfilePhotoUrl(null)
        }
      }
      fetchProfile()
      fetchRooms()
    } else {
      setNickname(null)
      setProfilePhotoUrl(null)
      setRooms([])
    }
  }, [session])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
        setRoomsOpen(false)
      }
    }

    if (dropdownOpen || roomsOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen, roomsOpen])

  const fetchRooms = async () => {
    if (!session?.user?.id) return

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from("chat_room_members")
        .select("room_id")
        .eq("user_id", session.user.id)

      if (membershipsError) {
        console.error("Error fetching room memberships:", membershipsError)
        return
      }

      const roomIds = memberships?.map((member) => member.room_id) || []
      if (roomIds.length === 0) {
        setRooms([])
        return
      }

      const { data: roomsData, error: roomsError } = await supabase
        .from("chat_rooms")
        .select("id, title, is_private, updated_at")
        .in("id", roomIds)
        .order("updated_at", { ascending: false })

      if (roomsError) {
        console.error("Error fetching rooms:", roomsError)
        return
      }

      setRooms(roomsData || [])
    } catch (error) {
      console.error("Error fetching rooms:", error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    setRoomsOpen(false)
    router.push("/login")
  }

  const displayName = nickname || session?.user?.email || "User"

  return (
    <header className="relative z-[1000] border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🏐</span>
          <span>VolleyOn</span>
        </Link>

        <div className="flex items-center gap-4">
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
            <div className="relative flex items-center gap-3" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={() => {
                    setRoomsOpen(!roomsOpen)
                    setDropdownOpen(false)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                  aria-label="Chat rooms"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a4 4 0 01-4 4H7l-4 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
                  </svg>
                </button>

                {roomsOpen && (
                  <div className="absolute right-0 z-[1001] mt-2 w-64 rounded-md border bg-white text-left shadow-lg">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-semibold text-gray-900">Your rooms</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {rooms.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-500">No rooms yet.</p>
                      ) : (
                        rooms.map((room) => (
                          <Link
                            key={room.id}
                            href={`/rooms/${room.id}`}
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setRoomsOpen(false)}
                          >
                            <span className="truncate">{room.title}</span>
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                room.is_private
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {room.is_private ? "Private" : "Public"}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-300 p-1 hover:bg-gray-50"
                aria-label="Account menu"
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      // Hide image and show icon if image fails to load
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
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
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-[1001] mt-2 w-48 rounded-md border bg-white text-left shadow-lg">
                  <div className="flex flex-col py-1">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {nickname || "User"}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-start px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
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
