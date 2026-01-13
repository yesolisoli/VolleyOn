"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../components/AuthProvider"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type Profile = {
  id: string
  nickname: string
  email: string
  profile_photo_url: string | null
  volleyball_level: string | null
  volleyball_experience: string | null
  bio: string | null
}

export default function ProfilePage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: "",
    profile_photo_url: "",
    volleyball_level: "",
    volleyball_experience: "",
    bio: "",
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    } else if (session) {
      fetchProfile()
    }
  }, [session, authLoading, router])

  const fetchProfile = async () => {
    setLoading(true)
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (error) {
        console.error("Error fetching profile:", error)
        setError("Failed to load profile.")
        setProfile(null)
      } else if (data) {
        setProfile(data)
        setFormData({
          nickname: data.nickname || "",
          profile_photo_url: data.profile_photo_url || "",
          volleyball_level: data.volleyball_level || "",
          volleyball_experience: data.volleyball_experience || "",
          bio: data.bio || "",
        })
        if (data.profile_photo_url) {
          setPhotoPreview(data.profile_photo_url)
        }
      }
    }
    setLoading(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }
      setPhotoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !session?.user) return null

    try {
      setUploadingPhoto(true)
      const fileExt = photoFile.name.split(".").pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-photos/${fileName}`

      // Delete old photo if exists
      if (profile?.profile_photo_url) {
        try {
          const oldUrl = profile.profile_photo_url
          // Extract file path from URL
          const urlParts = oldUrl.split("/")
          const fileName = urlParts[urlParts.length - 1]
          if (fileName) {
            await supabase.storage.from("avatars").remove([`profile-photos/${fileName}`])
          }
        } catch (err) {
          console.error("Error deleting old photo:", err)
          // Continue even if deletion fails
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photoFile, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Error uploading photo:", uploadError)
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error("Error uploading photo:", error)
      setError("Failed to upload photo")
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!session?.user || !profile) return

    setUpdateLoading(true)
    setError(null)

    let photoUrl = formData.profile_photo_url

    // Upload new photo if file selected
    if (photoFile) {
      const uploadedUrl = await uploadPhoto()
      if (uploadedUrl) {
        photoUrl = uploadedUrl
      } else {
        setUpdateLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: formData.nickname.trim(),
        profile_photo_url: photoUrl || null,
        volleyball_level: formData.volleyball_level.trim() || null,
        volleyball_experience: formData.volleyball_experience.trim() || null,
        bio: formData.bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)

    setUpdateLoading(false)

    if (error) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile.")
    } else {
      setIsEditing(false)
      setPhotoFile(null)
      fetchProfile() // Refresh profile data
    }
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
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Home
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {isEditing ? (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Profile Photo
              </label>
              {/* Show current photo if exists and no new preview */}
              {!photoPreview && profile?.profile_photo_url && (
                <div className="mb-2">
                  <p className="mb-2 text-sm text-gray-600">Current photo:</p>
                  <img
                    src={profile.profile_photo_url}
                    alt="Current profile"
                    className="h-24 w-24 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
              {/* Show preview if new photo selected */}
              {photoPreview && (
                <div className="mb-2">
                  <p className="mb-2 text-sm text-gray-600">New photo preview:</p>
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-24 w-24 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full rounded border p-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                Select a new photo to replace the current one (max 5MB)
              </p>
              {uploadingPhoto && (
                <p className="mt-2 text-sm text-gray-500">Uploading photo...</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Nickname *
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full rounded border p-2"
                placeholder="Enter nickname"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{session.user.email}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Volleyball Level
              </label>
              <select
                value={formData.volleyball_level}
                onChange={(e) => setFormData({ ...formData, volleyball_level: e.target.value })}
                className="w-full rounded border p-2"
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Volleyball Experience
              </label>
              <input
                type="text"
                value={formData.volleyball_experience}
                onChange={(e) =>
                  setFormData({ ...formData, volleyball_experience: e.target.value })
                }
                className="w-full rounded border p-2"
                placeholder="e.g., 5 years, High school team, etc."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded border p-2"
                rows={5}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUpdateProfile}
                disabled={updateLoading || uploadingPhoto || !formData.nickname.trim()}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {updateLoading || uploadingPhoto ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setPhotoFile(null)
                  if (profile) {
                    setFormData({
                      nickname: profile.nickname || "",
                      profile_photo_url: profile.profile_photo_url || "",
                      volleyball_level: profile.volleyball_level || "",
                      volleyball_experience: profile.volleyball_experience || "",
                      bio: profile.bio || "",
                    })
                    setPhotoPreview(profile.profile_photo_url || null)
                  }
                  setError(null)
                }}
                className="rounded border px-4 py-2 hover:bg-gray-50"
                disabled={updateLoading || uploadingPhoto}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {profile?.profile_photo_url && (
              <div className="flex justify-center">
                <img
                  src={profile.profile_photo_url}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Nickname</label>
                <p className="mt-1 text-gray-900">{profile?.nickname || "N/A"}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{session.user.email}</p>
              </div>

              {profile?.volleyball_level && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Volleyball Level
                  </label>
                  <p className="mt-1 text-gray-900">{profile.volleyball_level}</p>
                </div>
              )}

              {profile?.volleyball_experience && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Volleyball Experience
                  </label>
                  <p className="mt-1 text-gray-900">{profile.volleyball_experience}</p>
                </div>
              )}

              {profile?.bio && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Bio</label>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900">{profile.bio}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
