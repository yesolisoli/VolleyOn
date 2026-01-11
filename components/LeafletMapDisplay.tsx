"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

// Import CSS
import "leaflet/dist/leaflet.css"

type LeafletMapDisplayProps = {
  location: string
  lat?: number | null
  lng?: number | null
  height?: string
}

// Extract short location name from full address
const getShortLocationName = (address: string): string => {
  if (!address) return ""
  
  // Split by comma and take first 2-3 parts (usually gives: "Place Name, City" or "Place Name, Area, City")
  const parts = address.split(",").map((p) => p.trim())
  
  // If address is very long, take only first 2 parts
  if (parts.length > 3) {
    return parts.slice(0, 2).join(", ")
  }
  
  // Otherwise take first 3 parts or all if less than 3
  return parts.slice(0, Math.min(3, parts.length)).join(", ")
}

export default function LeafletMapDisplay({
  location,
  lat,
  lng,
  height = "h-64",
}: LeafletMapDisplayProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Fix Leaflet marker icon
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        })
      })
    }

    // Use stored coordinates if available, otherwise geocode
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      setPosition({ lat, lng })
    } else if (location) {
      // Fallback to geocoding if coordinates not available
      const geocodeLocation = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              location
            )}&limit=1`,
            {
              headers: {
                "User-Agent": "VolleyballCommunity/1.0",
              },
            }
          )
          const data = await response.json()
          if (data && data.length > 0) {
            const geocodedLat = parseFloat(data[0].lat)
            const geocodedLng = parseFloat(data[0].lon)
            setPosition({ lat: geocodedLat, lng: geocodedLng })
          }
        } catch (error) {
          console.error("Error geocoding location:", error)
        }
      }
      geocodeLocation()
    }
  }, [location, lat, lng])

  if (!mounted || !position) {
    return (
      <div className={`w-full overflow-hidden rounded-lg border ${height} flex items-center justify-center bg-gray-50`}>
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  return (
    <div className={`w-full overflow-hidden rounded-lg border ${height}`}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[position.lat, position.lng]} />
      </MapContainer>
    </div>
  )
}

export { getShortLocationName }
