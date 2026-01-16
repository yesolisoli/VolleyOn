"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "../../../components/AuthProvider"

type Message = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

type Chat = {
  id: string
  user1_id: string
  user2_id: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const chatId = params.id as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<{
    id: string
    nickname: string | null
    email: string
  } | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session && chatId) {
      fetchChat()
    }

    return () => {
      // Cleanup will be handled by setupRealtimeSubscription
    }
  }, [session, authLoading, chatId, router])

  useEffect(() => {
    if (!session || !chatId) return

    const cleanup = setupRealtimeSubscription()
    return cleanup
  }, [session, chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchChat = async () => {
    if (!session?.user?.id || !chatId) return

    try {
      setLoading(true)
      setError(null)

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single()

      if (chatError) {
        console.error("Error fetching chat:", chatError)
        setError("Chat not found")
        setLoading(false)
        return
      }

      if (!chatData) {
        setError("Chat not found")
        setLoading(false)
        return
      }

      // Check if user is part of this chat
      if (
        chatData.user1_id !== session.user.id &&
        chatData.user2_id !== session.user.id
      ) {
        setError("You don't have permission to view this chat")
        setLoading(false)
        return
      }

      setChat(chatData)

      // Fetch other user's profile
      const otherUserId =
        chatData.user1_id === session.user.id
          ? chatData.user2_id
          : chatData.user1_id

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nickname, email")
        .eq("id", otherUserId)
        .single()

      setOtherUser({
        id: otherUserId,
        nickname: profileData?.nickname || null,
        email: profileData?.email || "",
      })

      // Fetch messages
      await fetchMessages()
    } catch (err) {
      console.error("Error fetching chat:", err)
      setError("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!chatId) return

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return
      }

      setMessages(data || [])
    } catch (err) {
      console.error("Error fetching messages:", err)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!chatId) return () => {}

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !session?.user?.id || !chatId || sending) {
      return
    }

    try {
      setSending(true)

      const { error } = await supabase.from("messages").insert([
        {
          chat_id: chatId,
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
      await fetchMessages()
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
    return null // Redirect handled by useEffect
  }

  if (error && !chat) {
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

  if (!chat || !otherUser) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Loading chat...</p>
      </div>
    )
  }

  const displayName = otherUser.nickname || otherUser.email

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center border-b pb-4">
        <Link
          href="/chats"
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
        </Link>
        <h1 className="text-xl font-bold">{displayName}</h1>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-white p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === session.user.id

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
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isOwnMessage ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  )
}
