"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Music, Clock, Users, Disc, Tag } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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
  const fetchTracks = async (page: number, query?: string) => {
    setLoading(true)
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
      setTracks(data.tracks)
      setTotalPages(data.total_pages)
      setTotalTracks(data.total)
      setCurrentPage(data.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchTracks(1)
  }, [])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchTracks(1, searchQuery)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchTracks(page, searchQuery)
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Music Library</h1>
            <p className="text-muted-foreground">Browse and search your music collection</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tracks</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_tracks.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTotalDuration(stats.total_duration_seconds)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Artists</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_artists.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Albums</CardTitle>
              <Disc className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_albums.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Genres</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_genres.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Music</CardTitle>
          <CardDescription>Search across tracks, artists, albums, and genres</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for tracks, artists, albums, or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{searchQuery ? `Search Results` : "All Tracks"}</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `Showing ${tracks.length} of ${totalTracks.toLocaleString()} tracks`}
                {searchQuery && ` for "${searchQuery}"`}
              </CardDescription>
            </div>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  fetchTracks(1)
                }}
              >
                Clear Search
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Error: {error}</p>
              <Button variant="outline" onClick={() => fetchTracks(currentPage, searchQuery)} className="mt-2">
                Retry
              </Button>
            </div>
          ) : (
            <MusicTable
              tracks={tracks}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              formatDuration={formatDuration}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
