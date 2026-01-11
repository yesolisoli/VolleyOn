"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../components/AuthProvider"
import { supabase } from "../../../lib/supabaseClient"

export default function NewPostPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!title.trim()) {
      setError("Title is required")
      setSubmitting(false)
      return
    }

    if (!content.trim()) {
      setError("Content is required")
      setSubmitting(false)
      return
    }

    if (!session?.user) {
      setError("You must be logged in to create a post")
      setSubmitting(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            title: title.trim(),
            location: location.trim() || null,
            content: content.trim(),
            author_id: session.user.id,
            author_email: session.user.email,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating post:", error)
        setError(error.message || "Failed to create post")
        setSubmitting(false)
        return
      }

      router.push("/posts")
    } catch (err) {
      console.error("Error creating post:", err)
      setError("Failed to create post")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Please log in to create a post.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">New Post</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold">
            Title
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded border p-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            required
          />
        </div>

        <div>
          <label htmlFor="location" className="mb-2 block text-sm font-semibold">
            Location
          </label>
          <input
            id="location"
            type="text"
            className="w-full rounded border p-3"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (e.g., Central Park, NYC)"
          />
        </div>

        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-semibold">
            Content
          </label>
          <textarea
            id="content"
            className="w-full rounded border p-3"
            rows={15}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content here..."
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            className="rounded bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Create Post"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border px-6 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
