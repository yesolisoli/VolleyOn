"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "../../../components/AuthProvider"
import LeafletMapDisplay, { getShortLocationName } from "../../../components/LeafletMapDisplay"

type Post = {
  id: string
  title: string
  location: string | null
  location_lat: number | null
  location_lng: number | null
  event_date: string | null
  event_time: string | null
  tag: string | null
  content: string
  attachments: string[] | null
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithNickname = Post & {
  author_nickname: string | null
}

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

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<PostWithNickname | null>(null)
  const [applications, setApplications] = useState<PostApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId])

  useEffect(() => {
    if (!postId) return
    fetchApplications()
  }, [postId])

  const fetchPost = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single()

      if (fetchError) {
        console.error("Error fetching post:", fetchError)
        setError("Post not found")
        setLoading(false)
        return
      }

      if (data) {
        // Fetch profile for the author
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", data.author_id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
        }

        const postWithNickname: PostWithNickname = {
          ...data,
          author_nickname: profile?.nickname || null,
        }

        setPost(postWithNickname)

        // Increment view count
        await supabase
          .from("posts")
          .update({ views: (data.views || 0) + 1 })
          .eq("id", postId)
      }
    } catch (err) {
      console.error("Error fetching post:", err)
      setError("Failed to load post")
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true)
      const { data, error: applicationsError } = await supabase
        .from("post_applications")
        .select("user_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (applicationsError) {
        console.error("Error fetching applications:", applicationsError)
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
      setApplications([])
    } finally {
      setApplicationsLoading(false)
    }
  }

  const handleApply = async () => {
    if (!session?.user?.id) {
      router.push("/login")
      return
    }

    try {
      setApplyLoading(true)
      const { error: applyError } = await supabase.from("post_applications").insert({
        post_id: postId,
        user_id: session.user.id,
      })

      if (applyError) {
        console.error("Error applying to post:", applyError)
        alert("Failed to apply to post")
        return
      }

      await fetchApplications()
    } catch (err) {
      console.error("Error applying to post:", err)
      alert("Failed to apply to post")
    } finally {
      setApplyLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!session?.user?.id) return

    try {
      setApplyLoading(true)
      const { error: withdrawError } = await supabase
        .from("post_applications")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", session.user.id)

      if (withdrawError) {
        console.error("Error withdrawing application:", withdrawError)
        alert("Failed to withdraw application")
        return
      }

      await fetchApplications()
    } catch (err) {
      console.error("Error withdrawing application:", err)
      alert("Failed to withdraw application")
    } finally {
      setApplyLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!post || !session || session.user.id !== post.author_id) {
      return
    }

    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId)

      if (error) {
        console.error("Error deleting post:", error)
        alert("Failed to delete post")
        return
      }

      router.push("/posts")
    } catch (err) {
      console.error("Error deleting post:", err)
      alert("Failed to delete post")
    }
  }

  const getAuthorName = (post: PostWithNickname): string => {
    return post.author_nickname || post.author_email
  }

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

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Post not found.</p>
      </div>
    )
  }

  const isAuthor = session?.user?.id === post.author_id
  const hasApplied = !!session?.user?.id && applications.some((item) => item.user_id === session.user.id)

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

      <article className="rounded-lg border bg-white p-8 shadow-sm">
        <header className="mb-6 border-b pb-6">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
            {post.tag && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                #{post.tag}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                   <div className="text-sm">
                     <span className="font-semibold text-gray-700">Author</span>
                     <p className="mt-1 text-gray-600">{getAuthorName(post)}</p>
                   </div>
                   <div className="text-sm">
                     <span className="font-semibold text-gray-700">Created</span>
                     <p className="mt-1 text-gray-600">
                       {new Date(post.created_at).toLocaleDateString()}
                     </p>
                   </div>
                   <div className="text-sm">
                     <span className="font-semibold text-gray-700">Views</span>
                     <p className="mt-1 text-gray-600">{post.views}</p>
                   </div>
                   {post.location && (
                     <div className="text-sm">
                       <span className="font-semibold text-gray-700">Location</span>
                       <p className="mt-1 text-gray-600">{getShortLocationName(post.location)}</p>
                     </div>
                   )}
                 </div>
                 {(post.event_date || post.event_time) && (
                   <div className="mt-4 rounded-lg bg-blue-50 p-4">
                     <div className="text-sm">
                       <span className="font-semibold text-gray-700">Event Date & Time</span>
                       <p className="mt-1 text-gray-900">
                         {post.event_date && new Date(post.event_date).toLocaleDateString()}
                         {post.event_date && post.event_time && " at "}
                         {post.event_time && new Date(`2000-01-01T${post.event_time}`).toLocaleTimeString("en-US", {
                           hour: "numeric",
                           minute: "2-digit",
                         })}
                       </p>
                     </div>
                   </div>
                 )}
        </header>

        <div className="mb-8 whitespace-pre-wrap text-gray-900 leading-7">
          {post.content}
        </div>

        <div className="mb-8 border-t pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Applications</h2>
            {!session && (
              <Link
                href="/login"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Login to apply
              </Link>
            )}
            {session && !isAuthor && (
              <button
                onClick={hasApplied ? handleWithdraw : handleApply}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  hasApplied
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
                disabled={applyLoading}
              >
                {hasApplied ? "Withdraw application" : "Apply to join"}
              </button>
            )}
            {session && isAuthor && (
              <span className="text-sm text-gray-500">You are the author</span>
            )}
          </div>

          {applicationsLoading ? (
            <p className="text-sm text-gray-500">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications yet.</p>
          ) : (
            <div>
              <p className="text-sm text-gray-600">Applications: {applications.length}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {applications.map((application) => {
                  const profile = application.profile
                  return profile?.profile_photo_url ? (
                    <img
                      key={application.user_id}
                      src={profile.profile_photo_url}
                      alt="Applicant avatar"
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div
                      key={application.user_id}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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
                    </div>
                  )
                })}
              </div>
              {isAuthor && (
                <div className="mt-3">
                  <Link
                    href={`/posts/${post.id}/applicants`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Show applicants
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {post.location && (post.location_lat && post.location_lng) && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Location</h2>
            <LeafletMapDisplay
              location={post.location}
              lat={post.location_lat}
              lng={post.location_lng}
              height="h-96"
            />
            <p className="mt-2 text-sm text-gray-600">{getShortLocationName(post.location)}</p>
          </div>
        )}

        {isAuthor && (
          <div className="flex gap-3 border-t pt-6">
            <Link
              href={`/posts/${post.id}/edit`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </article>
    </div>
  )
}
