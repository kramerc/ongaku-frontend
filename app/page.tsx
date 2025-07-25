"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Music, RefreshCw, X } from "lucide-react"
import { MusicTable } from "./components/music-table"
import { ThemeToggle } from "@/components/theme-toggle"
import { LibraryBrowser } from "@/components/library-browser"
import { Badge } from "@/components/ui/badge"
import { Track, TrackListResponse, LibraryStats } from "@/lib/types"
import { apiService } from "@/lib/api"

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
  const [rescanLoading, setRescanLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const perPage = 50

  // Fetch library statistics
  const fetchStats = async () => {
    try {
      const data = await apiService.getStats()
      setStats(data)
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Fetch tracks
  const fetchTracks = async (page: number, query?: string, append: boolean = false, filters?: Record<string, string>) => {
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
      let data: TrackListResponse

      // If there's a search query, use the search endpoint
      if (query && query.trim()) {
        data = await apiService.searchTracks({
          q: query.trim(),
          page,
          per_page: perPage
        })
      } else {
        // Otherwise, use the regular tracks endpoint with filters
        const currentFilters = filters || activeFilters
        data = await apiService.getTracks({
          page,
          per_page: perPage,
          ...currentFilters
        })
      }

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

  // Handle filter
  const handleFilter = (type: string, value: string) => {
    console.log('Adding filter:', type, value) // Debug log
    const newFilters = { ...activeFilters, [type]: value }
    setActiveFilters(newFilters)
    setSearchQuery("") // Clear search when filtering
    fetchTracks(1, "", false, newFilters)
  }

  // Remove filter
  const removeFilter = (type: string) => {
    console.log('Removing filter:', type) // Debug log
    const newFilters = { ...activeFilters }
    delete newFilters[type]
    setActiveFilters(newFilters)
    fetchTracks(1, searchQuery, false, newFilters)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery("")
    fetchTracks(1, "", false, {})
  }

  // Load more tracks
  const loadMoreTracks = () => {
    if (hasMorePages && !loadingMore) {
      fetchTracks(currentPage + 1, searchQuery, true)
    }
  }

  // Rescan library
  const handleRescan = async () => {
    setRescanLoading(true)
    try {
      const data = await apiService.rescanLibrary()
      console.log("Rescan initiated:", data.message)
      // Optionally refresh stats after rescan
      setTimeout(() => {
        fetchStats()
      }, 1000)
    } catch (err) {
      console.error("Error initiating rescan:", err)
    } finally {
      setRescanLoading(false)
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
      {/* Header with Search Bar */}
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
            {(searchQuery || Object.keys(activeFilters).length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
            )}
          </form>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRescan}
            disabled={rescanLoading}
          >
            {rescanLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Rescan
          </Button>
        </div>

        {/* Active Filters */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([type, value]) => (
              <div key={type} className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {type}: {value}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-5 h-5 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={() => removeFilter(type)}
                  title={`Remove ${type} filter`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Library Browser Sidebar */}
        <LibraryBrowser onFilter={handleFilter} stats={stats} activeFilters={activeFilters} />

        {/* Music Table */}
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
    </div>
  )
}
