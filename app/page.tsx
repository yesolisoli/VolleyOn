"use client"

import { useAuth } from "../components/AuthProvider"
import PostsMap from "../components/PostsMap"

export default function Home() {
  const { session, loading } = useAuth()

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">Volleyball Community</h1>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">All Event Locations</h2>
        <PostsMap />
      </div>

      <div className="mt-8 rounded border p-4">
        {loading && <p>Loading...</p>}
        {!loading && !session && <p>Not logged in</p>}
        {!loading && session && <p>Logged in as: {session.user.email}</p>}
      </div>
    </div>
  )
}
