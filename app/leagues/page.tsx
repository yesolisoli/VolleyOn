"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type League = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeagues()
  }, [])

  const fetchLeagues = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching leagues:", error)
        return
      }

      if (data) {
        setLeagues(data)
      } else {
        setLeagues([])
      }
    } catch (error) {
      console.error("Error fetching leagues:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leagues</h1>
        <Link
          href="/leagues/new"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          New League
        </Link>
      </div>

      {loading && (
        <div className="py-12 text-center text-gray-500">Loading leagues...</div>
      )}

      {!loading && leagues.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">No leagues yet.</p>
        </div>
      )}

      {!loading && leagues.length > 0 && (
        <div className="space-y-4">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="block rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{league.name}</h3>
              {league.description && (
                <p className="mb-2 text-sm text-gray-600">{league.description}</p>
              )}
              <p className="text-xs text-gray-500">
                Created: {new Date(league.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
