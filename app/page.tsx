"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Music } from "lucide-react"
import { MusicTable } from "./components/music-table"
import { ThemeToggle } from "@/components/theme-toggle"

interface Track {
  id: number
  path: string
  extension: string
  title: string
  artist: string
  album: string
  genre: string
  album_artist: string
  publisher: string
  catalog_number: string
  duration_seconds: number
  audio_bitrate: number
  overall_bitrate: number
  sample_rate: number
  bit_depth: number
  channels: number
  tags: Record<string, any>
  created: string
  modified: string
}

interface TrackListResponse {
  tracks: Track[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface LibraryStats {
  total_tracks: number
  total_duration_seconds: number
  unique_artists: number
  unique_albums: number
  unique_genres: number
}

const API_BASE_URL = "http://localhost:3000/api/v1"

export default function MusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [totalTracks, setTotalTracks] = useState(0)
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const perPage = 50

  // Fetch library statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stats`)
        if (!response.ok) throw new Error("Failed to fetch stats")
        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }
    fetchStats()
  }, [])

  // Fetch tracks
  const fetchTracks = async (page: number, query?: string, append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setTracks([])
      setCurrentPage(1)
      setHasMorePages(true)
    }
    setError(null)

    try {
      let url = `${API_BASE_URL}/tracks?page=${page}&per_page=${perPage}`

      if (query && query.trim()) {
        url = `${API_BASE_URL}/tracks/search?q=${encodeURIComponent(query.trim())}&page=${page}&per_page=${perPage}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: TrackListResponse = await response.json()

      if (append) {
        setTracks(prev => {
          // Prevent duplicate tracks by filtering out any that already exist
          const existingIds = new Set(prev.map(track => track.id))
          const newTracks = data.tracks.filter(track => !existingIds.has(track.id))
          return [...prev, ...newTracks]
        })
      } else {
        setTracks(data.tracks)
      }

      setHasMorePages(data.page < data.total_pages)
      setTotalTracks(data.total)
      setCurrentPage(data.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      if (!append) {
        setTracks([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchTracks(1)
  }, [])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTracks(1, searchQuery, false)
  }

  // Load more tracks
  const loadMoreTracks = () => {
    if (hasMorePages && !loadingMore) {
      fetchTracks(currentPage + 1, searchQuery, true)
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  // Format total duration for stats
  const formatTotalDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Minimal Search Bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Music Library</span>
            <ThemeToggle />
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search music..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
            <Button type="submit" disabled={loading} size="sm" className="h-8">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
            </Button>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  setSearchQuery("")
                  fetchTracks(1, "", false)
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Full Screen Music Table */}
      <div className="flex-1 overflow-hidden p-4">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive mb-2">Error: {error}</p>
              <Button variant="outline" onClick={() => fetchTracks(1, searchQuery, false)}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <MusicTable
              tracks={tracks}
              loading={loading}
              loadingMore={loadingMore}
              hasMorePages={hasMorePages}
              onLoadMore={loadMoreTracks}
              formatDuration={formatDuration}
            />
          </div>
        )}
      </div>
    </div>
  )
}
