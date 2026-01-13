"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type Post = {
  id: string
  title: string
  tag: string | null
  location: string | null
  content: string
  author_id: string
  author_email: string
  created_at: string
  views: number
}

type PostWithNickname = Post & {
  author_nickname: string | null
}

const TAGS = [
  "All",
  "Recruiting",
  "Team Introduction",
  "Indoor",
  "Beach",
  "Grass",
  "Clinic",
  "Chat",
  "Tips/Lecture",
  "Looking for Sub",
]

export default function PostsPage() {
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<PostWithNickname[]>([])
  const [filteredPosts, setFilteredPosts] = useState<PostWithNickname[]>([])
  const [selectedTag, setSelectedTag] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if there's a tag in URL params
    const tagFromUrl = searchParams.get("tag")
    if (tagFromUrl && TAGS.includes(tagFromUrl)) {
      setSelectedTag(tagFromUrl)
    }
  }, [searchParams])

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
        setFilteredPosts(postsWithNicknames)
      } else {
        setPosts([])
        setFilteredPosts([])
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = posts

    // Filter by tag
    if (selectedTag !== "All") {
      filtered = filtered.filter((post) => post.tag === selectedTag)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((post) => {
        // Search in title
        const titleMatch = post.title?.toLowerCase().includes(query)
        
        // Search in content
        const contentMatch = post.content?.toLowerCase().includes(query)
        
        // Search in location
        const locationMatch = post.location?.toLowerCase().includes(query)
        
        // Search in tag
        const tagMatch = post.tag?.toLowerCase().includes(query)
        
        // Search in dates (created_at)
        const createdDate = new Date(post.created_at).toLocaleDateString().toLowerCase()
        const createdDateMatch = createdDate.includes(query)
        
        // Try to parse as date format (MM/DD/YYYY, YYYY-MM-DD, etc.)
        const dateFormats = [
          new Date(post.created_at).toLocaleDateString("en-US"),
          new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          new Date(post.created_at).toISOString().split("T")[0],
        ]
        const dateMatch = dateFormats.some((format) => format.toLowerCase().includes(query))

        return titleMatch || contentMatch || locationMatch || tagMatch || createdDateMatch || dateMatch
      })
    }

    setFilteredPosts(filtered)
  }, [selectedTag, searchQuery, posts])

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

      <div className="mb-4 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedTag === tag
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tag === "All" ? "All" : `#${tag}`}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search posts by title, content, location, tag, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
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
                   {filteredPosts.map((post, index) => (
                     <tr key={post.id} className="border-b hover:bg-gray-50">
                       <td className="px-4 py-3 text-sm">{filteredPosts.length - index}</td>
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-2">
                           <Link
                             href={`/posts/${post.id}`}
                             className="text-sm hover:text-blue-600 hover:underline"
                           >
                             {post.title}
                           </Link>
                           {post.tag && (
                             <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                               #{post.tag}
                             </span>
                           )}
                         </div>
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

             {!loading && filteredPosts.length === 0 && (
               <div className="py-12 text-center text-gray-500">
                 {selectedTag === "All" ? "No posts yet." : `No posts with tag #${selectedTag}.`}
               </div>
             )}
    </div>
  )
}
