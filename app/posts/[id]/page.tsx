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
  content: string
  author_id: string
  author_email: string
  created_at: string
  views: number
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
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
        setPost(data)

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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-gray-600">{error || "Post not found"}</p>
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

  const isAuthor = session?.user?.id === post.author_id

  return (
    <div className="mx-auto max-w-4xl">
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
          <h1 className="mb-4 text-3xl font-bold leading-tight">{post.title}</h1>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Author</span>
              <p className="mt-1 text-gray-600">{post.author_email}</p>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Date</span>
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
        </header>

        <div className="mb-8 whitespace-pre-wrap text-gray-900 leading-7">
          {post.content}
        </div>

        {post.location && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Location</h2>
            <LeafletMapDisplay location={post.location} height="h-96" />
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
