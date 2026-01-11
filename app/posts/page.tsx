"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type Post = {
  id: string
  title: string
  author_email: string
  created_at: string
  views: number
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
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

      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
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
                <td className="px-4 py-3 text-sm">{post.author_email}</td>
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
