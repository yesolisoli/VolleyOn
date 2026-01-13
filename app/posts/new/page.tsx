"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../components/AuthProvider"
import { supabase } from "../../../lib/supabaseClient"
import LeafletMapInput from "../../../components/LeafletMapInput"

const STORAGE_KEY = "new_post_draft"

export default function NewPostPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [tag, setTag] = useState("")
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setTitle(draft.title || "")
        setLocation(draft.location || "")
        setLocationLat(draft.locationLat || null)
        setLocationLng(draft.locationLng || null)
        setEventDate(draft.eventDate || "")
        setEventTime(draft.eventTime || "")
        setTag(draft.tag || "")
        setContent(draft.content || "")
      } catch (err) {
        console.error("Error loading draft:", err)
      }
    }
  }, [])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    // Validate file sizes (max 10MB per file)
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      return true
    })

    setFiles((prev) => [...prev, ...validFiles])

    // Create previews for images
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (postId: string): Promise<string[]> => {
    if (files.length === 0) return []

    const uploadedUrls: string[] = []

    for (const file of files) {
      try {
        const fileExt = file.name.split(".").pop()
        const fileName = `${session!.user.id}-${Date.now()}-${file.name}`
        const filePath = `${postId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("post-attachments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.error("Error uploading file:", uploadError)
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-attachments").getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      } catch (error) {
        console.error("Error uploading file:", error)
        throw error
      }
    }

    return uploadedUrls
  }

  // Save to localStorage whenever fields change
  useEffect(() => {
    if (title || location || content || eventDate || eventTime || tag) {
      const draft = { title, location, locationLat, locationLng, eventDate, eventTime, tag, content }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }
  }, [title, location, locationLat, locationLng, eventDate, eventTime, tag, content])

  // Clear localStorage on successful submit
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY)
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

    if (!session?.user) {
      setError("You must be logged in to create a post")
      setSubmitting(false)
      return
    }

    try {
      // First create the post
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            title: title.trim(),
            location: location.trim() || null,
            location_lat: locationLat,
            location_lng: locationLng,
            event_date: eventDate || null,
            event_time: eventTime || null,
            tag: tag || null,
            content: content.trim(),
            author_id: session.user.id,
            author_email: session.user.email,
            attachments: [], // Will be updated after file upload
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

      // Upload files if any
      if (files.length > 0 && data) {
        setUploadingFiles(true)
        try {
          const uploadedUrls = await uploadFiles(data.id)

          // Update post with attachment URLs
          const { error: updateError } = await supabase
            .from("posts")
            .update({ attachments: uploadedUrls })
            .eq("id", data.id)

          if (updateError) {
            console.error("Error updating post with attachments:", updateError)
            setError("Post created but failed to upload files")
            setSubmitting(false)
            setUploadingFiles(false)
            return
          }
        } catch (uploadError) {
          console.error("Error uploading files:", uploadError)
          setError("Post created but failed to upload files")
          setSubmitting(false)
          setUploadingFiles(false)
          return
        }
        setUploadingFiles(false)
      }

      clearDraft()
      router.push("/posts")
    } catch (err) {
      console.error("Error creating post:", err)
      setError("Failed to create post")
      setSubmitting(false)
      setUploadingFiles(false)
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
              className="w-full rounded border p-3"
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
              className="w-full rounded border p-3"
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
            className="w-full rounded border p-3"
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
            className="w-full rounded border p-3"
            rows={15}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content here..."
            required
          />
        </div>

        <div>
          <label htmlFor="files" className="mb-2 block text-sm font-semibold">
            Attachments (Images or Files)
          </label>
          <input
            id="files"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="w-full rounded border p-3"
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum 10MB per file. Images will be displayed, other files will be downloadable.
          </p>

          {/* File previews */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div className="flex items-center gap-2">
                    {file.type.startsWith("image/") && filePreviews[index] && (
                      <img
                        src={filePreviews[index]}
                        alt={file.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            className="rounded bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={submitting || uploadingFiles}
          >
            {uploadingFiles
              ? "Uploading files..."
              : submitting
                ? "Posting..."
                : "Create Post"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to cancel? Your draft will be saved.")) {
                router.back()
              }
            }}
            className="rounded border px-6 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
