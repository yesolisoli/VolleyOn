"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../components/AuthProvider"
import { supabase } from "../../lib/supabaseClient"
import Link from "next/link"

type Profile = {
  id: string
  nickname: string
  email: string
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session) {
      fetchProfile()
    }
  }, [session, authLoading, router])

  const fetchProfile = async () => {
    if (!session) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (fetchError) {
        console.error("Error fetching profile:", fetchError)
        setError("Failed to load profile")
        setLoading(false)
        return
      }

      if (data) {
        setProfile(data)
        setNickname(data.nickname)
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!session || !nickname.trim()) {
      setError("Nickname cannot be empty")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("id", session.user.id)

      if (updateError) {
        console.error("Error updating profile:", updateError)
        setError(updateError.message || "Failed to update profile")
        setSaving(false)
        return
      }

      // Refresh profile data
      await fetchProfile()
      setEditing(false)
    } catch (err) {
      console.error("Error updating profile:", err)
      setError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setNickname(profile.nickname)
    }
    setEditing(false)
    setError(null)
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        {!editing && profile && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {profile && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Email
              </label>
              <p className="mt-1 text-gray-900">{profile.email}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Nickname
              </label>
              {editing ? (
                <div className="mt-1">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter nickname"
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-gray-900">{profile.nickname}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                User ID
              </label>
              <p className="mt-1 font-mono text-sm text-gray-600">
                {profile.id}
              </p>
            </div>

            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
