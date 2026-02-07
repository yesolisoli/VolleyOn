"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

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
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Import CSS
import "leaflet/dist/leaflet.css"

type Post = {
  id: string
  title: string
  location: string | null
  location_lat: number | null
  location_lng: number | null
}

type PostMarker = {
  id: string
  title: string
  location: string
  lat: number
  lng: number
}

// Component to fit bounds to all markers
function FitBounds({ markers }: { markers: PostMarker[] }) {
  const [MapHook, setMapHook] = useState<any>(null)

  useEffect(() => {
    import("react-leaflet").then((mod) => {
      setMapHook(() => mod.useMap)
    })
  }, [])

  if (!MapHook) return null

  const MapComponent = () => {
    const map = MapHook()

    useEffect(() => {
      if (markers.length > 0 && map) {
        try {
          // Use Leaflet's LatLngBounds for proper bounds calculation
          import("leaflet").then((L) => {
            const latlngs = markers.map((marker) => L.latLng(marker.lat, marker.lng))
            const bounds = L.latLngBounds(latlngs)
            map.fitBounds(bounds, {
              padding: [50, 50], // Add padding around markers
              maxZoom: 15, // Maximum zoom level (don't zoom in too much)
            })
          })
        } catch (error) {
          console.error("Error fitting bounds:", error)
        }
      }
    }, [map, markers])

    return null
  }

  return <MapComponent />
}

export default function PostsMap() {
  const [posts, setPosts] = useState<Post[]>([])
  const [markers, setMarkers] = useState<PostMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Fix Leaflet marker icon
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const whiteMarkerSvg =
          "data:image/svg+xml;utf8," +
          "<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'>" +
          "<path d='M12.5 0C6 0 0.7 5.3 0.7 11.8c0 7.9 10.3 18.2 11 18.9 0.4 0.4 1 0.4 1.4 0 0.7-0.7 11-11 11-18.9C24.3 5.3 19 0 12.5 0z' fill='%23ffffff' stroke='%239ca3af' stroke-width='1.5'/>" +
          "<circle cx='12.5' cy='11.8' r='4.5' fill='%23e5e7eb' stroke='%239ca3af' stroke-width='1.2'/>" +
          "</svg>"

        const whiteIcon = L.icon({
          iconUrl: whiteMarkerSvg,
          iconRetinaUrl: whiteMarkerSvg,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [0, -36],
        })

        L.Marker.prototype.options.icon = whiteIcon
      })
    }

    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, location, location_lat, location_lng")
        .not("location", "is", null)
        .not("location_lat", "is", null)
        .not("location_lng", "is", null)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching posts:", error)
        return
      }

      if (data) {
        console.log(`Fetched ${data.length} posts with locations and coordinates`)
        setPosts(data)
        // Use stored coordinates directly - no geocoding needed!
        const markersData: PostMarker[] = data
          .filter((post) => post.location_lat !== null && post.location_lng !== null)
          .map((post) => ({
            id: post.id,
            title: post.title,
            location: post.location!,
            lat: post.location_lat!,
            lng: post.location_lng!,
          }))
        setMarkers(markersData)
        console.log(`Created ${markersData.length} markers from stored coordinates`)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

        if (!mounted) {
          return (
            <div className="h-[300px] w-full overflow-hidden rounded-lg border bg-gray-50">
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">Loading map...</p>
              </div>
            </div>
          )
        }

        if (loading) {
          return (
            <div className="h-[300px] w-full overflow-hidden rounded-lg border bg-gray-50">
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">Loading posts...</p>
              </div>
            </div>
          )
        }

        if (markers.length === 0) {
          return (
            <div className="h-[300px] w-full overflow-hidden rounded-lg border bg-gray-50">
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No posts with locations yet.</p>
              </div>
            </div>
          )
        }

  // Calculate center point (average of all markers)
  const centerLat =
    markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length
  const centerLng =
    markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length

  // Calculate initial zoom - higher for closer markers
  const calculateZoom = () => {
    if (markers.length === 0) return 13
    if (markers.length === 1) return 15 // Single marker - zoom in close

    // Calculate spread of markers
    const lats = markers.map((m) => m.lat)
    const lngs = markers.map((m) => m.lng)
    const latRange = Math.max(...lats) - Math.min(...lats)
    const lngRange = Math.max(...lngs) - Math.min(...lngs)
    const maxRange = Math.max(latRange, lngRange)

    // Adjust zoom based on spread (closer markers = higher zoom)
    if (maxRange < 0.01) return 14 // Very close together
    if (maxRange < 0.05) return 13 // Close together
    if (maxRange < 0.1) return 12 // Medium distance
    if (maxRange < 0.5) return 11 // Far apart
    return 10 // Very far apart
  }

        return (
          <div className="h-[300px] w-full overflow-hidden rounded-lg border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={calculateZoom()}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="mb-2 font-semibold">{marker.title}</h3>
                <p className="mb-2 text-sm text-gray-600">{marker.location}</p>
                <Link
                  href={`/posts/${marker.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Post →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds markers={markers} />
      </MapContainer>
    </div>
  )
}
