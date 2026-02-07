"use client"

import PostsMap from "../components/PostsMap"
import Link from "next/link"
import { Anton } from "next/font/google"

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
})

export default function Home() {
  const cards = [
    {
      title: "Today's Games",
      href: "/games",
      description: "Games happening today",
      icon: "#",
    },
    {
      title: "Looking for Sub",
      href: "/subs",
      description: "Posts looking for substitutes",
      icon: "#",
    },
    {
      title: "Chat",
      href: "/chats",
      description: "Chat with other players",
      icon: "#",
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
            className={`group relative h-40 min-h-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              card.backgroundImage
                ? "bg-cover bg-center bg-no-repeat"
                : "p-6 transition-colors hover:bg-gray-50"
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
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-6xl font-semibold text-white">#</span>
                    <h3
                      className={`text-4xl font-semibold text-white drop-shadow-lg ${anton.className}`}
                    >
                      {card.title.startsWith("#") ? card.title.slice(1) : card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-white drop-shadow-md">{card.description}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center text-6xl font-semibold text-black">
                      <span aria-hidden="true">{card.icon}</span>
                    </div>
                    <h3 className={`text-4xl font-semibold text-gray-900 ${anton.className}`}>
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
