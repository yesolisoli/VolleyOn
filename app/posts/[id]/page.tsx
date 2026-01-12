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
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithNickname = Post & {
  author_nickname: string | null
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<PostWithNickname | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
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
          <Link
            href="/posts"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Posts
          </Link>
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/posts"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Posts
        </Link>
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
