"use client"

import PostsMap from "../components/PostsMap"
import Link from "next/link"

export default function Home() {
  const cards = [
    { title: "Today's Games", href: "/games", description: "Games happening today" },
    { title: "Posts", href: "/posts", description: "View all posts" },
    { title: "New Post", href: "/posts/new", description: "Create a new post" },
    { title: "Chats", href: "/chats", description: "Message other users" },
    { title: "Profile", href: "/profile", description: "View your profile" },
    { title: "Map", href: "/map", description: "View map" },
  ]

  return (
    <div className="mx-auto max-w-6xl">

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">All Event Locations</h2>
        <PostsMap />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              {card.title}
            </h3>
            <p className="text-sm text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
