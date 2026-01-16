"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "../../../components/AuthProvider"

type Message = {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

type ChatRoom = {
  id: string
  title: string
  topic: string
  is_private: boolean
  created_by: string
}

type Profile = {
  id: string
  nickname: string | null
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const roomId = params.id as string

  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [authorMap, setAuthorMap] = useState<Record<string, string>>({})
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [joinPassword, setJoinPassword] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session && roomId) {
      fetchRoom()
    }

    return () => {
      // Cleanup handled by subscription
    }
  }, [session, authLoading, roomId, router])

  useEffect(() => {
    if (!session || !roomId) return
    const cleanup = setupRealtimeSubscription()
    return cleanup
  }, [session, roomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchRoom = async () => {
    if (!roomId) return

    try {
      setLoading(true)
      setError(null)

      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .select("id, title, topic, is_private, created_by")
        .eq("id", roomId)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError)
        setError("Room not found")
        setLoading(false)
        return
      }

      setRoom(roomData)

      let member = true

      if (roomData.is_private && session?.user?.id) {
        const { data: membership } = await supabase
          .from("chat_room_members")
          .select("room_id")
          .eq("room_id", roomId)
          .eq("user_id", session.user.id)
          .maybeSingle()

        member = !!membership
      }

      setIsMember(member)
      await fetchMessages(roomData, member)
    } catch (err) {
      console.error("Error fetching room:", err)
      setError("Failed to load room")
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (roomData?: ChatRoom, memberOverride?: boolean) => {
    const activeRoom = roomData || room
    if (!activeRoom) return

    const memberStatus = memberOverride ?? isMember

    if (activeRoom.is_private && !memberStatus) {
      return
    }

    try {
      const { data, error } = await supabase
        .from("chat_room_messages")
        .select("id, room_id, sender_id, content, created_at")
        .eq("room_id", activeRoom.id)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return
      }

      const messagesData = data || []
      setMessages(messagesData)

      const senderIds = Array.from(new Set(messagesData.map((msg) => msg.sender_id)))
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname")
          .in("id", senderIds)

        const map: Record<string, string> = {}
        profiles?.forEach((profile: Profile) => {
          map[profile.id] = profile.nickname || "User"
        })
        setAuthorMap(map)
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!roomId) return () => {}

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!room || !joinPassword.trim() || joining) return

    try {
      setJoining(true)
      setJoinError(null)

      const { data, error } = await supabase.rpc("join_chat_room", {
        target_room_id: room.id,
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

      setIsMember(true)
      setJoinPassword("")
      await fetchMessages(room, true)
    } catch (err) {
      console.error("Error joining room:", err)
      setJoinError("Failed to join room")
    } finally {
      setJoining(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !session?.user?.id || !room || sending) {
      return
    }

    try {
      setSending(true)

      const { error } = await supabase.from("chat_room_messages").insert([
        {
          room_id: room.id,
          sender_id: session.user.id,
          content: newMessage.trim(),
        },
      ])

      if (error) {
        console.error("Error sending message:", error)
        setError("Failed to send message")
        return
      }

      setNewMessage("")
      await fetchMessages(room)
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error && !room) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Link
            href="/chats"
            className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Room not found.</p>
      </div>
    )
  }

  if (room.is_private && !isMember) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h1 className="text-xl font-bold text-gray-900">{room.title}</h1>
          <p className="mt-2 text-sm text-gray-600">{room.topic}</p>
          <form onSubmit={handleJoinRoom} className="mt-6 space-y-4">
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
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              disabled={joining}
            >
              {joining ? "Joining..." : "Join room"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center border-b pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">{room.title}</h1>
          <p className="text-sm text-gray-500">{room.topic}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-white p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === session.user.id
            const authorName = isOwnMessage
              ? "You"
              : authorMap[message.sender_id] || "User"

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="text-xs opacity-70">{authorName}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
                  <p className="mt-1 text-right text-xs opacity-70">
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          disabled={sending}
        >
          Send
        </button>
      </form>
    </div>
  )
}
