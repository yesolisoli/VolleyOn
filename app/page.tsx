"use client"

import PostsMap from "../components/PostsMap"

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl">

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">All Event Locations</h2>
        <PostsMap />
      </div>
    </div>
  )
}
