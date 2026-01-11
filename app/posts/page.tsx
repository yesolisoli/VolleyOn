"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type Post = {
  id: string
  title: string
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithNickname = Post & {
  author_nickname: string | null
}

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithNickname[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching posts:", error)
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
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAuthorName = (post: PostWithNickname): string => {
    return post.author_nickname || post.author_email
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/posts/new"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          New Post
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold">No.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Author</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Views</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => (
              <tr key={post.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{posts.length - index}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-sm hover:text-blue-600 hover:underline"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{getAuthorName(post)}</td>
                <td className="px-4 py-3 text-sm">
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">{post.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="py-12 text-center text-gray-500">Loading posts...</div>
      )}

      {!loading && posts.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          No posts yet.
        </div>
      )}
    </div>
  )
}
