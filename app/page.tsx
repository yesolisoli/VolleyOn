"use client"

import PostsMap from "../components/PostsMap"
import Link from "next/link"

export default function Home() {
  const cards = [
    { title: "Today's Games", href: "/games", description: "Games happening today" },
    { title: "Looking for Sub", href: "/subs", description: "Posts looking for substitutes" },
      { title: "Chat", href: "/chats", description: "Chat with other players" },
    {
      title: "#Grass",
      href: "/posts?tag=Grass",
      description: "View Grass posts",
      backgroundImage: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop&q=80",
    },
    {
      title: "#Beach",
      href: "/posts?tag=Beach",
      description: "View Beach posts",
      backgroundImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
    },
    {
      title: "#Indoor",
      href: "/posts?tag=Indoor",
      description: "View Indoor posts",
      backgroundImage: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&h=600&fit=crop&q=80",
    },
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
            className={`group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md ${
              card.backgroundImage
                ? "h-48 bg-cover bg-center bg-no-repeat"
                : "bg-white p-6"
            }`}
            style={
              card.backgroundImage
                ? {
                    backgroundImage: `url(${card.backgroundImage})`,
                  }
                : undefined
            }
          >
            {card.backgroundImage && (
              <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/50" />
            )}
            <div
              className={`relative h-full ${
                card.backgroundImage ? "flex flex-col justify-end p-6" : ""
              }`}
            >
              <h3
                className={`mb-2 text-lg font-semibold ${
                  card.backgroundImage
                    ? "text-white drop-shadow-lg"
                    : "text-gray-900 group-hover:text-blue-600"
                }`}
              >
                {card.title}
              </h3>
              <p
                className={`text-sm ${
                  card.backgroundImage ? "text-white drop-shadow-md" : "text-gray-600"
                }`}
              >
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
