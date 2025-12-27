"use client"

import { useAuth } from "../components/AuthProvider"

export default function Home() {
  const { session, loading } = useAuth()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Volleyball Community</h1>

      <div className="mt-4 rounded border p-4">
        {loading && <p>Loading...</p>}
        {!loading && !session && <p>Not logged in</p>}
        {!loading && session && <p>Logged in as: {session.user.email}</p>}
      </div>
    </div>
  )
}
