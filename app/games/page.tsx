"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type Post = {
  id: string
  title: string
  location: string | null
  location_lat: number | null
  location_lng: number | null
  event_date: string | null
  event_time: string | null
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithNickname = Post & {
  author_nickname: string | null
}

export default function GamesPage() {
  const [posts, setPosts] = useState<PostWithNickname[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayPosts()
  }, [])

  const fetchTodayPosts = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("event_date", today)
        .order("event_time", { ascending: true, nullsFirst: false })

      if (error) {
        console.error("Error fetching today's posts:", error)
        return
      }

      if (data && data.length > 0) {
        // Get unique author IDs
        const authorIds = [...new Set(data.map((post) => post.author_id))]

        // Fetch profiles for all authors
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", authorIds)

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError)
        }

        // Map posts with nicknames
        const postsWithNicknames: PostWithNickname[] = data.map((post) => {
          const profile = profiles?.find((p) => p.id === post.author_id)
          return {
            ...post,
            author_nickname: profile?.nickname || null,
          }
        })

        setPosts(postsWithNicknames)
      } else {
        setPosts([])
      }
    } catch (error) {
      console.error("Error fetching today's posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAuthorName = (post: PostWithNickname): string => {
    return post.author_nickname || post.author_email
  }

  const formatTime = (time: string | null): string => {
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Today's Games</h1>
        <p className="mt-2 text-sm text-gray-600">
          Volleyball games happening today
        </p>
      </div>

      {loading && (
        <div className="py-12 text-center text-gray-500">Loading games...</div>
      )}

      {!loading && posts.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">No games scheduled for today.</p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{post.title}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {post.location && (
                      <p>
                        <span className="font-medium">Location:</span> {post.location}
                      </p>
                    )}
                    {post.event_time && (
                      <p>
                        <span className="font-medium">Time:</span> {formatTime(post.event_time)}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Author:</span> {getAuthorName(post)}
                    </p>
                  </div>
                </div>
                <div className="ml-4 text-right text-sm text-gray-500">
                  <p>{post.views} views</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
