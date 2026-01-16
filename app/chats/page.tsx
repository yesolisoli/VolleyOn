"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../components/AuthProvider"

type ChatRoom = {
  id: string
  title: string
  topic: string
  is_private: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export default function ChatsPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState("")
  const [creating, setCreating] = useState(false)
  const [joinRoom, setJoinRoom] = useState<ChatRoom | null>(null)
  const [joinPassword, setJoinPassword] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session) {
      fetchRooms()
    }
  }, [session, authLoading, router])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching rooms:", error)
        return
      }

      setRooms(data || [])
    } catch (error) {
      console.error("Error fetching rooms:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !topic.trim() || creating) return
    if (isPrivate && !password.trim()) return

    try {
      setCreating(true)
      const { data, error } = await supabase.rpc("create_chat_room", {
        room_title: title.trim(),
        room_topic: topic.trim(),
        room_is_private: isPrivate,
        room_password: isPrivate ? password : "",
      })

      if (error) {
        console.error("Error creating room:", error)
        return
      }

      setShowCreateModal(false)
      setTitle("")
      setTopic("")
      setIsPrivate(false)
      setPassword("")
      await fetchRooms()

      if (data) {
        router.push(`/rooms/${data}`)
      }
    } catch (error) {
      console.error("Error creating room:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleEnterRoom = (room: ChatRoom) => {
    if (room.is_private) {
      setJoinRoom(room)
      setJoinPassword("")
      setJoinError(null)
      return
    }

    router.push(`/rooms/${room.id}`)
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinRoom || !joinPassword.trim()) return

    try {
      const { data, error } = await supabase.rpc("join_chat_room", {
        target_room_id: joinRoom.id,
        room_password: joinPassword.trim(),
      })

      if (error) {
        console.error("Error joining room:", error)
        setJoinError("Failed to join room")
        return
      }

      if (!data) {
        setJoinError("Incorrect password")
        return
      }

      const roomId = joinRoom.id
      setJoinRoom(null)
      setJoinPassword("")
      setJoinError(null)
      router.push(`/rooms/${roomId}`)
    } catch (error) {
      console.error("Error joining room:", error)
      setJoinError("Failed to join room")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chats</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create a room and chat with everyone
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">No rooms yet. Create the first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => handleEnterRoom(room)}
              className="w-full rounded-lg border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{room.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{room.topic}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    room.is_private
                      ? "bg-gray-100 text-gray-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {room.is_private ? "Private" : "Public"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Create chat room</h2>
            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Room title"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is this room about?"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="private-room"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="private-room" className="text-sm text-gray-700">
                  Private room
                </label>
              </div>
              {isPrivate && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Room password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a password"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {joinRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Enter password</h2>
            <p className="mt-2 text-sm text-gray-600">{joinRoom.title}</p>
            <form onSubmit={handleJoinRoom} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Room password
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>
              {joinError && <p className="text-sm text-red-600">{joinError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJoinRoom(null)}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
