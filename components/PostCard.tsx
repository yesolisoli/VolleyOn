"use client"

import Link from "next/link"
import { getShortLocationName } from "./LeafletMapDisplay"

type Post = {
  id: string
  title: string
  location: string | null
  location_lat: number | null
  location_lng: number | null
  event_date: string | null
  event_time: string | null
  tag: string | null
  attachments: string[] | null
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithAuthor = Post & {
  author_nickname: string | null
  author_profile_photo_url: string | null
}

type PostCardProps = {
  post: PostWithAuthor
  formatTime?: (time: string | null) => string
}

const getFirstImage = (attachments: string[] | null): string | null => {
  if (!attachments || attachments.length === 0) return null
  const imageUrl = attachments.find((url) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  return imageUrl || null
}

const getAuthorName = (post: PostWithAuthor): string => {
  return post.author_nickname || post.author_email
}

const defaultFormatTime = (time: string | null): string => {
  if (!time) return ""
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return time
  }
}

export default function PostCard({ post, formatTime = defaultFormatTime }: PostCardProps) {
  const firstImage = getFirstImage(post.attachments)

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50">
          {firstImage ? (
            <img
              src={firstImage}
              alt={post.title}
              className="h-full w-full rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                // Show tag if image fails to load
                const container = e.currentTarget.parentElement
                if (container && post.tag) {
                  container.innerHTML = `<span class="text-xs font-medium text-gray-600">#${post.tag}</span>`
                }
              }}
            />
          ) : post.tag ? (
            <span className="text-xs font-medium text-gray-600">#{post.tag}</span>
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
            {post.tag && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                #{post.tag}
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            {post.location && (
              <p className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" />
                  <circle cx="12" cy="11" r="2" />
                </svg>
                <span>{getShortLocationName(post.location)}</span>
              </p>
            )}
            {(post.event_date || post.event_time) && (
              <p className="flex items-center gap-2">
                {post.event_date && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{new Date(post.event_date).toLocaleDateString()}</span>
                  </>
                )}
                {post.event_time && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                    <span>{formatTime(post.event_time)}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-center gap-1">
          {post.author_profile_photo_url ? (
            <img
              src={post.author_profile_photo_url}
              alt={getAuthorName(post)}
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = "none"
                const container = e.currentTarget.parentElement
                if (container) {
                  const icon = container.querySelector("svg")
                  if (icon) icon.style.display = "block"
                }
              }}
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 rounded-full border border-gray-300 bg-gray-100 p-2 text-gray-400"
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
          <p className="text-xs text-gray-600">{getAuthorName(post)}</p>
        </div>
      </div>
    </Link>
  )
}
