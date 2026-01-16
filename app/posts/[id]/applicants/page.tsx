"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../../lib/supabaseClient"

type ApplicationProfile = {
  id: string
  nickname: string | null
  profile_photo_url: string | null
  volleyball_level: string | null
  volleyball_experience: string | null
  bio: string | null
}

type PostApplication = {
  user_id: string
  created_at: string
  profile: ApplicationProfile | null
}

export default function ApplicantsPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [applications, setApplications] = useState<PostApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return
    const fetchApplications = async () => {
      try {
        setLoading(true)
        const { data, error: applicationsError } = await supabase
          .from("post_applications")
          .select("user_id, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: true })

        if (applicationsError) {
          console.error("Error fetching applications:", applicationsError)
          setError("Failed to load applications")
          setApplications([])
          return
        }

        if (!data || data.length === 0) {
          setApplications([])
          return
        }

        const userIds = [...new Set(data.map((item) => item.user_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nickname, profile_photo_url, volleyball_level, volleyball_experience, bio")
          .in("id", userIds)

        if (profilesError) {
          console.error("Error fetching applicant profiles:", profilesError)
        }

        const applicationsWithProfiles: PostApplication[] = data.map((item) => {
          const profile = profiles?.find((p) => p.id === item.user_id) || null
          return {
            user_id: item.user_id,
            created_at: item.created_at,
            profile,
          }
        })

        setApplications(applicationsWithProfiles)
      } catch (err) {
        console.error("Error fetching applications:", err)
        setError("Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [postId])

  return (
    <div className="mx-auto max-w-4xl">
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Applicants</h1>
        <p className="mt-2 text-sm text-gray-600">
          {loading ? "Loading..." : `${applications.length} applicants`}
        </p>
      </div>

      {loading && <div className="py-8 text-center text-gray-500">Loading applicants...</div>}

      {!loading && error && (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">No applications yet.</p>
        </div>
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {applications.map((application) => {
            const profile = application.profile
            const displayName = profile?.nickname || "User"
            return (
              <Link
                key={application.user_id}
                href={`/profile/${application.user_id}`}
                className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  {profile?.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={displayName}
                      className="h-14 w-14 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-14 w-14 rounded-full border border-gray-200 bg-gray-100 p-3 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{displayName}</p>
                    <p className="text-sm text-gray-500">
                      Applied {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">Level</p>
                    <p className="mt-1 text-gray-900">
                      {profile?.volleyball_level || "Not shared"}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">Experience</p>
                    <p className="mt-1 text-gray-900">
                      {profile?.volleyball_experience || "Not shared"}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
