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

type DirectChat = {
  id: string
  other_user_id: string
  other_user_name: string
}

export default function Header() {
  const router = useRouter()
  const { session, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [directChats, setDirectChats] = useState<DirectChat[]>([])
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
      fetchDirectChats()
    } else {
      setNickname(null)
      setProfilePhotoUrl(null)
      setRooms([])
      setDirectChats([])
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

  const fetchDirectChats = async () => {
    if (!session?.user?.id) return

    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("id, user1_id, user2_id, updated_at")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order("updated_at", { ascending: false })

      if (chatsError) {
        console.error("Error fetching direct chats:", chatsError)
        return
      }

      if (!chatsData || chatsData.length === 0) {
        setDirectChats([])
        return
      }

      const otherUserIds = chatsData.map((chat) =>
        chat.user1_id === session.user.id ? chat.user2_id : chat.user1_id
      )

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nickname, email")
        .in("id", otherUserIds)

      if (profilesError) {
        console.error("Error fetching direct chat profiles:", profilesError)
      }

      const chatsWithNames = chatsData.map((chat) => {
        const otherId = chat.user1_id === session.user.id ? chat.user2_id : chat.user1_id
        const profile = profiles?.find((p) => p.id === otherId)
        return {
          id: chat.id,
          other_user_id: otherId,
          other_user_name: profile?.nickname || profile?.email || "User",
        }
      })

      setDirectChats(chatsWithNames)
    } catch (error) {
      console.error("Error fetching direct chats:", error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    setRoomsOpen(false)
    setMenuOpen(false)
    router.push("/login")
  }

  const displayName = nickname || session?.user?.email || "User"
  const menuLinks = [
    { href: "/posts", label: "Posts" },
    { href: "/games", label: "Games" },
    { href: "/leagues", label: "Leagues" },
    { href: "/chats", label: "Chats" },
    { href: "/subs", label: "Subs" },
    { href: "/profile", label: "Profile" },
  ]

  return (
    <header className="relative z-[1000] border-b bg-white text-gray-900 shadow-sm">
      <button
        onClick={() => setMenuOpen(true)}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
        aria-label="Open menu"
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
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {menuOpen && (
        <div className="fixed inset-0 z-[1002]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
                  V
                </span>
                <span>VolleyOn</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="Close menu"
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
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4">
              <nav className="flex flex-col gap-2">
                {menuLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t pt-4">
                {!loading && !session && (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-full border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-full bg-black px-4 py-2 text-center text-sm font-semibold text-white"
                    >
                      Get started
                    </Link>
                  </div>
                )}
                {!loading && session && (
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <nav className="relative mx-auto flex max-w-6xl items-center px-4 py-3">
        <div className="flex w-full items-center gap-4">
          <div className="flex flex-1 items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
              V
            </span>
            <span className="tracking-wide">VolleyOn</span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="group flex w-72 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 shadow-sm transition-colors hover:border-gray-300 hover:bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500 transition-colors group-hover:text-gray-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search posts, games..."
                className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <div className="group flex w-40 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 shadow-sm transition-colors hover:border-gray-300 hover:bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500 transition-colors group-hover:text-gray-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                type="text"
                placeholder="Location"
                className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm transition-colors hover:bg-gray-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
          </div>

          <div className="flex items-center gap-3">
          {!loading && !session && (
            <>
              <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-black">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-gray-900"
              >
                Get started
              </Link>
            </>
          )}

          {!loading && session && (
            <div className="relative flex items-center gap-3" ref={dropdownRef}>
              <Link
                href="/posts/new"
                className="hidden rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-gray-900 md:inline-flex"
              >
                New post
              </Link>
              <div className="relative">
                <button
                  onClick={() => {
                    setRoomsOpen(!roomsOpen)
                    setDropdownOpen(false)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
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
                  <div className="absolute right-0 z-[1001] mt-4 w-64 rounded-md border border-gray-200 bg-white text-left text-gray-900 shadow-lg">
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
                    <div className="border-t px-4 py-2">
                      <p className="text-sm font-semibold text-gray-900">Direct chats</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {directChats.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-500">No direct chats.</p>
                      ) : (
                        directChats.map((chat) => (
                          <Link
                            key={chat.id}
                            href={`/chats/${chat.id}`}
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setRoomsOpen(false)}
                          >
                            <span className="truncate">{chat.other_user_name}</span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-200 p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
                aria-label="Account menu"
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover grayscale"
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
                <div className="absolute right-0 top-full z-[1001] mt-2 w-48 rounded-md border border-gray-200 bg-white text-left text-gray-900 shadow-lg">
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
        </div>
      </nav>
    </header>
  )
}
