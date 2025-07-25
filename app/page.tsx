"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Music, RefreshCw, X } from "lucide-react"
import { VirtualMusicTable } from "./components/virtual-music-table"
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
  const [useCache, setUseCache] = useState(true)
  const [allTracksLoaded, setAllTracksLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, operation: "" })
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, operation: "" })
  const [isSyncing, setIsSyncing] = useState(false)
  const [scrollResetTrigger, setScrollResetTrigger] = useState(false)

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
      setLoadingProgress({ current: 0, total: 0, operation: "" })
    }
    setError(null)

    try {
      let data: TrackListResponse

      const progressCallback = (current: number, total: number, operation: string) => {
        setLoadingProgress({ current, total, operation })
      }

      // If there's a search query, use the search endpoint
      if (query && query.trim()) {
        data = await apiService.searchTracksWithCache({
          q: query.trim(),
          page,
          per_page: perPage
        }, useCache, progressCallback)
      } else {
        // Otherwise, use the regular tracks endpoint with filters
        const currentFilters = filters || activeFilters
        data = await apiService.getTracksWithCache({
          page,
          per_page: perPage,
          ...currentFilters
        }, useCache, progressCallback)
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

      // Check if we have all tracks loaded for better sorting
      setAllTracksLoaded(data.total <= data.tracks.length + (append ? tracks.length : 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      if (!append) {
        setTracks([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setLoadingProgress({ current: 0, total: 0, operation: "" })
    }
  }

  // Load all tracks for better sorting (when cache is available)
  const loadAllTracks = async (query?: string, filters?: Record<string, string>) => {
    if (!useCache) return

    setLoading(true)
    setError(null)
    setLoadingProgress({ current: 0, total: 0, operation: "" })

    try {
      const progressCallback = (current: number, total: number, operation: string) => {
        setLoadingProgress({ current, total, operation })
      }

      let data: TrackListResponse

      if (query && query.trim()) {
        // Get all search results from cache in one call
        data = await apiService.searchTracksWithCache({
          q: query.trim(),
          page: 1,
          per_page: 999999 // Get all results from cache
        }, useCache, progressCallback)
      } else {
        // Get all tracks with filters from cache in one call
        const currentFilters = filters || activeFilters
        data = await apiService.getTracksWithCache({
          page: 1,
          per_page: 999999, // Get all results from cache
          ...currentFilters
        }, useCache, progressCallback)
      }

      setTracks(data.tracks)
      setTotalTracks(data.total)
      setCurrentPage(1)
      setHasMorePages(false) // We have all tracks
      setAllTracksLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setTracks([])
    } finally {
      setLoading(false)
      setLoadingProgress({ current: 0, total: 0, operation: "" })
    }
  }

  // Initial load
  useEffect(() => {
    if (useCache) {
      loadAllTracks()
    } else {
      fetchTracks(1)
    }
  }, [useCache])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setScrollResetTrigger(prev => !prev) // Trigger scroll reset
    if (useCache) {
      loadAllTracks(searchQuery)
    } else {
      fetchTracks(1, searchQuery, false)
    }
  }

  // Handle filter
  const handleFilter = (type: string, value: string) => {
    console.log('Adding filter:', type, value) // Debug log
    const newFilters = { ...activeFilters, [type]: value }
    setActiveFilters(newFilters)
    setSearchQuery("") // Clear search when filtering
    setScrollResetTrigger(prev => !prev) // Trigger scroll reset
    if (useCache) {
      loadAllTracks("", newFilters)
    } else {
      fetchTracks(1, "", false, newFilters)
    }
  }

  // Remove filter
  const removeFilter = (type: string) => {
    console.log('Removing filter:', type) // Debug log
    const newFilters = { ...activeFilters }
    delete newFilters[type]
    setActiveFilters(newFilters)
    setScrollResetTrigger(prev => !prev) // Trigger scroll reset
    if (useCache) {
      loadAllTracks(searchQuery, newFilters)
    } else {
      fetchTracks(1, searchQuery, false, newFilters)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery("")
    setScrollResetTrigger(prev => !prev) // Trigger scroll reset
    if (useCache) {
      loadAllTracks()
    } else {
      fetchTracks(1, "", false, {})
    }
  }

  // Load more tracks (only for non-cached mode)
  const loadMoreTracks = () => {
    if (!useCache && hasMorePages && !loadingMore) {
      fetchTracks(currentPage + 1, searchQuery, true)
    }
  }

  // Toggle cache mode
  const toggleCacheMode = () => {
    setUseCache(!useCache)
  }

  // Sync cache with server
  const syncCache = async () => {
    setIsSyncing(true)
    setSyncProgress({ current: 0, total: 0, operation: "" })

    try {
      const progressCallback = (current: number, total: number, operation: string) => {
        setSyncProgress({ current, total, operation })
      }

      const syncResult = await apiService.syncCache(progressCallback)
      console.log('Cache sync result:', syncResult)

      // Update sync progress to show completion before refreshing view
      setSyncProgress({ current: 1, total: 1, operation: "Sync complete" })

      // Small delay to show completion message
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refresh current view
      if (useCache) {
        loadAllTracks(searchQuery, activeFilters)
      }
    } catch (err) {
      console.error('Cache sync failed:', err)
    } finally {
      setIsSyncing(false)
      setSyncProgress({ current: 0, total: 0, operation: "" })
    }
  }

  // Rescan library
  const handleRescan = async () => {
    setRescanLoading(true)
    try {
      const data = await apiService.rescanLibrary()
      console.log("Rescan initiated:", data.message)
      // Refresh stats and data after rescan
      setTimeout(async () => {
        await fetchStats()
        if (useCache) {
          // Use a separate progress callback for rescan cache population
          const progressCallback = (current: number, total: number, operation: string) => {
            // You could create a separate rescan progress state here if needed
            // For now, we'll just log it to avoid conflicts
            console.log(`Rescan progress: ${operation} (${current}/${total})`)
          }
          await apiService.populateCache(progressCallback) // Repopulate cache
          loadAllTracks(searchQuery, activeFilters)
        } else {
          fetchTracks(1, searchQuery, false, activeFilters)
        }
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Search Bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Music Library</span>
            {tracks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tracks.length.toLocaleString()}
                {totalTracks > tracks.length ? ` of ${totalTracks.toLocaleString()}` : ''} tracks
              </Badge>
            )}
            {(loading || loadingMore) && loadingProgress.operation && !isSyncing && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {loadingProgress.operation}
                {loadingProgress.total > 0 && (
                  <span>({loadingProgress.current}/{loadingProgress.total})</span>
                )}
              </Badge>
            )}
            {isSyncing && syncProgress.operation && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {syncProgress.operation}
                {syncProgress.total > 0 && (
                  <span>({syncProgress.current}/{syncProgress.total})</span>
                )}
              </Badge>
            )}
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

          <div className="flex items-center gap-2">
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

            <Button
              variant={useCache ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={toggleCacheMode}
              title={useCache ? "Using cached data for better sorting" : "Using live data with pagination"}
            >
              {useCache ? "Cached" : "Live"}
            </Button>

            {useCache && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={syncCache}
                disabled={loading || isSyncing}
                title="Sync cache with server"
              >
                {isSyncing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Sync"
                )}
              </Button>
            )}
          </div>
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

        {/* Status Bar */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              Showing {tracks.length.toLocaleString()} of {totalTracks.toLocaleString()} tracks
            </span>
            <span>
              Mode: {useCache ? "Cached" : "Live"}
              {useCache && allTracksLoaded && " (All loaded)"}
            </span>
          </div>
          {!loading && tracks.length > 0 && (
            <span>
              {allTracksLoaded ? "All tracks loaded - sorting optimized" : "Scroll to load more"}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Library Browser Sidebar */}
        <LibraryBrowser onFilter={handleFilter} stats={stats} activeFilters={activeFilters} useCache={useCache} />

        {/* Music Table */}
        <div className="flex-1 overflow-hidden p-4">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive mb-2">Error: {error}</p>
                <Button variant="outline" onClick={() => {
                  if (useCache) {
                    loadAllTracks(searchQuery, activeFilters)
                  } else {
                    fetchTracks(1, searchQuery, false, activeFilters)
                  }
                }}>
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <VirtualMusicTable
                tracks={tracks}
                loading={loading}
                loadingMore={loadingMore}
                hasMorePages={hasMorePages}
                allTracksLoaded={allTracksLoaded}
                loadingProgress={loadingProgress}
                onLoadMore={loadMoreTracks}
                formatDuration={formatDuration}
                resetScrollPosition={scrollResetTrigger}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
