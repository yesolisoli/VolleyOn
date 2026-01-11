"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    // Profile will be created automatically by trigger
    // But if we have a session, we can also create it manually as backup
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: data.user.id,
              nickname: nickname.trim(),
              email: email.trim(),
            },
          ])
          .select()

        if (profileError && profileError.code !== "23505") {
          // 23505 is unique violation, which is OK (trigger might have created it)
          console.error("Error creating profile:", profileError)
        }
      } catch (err) {
        console.error("Error creating profile:", err)
      }
    }

    setLoading(false)

    // 이메일 확인 설정에 따라 session이 바로 생기기도/안 생기기도 함
    router.push("/")
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Sign up</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">Nickname</label>
          <input
            className="w-full rounded border p-2"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            className="w-full rounded border p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            className="w-full rounded border p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  )
}
