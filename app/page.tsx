"use client"

import PostsMap from "../components/PostsMap"
import Link from "next/link"

export default function Home() {
  const cards = [
    {
      title: "Today's Games",
      href: "/games",
      description: "Games happening today",
      icon: "🏐",
    },
    {
      title: "Looking for Sub",
      href: "/subs",
      description: "Posts looking for substitutes",
      icon: "🧑‍🤝‍🧑",
    },
    {
      title: "Chat",
      href: "/chats",
      description: "Chat with other players",
      icon: "💬",
    },
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
        <div className="overflow-hidden rounded-lg shadow-sm">
          <PostsMap />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative h-40 min-h-40 overflow-hidden rounded-lg border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              card.backgroundImage
                ? "bg-cover bg-center bg-no-repeat"
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
                card.backgroundImage ? "flex flex-col justify-end p-6" : "flex flex-col justify-center gap-3"
              }`}
            >
              {card.backgroundImage ? (
                <>
                  <h3 className="mb-2 text-lg font-semibold text-white drop-shadow-lg">
                    {card.title}
                  </h3>
                  <p className="text-sm text-white drop-shadow-md">{card.description}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
                      <span aria-hidden="true">{card.icon}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
