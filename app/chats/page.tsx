"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../components/AuthProvider"

type Chat = {
  id: string
  user1_id: string
  user2_id: string
  updated_at: string
  other_user: {
    id: string
    nickname: string | null
    email: string
  }
  last_message: {
    content: string
    created_at: string
    sender_id: string
  } | null
}

type User = {
  id: string
  nickname: string | null
  email: string
}

export default function ChatsPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session) {
      fetchChats()
    }
  }, [session, authLoading, router])

  const fetchChats = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Fetch all chats where current user is user1 or user2
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order("updated_at", { ascending: false })

      if (chatsError) {
        console.error("Error fetching chats:", chatsError)
        return
      }

      if (!chatsData || chatsData.length === 0) {
        setChats([])
        setLoading(false)
        return
      }

      // For each chat, fetch the other user's profile and last message
      const chatsWithDetails = await Promise.all(
        chatsData.map(async (chat) => {
          const otherUserId =
            chat.user1_id === session.user.id ? chat.user2_id : chat.user1_id

          // Fetch other user's profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("nickname, email")
            .eq("id", otherUserId)
            .single()

          // Fetch last message
          const { data: messagesData } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          return {
            ...chat,
            other_user: {
              id: otherUserId,
              nickname: profileData?.nickname || null,
              email: profileData?.email || "",
            },
            last_message: messagesData || null,
          }
        })
      )

      setChats(chatsWithDetails)
    } catch (error) {
      console.error("Error fetching chats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (query: string = "") => {
    if (!session?.user?.id) return

    try {
      setLoadingUsers(true)

      // Get user IDs that current user already has chats with
      const { data: existingChats } = await supabase
        .from("chats")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)

      const existingUserIds = new Set<string>()
      existingChats?.forEach((chat) => {
        if (chat.user1_id !== session.user.id) {
          existingUserIds.add(chat.user1_id)
        }
        if (chat.user2_id !== session.user.id) {
          existingUserIds.add(chat.user2_id)
        }
      })

      // Fetch all profiles
      let queryBuilder = supabase
        .from("profiles")
        .select("id, nickname, email")
        .neq("id", session.user.id) // Exclude current user

      if (query.trim()) {
        queryBuilder = queryBuilder.or(
          `nickname.ilike.%${query}%,email.ilike.%${query}%`
        )
      }

      const { data: profilesData, error } = await queryBuilder.limit(20)

      if (error) {
        console.error("Error fetching users:", error)
        return
      }

      // Filter out users we already have chats with
      const filteredUsers =
        profilesData?.filter((user) => !existingUserIds.has(user.id)) || []

      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleNewChatClick = () => {
    setShowNewChatModal(true)
    fetchUsers()
  }

  const handleCreateChat = async (otherUserId: string) => {
    if (!session?.user?.id) return

    try {
      // Ensure user1_id < user2_id to match the constraint
      const user1Id =
        session.user.id < otherUserId ? session.user.id : otherUserId
      const user2Id =
        session.user.id < otherUserId ? otherUserId : session.user.id

      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from("chats")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .single()

      if (existingChat) {
        // Chat already exists, navigate to it
        router.push(`/chats/${existingChat.id}`)
        return
      }

      // Create new chat
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert([
          {
            user1_id: user1Id,
            user2_id: user2Id,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating chat:", error)
        alert("Failed to create chat")
        return
      }

      // Navigate to the new chat
      router.push(`/chats/${newChat.id}`)
    } catch (error) {
      console.error("Error creating chat:", error)
      alert("Failed to create chat")
    }
  }

  const getDisplayName = (chat: Chat): string => {
    return chat.other_user.nickname || chat.other_user.email
  }

  const formatLastMessageTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    fetchUsers(query)
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chats</h1>
        <button
          onClick={handleNewChatClick}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Chat
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">No chats yet. Start a conversation with someone!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chats/${chat.id}`}
              className="block rounded-lg border bg-white p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{getDisplayName(chat)}</h3>
                  {chat.last_message && (
                    <p className="mt-1 truncate text-sm text-gray-600">
                      {chat.last_message.content}
                    </p>
                  )}
                </div>
                {chat.last_message && (
                  <div className="ml-4 text-xs text-gray-500">
                    {formatLastMessageTime(chat.last_message.created_at)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChatModal(false)
                  setSearchQuery("")
                  setUsers([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {loadingUsers ? (
                <p className="text-center text-gray-500">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-center text-gray-500">
                  {searchQuery ? "No users found" : "Start typing to search for users"}
                </p>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateChat(user.id)}
                    className="w-full rounded-lg border bg-white p-3 text-left hover:bg-gray-50"
                  >
                    <p className="font-semibold text-gray-900">
                      {user.nickname || "User"}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
