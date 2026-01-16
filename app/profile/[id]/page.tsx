"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "../../../components/AuthProvider"

type PublicProfile = {
  id: string
  nickname: string | null
  profile_photo_url: string | null
  volleyball_level: string | null
  volleyball_experience: string | null
  bio: string | null
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const profileId = params.id as string
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (!profileId) return
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, nickname, profile_photo_url, volleyball_level, volleyball_experience, bio")
          .eq("id", profileId)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setError("Profile not found")
          setProfile(null)
          return
        }

        setProfile(data)
      } catch (err) {
        console.error("Error fetching profile:", err)
        setError("Failed to load profile")
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [profileId])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Profile not found.</p>
      </div>
    )
  }

  const displayName = profile.nickname || "User"
  const canChat = session?.user?.id && session.user.id !== profile.id

  const handleStartChat = async () => {
    if (!session?.user?.id) return
    setChatLoading(true)

    try {
      const user1Id = session.user.id < profile.id ? session.user.id : profile.id
      const user2Id = session.user.id < profile.id ? profile.id : session.user.id

      const { data: existingChat } = await supabase
        .from("chats")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .single()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
        return
      }

      const { data: newChat, error: createError } = await supabase
        .from("chats")
        .insert([
          {
            user1_id: user1Id,
            user2_id: user2Id,
          },
        ])
        .select()
        .single()

      if (createError) {
        console.error("Error creating chat:", createError)
        alert("Failed to create chat")
        return
      }

      router.push(`/chats/${newChat.id}`)
    } catch (err) {
      console.error("Error creating chat:", err)
      alert("Failed to create chat")
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={displayName}
              className="h-24 w-24 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 rounded-full border border-gray-200 bg-gray-100 p-4 text-gray-400"
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
          <div className="flex w-full flex-col items-center gap-3 sm:items-start">
            <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {canChat && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  disabled={chatLoading}
                >
                  {chatLoading ? "Starting..." : "Start chat"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Level</p>
            <p className="mt-1 text-sm text-gray-900">
              {profile.volleyball_level || "Not shared"}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Experience</p>
            <p className="mt-1 text-sm text-gray-900">
              {profile.volleyball_experience || "Not shared"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Bio</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
            {profile.bio || "Not shared"}
          </p>
        </div>
      </div>
    </div>
  )
}
