"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../../lib/supabaseClient"
import { useAuth } from "../../../../components/AuthProvider"
import LeafletMapInput from "../../../../components/LeafletMapInput"

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

const getStorageKey = (postId: string) => `edit_post_draft_${postId}`

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [tag, setTag] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (postId && session) {
      fetchPost()
    }
  }, [postId, session])

  // Load draft from localStorage
  useEffect(() => {
    if (!postId) return
    const storageKey = getStorageKey(postId)
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        // Only restore if we haven't loaded from server yet
        if (isInitialLoad && !post) {
          setTitle(draft.title || "")
          setLocation(draft.location || "")
          setLocationLat(draft.locationLat || null)
          setLocationLng(draft.locationLng || null)
          setEventDate(draft.eventDate || "")
          setEventTime(draft.eventTime || "")
          setTag(draft.tag || "")
          setContent(draft.content || "")
        }
      } catch (err) {
        console.error("Error loading draft:", err)
      }
    }
  }, [postId, isInitialLoad, post])

  // Save to localStorage whenever fields change (after initial load from server)
  useEffect(() => {
    if (!postId || !post || isInitialLoad) return
    const storageKey = getStorageKey(postId)
    if (title || location || content || eventDate || eventTime || tag) {
      const draft = { title, location, locationLat, locationLng, eventDate, eventTime, tag, content }
      localStorage.setItem(storageKey, JSON.stringify(draft))
    }
  }, [title, location, locationLat, locationLng, eventDate, eventTime, tag, content, postId, post, isInitialLoad])

  // Clear draft on successful submit
  const clearDraft = () => {
    if (!postId) return
    const storageKey = getStorageKey(postId)
    localStorage.removeItem(storageKey)
  }

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
        // Check if user is the author
        if (session?.user?.id !== data.author_id) {
          setError("You don't have permission to edit this post")
          setLoading(false)
          return
        }

        setPost(data)
        // Check if there's a draft saved
        const storageKey = getStorageKey(postId)
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try {
            const draft = JSON.parse(saved)
            // Use draft if it exists, otherwise use server data
            setTitle(draft.title || data.title)
            setLocation(draft.location || data.location || "")
            setLocationLat(draft.locationLat || data.location_lat || null)
            setLocationLng(draft.locationLng || data.location_lng || null)
            setEventDate(draft.eventDate || data.event_date || "")
            setEventTime(draft.eventTime || data.event_time || "")
            setContent(draft.content || data.content)
          } catch (err) {
            setTitle(data.title)
            setLocation(data.location || "")
            setLocationLat(data.location_lat || null)
            setLocationLng(data.location_lng || null)
            setEventDate(data.event_date || "")
            setEventTime(data.event_time || "")
            setContent(data.content)
          }
        } else {
          setTitle(data.title)
          setLocation(data.location || "")
          setLocationLat(data.location_lat || null)
          setLocationLng(data.location_lng || null)
          setEventDate(data.event_date || "")
          setEventTime(data.event_time || "")
          setContent(data.content)
        }
        setIsInitialLoad(false)
      }
    } catch (err) {
      console.error("Error fetching post:", err)
      setError("Failed to load post")
    } finally {
      setLoading(false)
    }
  }

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

    if (!session?.user || !post || session.user.id !== post.author_id) {
      setError("You don't have permission to edit this post")
      setSubmitting(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          title: title.trim(),
          location: location.trim() || null,
          location_lat: locationLat,
          location_lng: locationLng,
          event_date: eventDate || null,
          event_time: eventTime || null,
          tag: tag || null,
          content: content.trim(),
        })
        .eq("id", postId)

      if (updateError) {
        console.error("Error updating post:", updateError)
        setError(updateError.message || "Failed to update post")
        setSubmitting(false)
        return
      }

      clearDraft()
      router.push(`/posts/${postId}`)
    } catch (err) {
      console.error("Error updating post:", err)
      setError("Failed to update post")
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-gray-600">Please log in to edit posts.</p>
          <Link
            href="/login"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (error && !post) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-gray-600">{error}</p>
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
        <p>Loading post...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/posts/${postId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Post
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Edit Post</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold">
            Title
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <LeafletMapInput
            value={location}
            onChange={setLocation}
            onLocationSelect={(loc) => {
              setLocation(loc.address)
              setLocationLat(loc.lat)
              setLocationLng(loc.lng)
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventDate" className="mb-2 block text-sm font-semibold">
              Event Date
            </label>
            <input
              id="eventDate"
              type="date"
              className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="eventTime" className="mb-2 block text-sm font-semibold">
              Event Time
            </label>
            <input
              id="eventTime"
              type="time"
              className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="tag" className="mb-2 block text-sm font-semibold">
            Tag
          </label>
          <select
            id="tag"
            className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">Select a tag</option>
            <option value="Recruiting">#Recruiting</option>
            <option value="Team Introduction">#Team Introduction</option>
            <option value="Indoor">#Indoor</option>
            <option value="Beach">#Beach</option>
            <option value="Grass">#Grass</option>
            <option value="Clinic">#Clinic</option>
            <option value="Chat">#Chat</option>
            <option value="Tips/Lecture">#Tips/Lecture</option>
            <option value="Looking for Sub">#Looking for Sub</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-semibold">
            Content
          </label>
          <textarea
            id="content"
            className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="rounded-md bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Updating..." : "Update Post"}
          </button>
          <Link
            href={`/posts/${postId}`}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
