"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useMap } from "react-leaflet"

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
// const useMap = dynamic(
//   () => import("react-leaflet").then((mod) => mod.useMap),
//   { ssr: false }
// )

// Import CSS
import "leaflet/dist/leaflet.css"

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

type LeafletMapInputProps = {
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
}

function MapUpdater({
  position,
  onLocationSelect,
}: {
  position: { lat: number; lng: number } | null
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
}) {
  const [MapHook, setMapHook] = useState<any>(null)

  useEffect(() => {
    import("react-leaflet").then((mod) => {
      setMapHook(() => mod.useMap)
    })
  }, [])

  if (!MapHook) return null

  const MapContent = () => {
    const map = MapHook()

    useEffect(() => {
      if (position) {
        map.setView([position.lat, position.lng], 15)
      }
    }, [position, map])

    useEffect(() => {
      const handleClick = (e: any) => {
        const { lat, lng } = e.latlng
        // Reverse geocode to get address
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              "User-Agent": "VolleyballCommunity/1.0",
            },
          }
        )
          .then((res) => res.json())
          .then((data) => {
            const address =
              data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            if (onLocationSelect) {
              onLocationSelect({ lat, lng, address })
            }
          })
          .catch((err) => {
            console.error("Error reverse geocoding:", err)
            const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            if (onLocationSelect) {
              onLocationSelect({ lat, lng, address })
            }
          })
      }

      map.on("click", handleClick)
      return () => {
        map.off("click", handleClick)
      }
    }, [map, onLocationSelect])

    return null
  }

  return <MapContent />
}

export default function LeafletMapInput({
  value,
  onChange,
  onLocationSelect,
}: LeafletMapInputProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)


  // Only run on client side
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

    // Get user's location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // Default to Seoul if user denies location
          setPosition({ lat: 37.5665, lng: 126.978 })
        }
      )
    } else {
      setPosition({ lat: 37.5665, lng: 126.978 })
    }
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`,
        {
          headers: {
            "User-Agent": "VolleyballCommunity/1.0",
          },
        }
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching location:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    onChange(query)

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query)
    }, 300)
  }

  const handleSelectResult = (result: any) => {
    const address = result.display_name
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    onChange(address)
    setPosition({ lat, lng })
    setSearchResults([])

    if (onLocationSelect) {
      onLocationSelect({ lat, lng, address })
    }

    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  // Update position when value changes (e.g., when editing existing post)
  useEffect(() => {
    if (!value || !mounted) return

    // Only update if position is not already set or value changed
    const updatePositionFromValue = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            value
          )}&limit=1`,
          {
            headers: {
              "User-Agent": "VolleyballCommunity/1.0",
            },
          }
        )
        const data = await response.json()
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)
          setPosition({ lat, lng })
        }
      } catch (error) {
        console.error("Error geocoding value:", error)
      }
    }

    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(updatePositionFromValue, 500)
    return () => clearTimeout(timeoutId)
  }, [value, mounted])

  if (!mounted) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded border p-3"
          value={value}
          onChange={handleInputChange}
          placeholder="Search for a location..."
        />
        <p className="mt-1 text-xs text-gray-500">Loading map...</p>
      </div>
    )
  }

  if (!position) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded border p-3"
          value={value}
          onChange={handleInputChange}
          placeholder="Search for a location..."
        />
        <p className="mt-1 text-xs text-gray-500">Loading map...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded border p-3"
          value={value}
          onChange={handleInputChange}
          placeholder="Search for a location (e.g., Central Park, NYC)..."
        />
        {isSearching && (
          <div className="absolute right-3 top-3 text-gray-400">Searching...</div>
        )}
        {searchResults.length > 0 && (
          <div className="absolute z-[9999] mt-1 w-full rounded border bg-white shadow-lg">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelectResult(result)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                <div className="text-sm font-medium">{result.display_name}</div>
                {result.type && (
                  <div className="text-xs text-gray-500">{result.type}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 h-64 w-full overflow-hidden rounded-lg border">
        {typeof window !== "undefined" && (
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[position.lat, position.lng]} />
            <MapUpdater position={position} onLocationSelect={onLocationSelect} />
          </MapContainer>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Click on the map to select a location
      </p>
    </div>
  )
}
