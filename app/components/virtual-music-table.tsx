"use client"

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Play,
  Pause,
  Plus,
} from "lucide-react"
import { Track } from "@/lib/types"
import { useAudioPlayer } from "@/contexts/audio-player-context"

interface VirtualMusicTableProps {
  tracks: Track[]
  loading: boolean
  loadingMore: boolean
  hasMorePages: boolean
  allTracksLoaded: boolean
  loadingProgress: { current: number; total: number; operation: string }
  onLoadMore: () => void
  formatDuration: (seconds: number) => string
  resetScrollPosition?: boolean // Trigger scroll reset when this changes
}

type SortField = keyof Track
type SortDirection = "asc" | "desc"

const ROW_HEIGHT = 53 // Height of each table row in pixels
const HEADER_HEIGHT = 53 // Height of table header
const OVERSCAN = 5 // Number of extra rows to render outside viewport

// Fixed column widths to ensure header and body alignment
const COLUMN_WIDTHS = {
  actions: 100,
  title: 200,
  artist: 150,
  album: 150,
  track: 60,
  year: 60,
  genre: 100,
  duration: 80,
  bitrate: 100,
  quality: 120,
  format: 80,
} as const

// Memoized track row component for better performance
const TrackRow = memo(({
  track,
  index,
  tracks,
  formatDuration,
  formatAudioQuality
}: {
  track: Track
  index: number
  tracks: Track[]
  formatDuration: (seconds: number) => string
  formatAudioQuality: (sampleRate: number, bitDepth: number, channels: number) => string
}) => {
  const { currentTrack, isPlaying, play, pause, addToQueue, addAllToQueue } = useAudioPlayer()

  const isCurrentTrack = currentTrack?.id === track.id
  const isTrackPlaying = isCurrentTrack && isPlaying

  const handlePlay = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pause()
      } else {
        play()
      }
    } else {
      // Ensure track has meaningful metadata before playing
      const trackToPlay = {
        ...track,
        title: track.title?.trim() || 'Unknown Title',
        artist: track.artist?.trim() || 'Unknown Artist',
        album: track.album?.trim() || 'Unknown Album'
      }
      play(trackToPlay)
    }
  }

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Validate track before adding to queue
    if (!track || !track.id) {
      console.error('Invalid track object:', track)
      return
    }
    
    // Ensure track has meaningful metadata
    const trackToAdd = {
      ...track,
      title: track.title?.trim() || 'Unknown Title',
      artist: track.artist?.trim() || 'Unknown Artist',
      album: track.album?.trim() || 'Unknown Album'
    }
    
    addToQueue(trackToAdd)
    // Simple visual feedback - you could replace this with a proper toast notification
    console.log(`Added "${trackToAdd.title}" to queue`)
  }

  const handlePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Normalize track data before adding to queue
    const normalizedTracks = tracks.map(t => ({
      ...t,
      title: t.title?.trim() || 'Unknown Title',
      artist: t.artist?.trim() || 'Unknown Artist',
      album: t.album?.trim() || 'Unknown Album'
    }))
    addAllToQueue(normalizedTracks, index)
  }

  return (
    <TableRow key={`${track.id}-${index}`} className="hover:bg-muted/50" style={{ height: ROW_HEIGHT }}>
      <TableCell style={{ width: COLUMN_WIDTHS.actions }}>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={handlePlay}
            title={isTrackPlaying ? "Pause" : "Play"}
          >
            {isTrackPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={handleAddToQueue}
            title="Add to queue"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="font-medium" style={{ width: COLUMN_WIDTHS.title }}>
        <div className="truncate" title={track.title}>
          {track.title || "Unknown Title"}
        </div>
      </TableCell>
      <TableCell style={{ width: COLUMN_WIDTHS.artist }}>
        <div className="truncate" title={track.artist}>
          {track.artist || "Unknown Artist"}
        </div>
      </TableCell>
      <TableCell style={{ width: COLUMN_WIDTHS.album }}>
        <div className="truncate" title={track.album}>
          {track.album || "Unknown Album"}
        </div>
      </TableCell>
      <TableCell className="text-center" style={{ width: COLUMN_WIDTHS.track }}>
        {track.track_number ? (
          <span className="font-mono text-sm">
            {track.disc_number
              ? `${track.disc_number}-${track.track_number}`
              : track.track_number}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-center" style={{ width: COLUMN_WIDTHS.year }}>
        {track.year && (
          <span className="font-mono text-sm">{track.year}</span>
        )}
      </TableCell>
      <TableCell style={{ width: COLUMN_WIDTHS.genre }}>
        {track.genre && (
          <Badge variant="secondary" className="text-xs">
            {track.genre}
          </Badge>
        )}
      </TableCell>
      <TableCell className="font-mono text-sm" style={{ width: COLUMN_WIDTHS.duration }}>{formatDuration(track.duration_seconds)}</TableCell>
      <TableCell className="font-mono text-sm" style={{ width: COLUMN_WIDTHS.bitrate }}>{track.audio_bitrate} kbps</TableCell>
      <TableCell className="font-mono text-xs" style={{ width: COLUMN_WIDTHS.quality }}>
        {formatAudioQuality(track.sample_rate, track.bit_depth, track.channels)}
      </TableCell>
      <TableCell style={{ width: COLUMN_WIDTHS.format }}>
        <Badge variant="outline" className="text-xs uppercase">
          {track.extension}
        </Badge>
      </TableCell>
    </TableRow>
  )
})

TrackRow.displayName = 'TrackRow'

export function VirtualMusicTable({
  tracks,
  loading,
  loadingMore,
  hasMorePages,
  allTracksLoaded,
  loadingProgress,
  onLoadMore,
  formatDuration,
  resetScrollPosition,
}: VirtualMusicTableProps) {
  const [sortField, setSortField] = useState<SortField>("title")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const { addAllToQueue } = useAudioPlayer()

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Sort tracks
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      // Special sorting for album field
      if (sortField === "album") {
        // Handle empty/unknown albums - put them at the bottom
        const aAlbum = a.album || ""
        const bAlbum = b.album || ""

        const aIsUnknown = !aAlbum
        const bIsUnknown = !bAlbum

        // If one is unknown and the other isn't, put unknown at the bottom
        if (aIsUnknown && !bIsUnknown) {
          return sortDirection === "asc" ? 1 : -1
        }
        if (!aIsUnknown && bIsUnknown) {
          return sortDirection === "asc" ? -1 : 1
        }

        // If both are unknown or both are known, compare normally
        const albumComparison = aAlbum.localeCompare(bAlbum)
        if (albumComparison !== 0) {
          return sortDirection === "asc" ? albumComparison : -albumComparison
        }

        // If album names are the same, sort by disc number (nullish values go to end)
        const aDisc = a.disc_number ?? Number.MAX_SAFE_INTEGER
        const bDisc = b.disc_number ?? Number.MAX_SAFE_INTEGER
        const discComparison = aDisc - bDisc
        if (discComparison !== 0) {
          return sortDirection === "asc" ? discComparison : -discComparison
        }

        // If disc numbers are the same, sort by track number (nullish values go to end)
        const aTrack = a.track_number ?? Number.MAX_SAFE_INTEGER
        const bTrack = b.track_number ?? Number.MAX_SAFE_INTEGER
        const trackComparison = aTrack - bTrack
        if (trackComparison !== 0) {
          return sortDirection === "asc" ? trackComparison : -trackComparison
        }

        // If track numbers are the same, sort by year (nullish values go to end, oldest first)
        const aYear = a.year ?? Number.MAX_SAFE_INTEGER
        const bYear = b.year ?? Number.MAX_SAFE_INTEGER
        const yearComparison = aYear - bYear
        if (yearComparison !== 0) {
          return sortDirection === "asc" ? yearComparison : -yearComparison
        }

        // Finally, fall back to title comparison
        const titleComparison = a.title.localeCompare(b.title)
        return sortDirection === "asc" ? titleComparison : -titleComparison
      }

      // Default sorting logic for other fields
      const aValue = a[sortField]
      const bValue = b[sortField]

      let comparison = 0
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [tracks, sortField, sortDirection])

  // Calculate virtual scrolling parameters
  const { visibleStartIndex, visibleEndIndex, totalHeight, offsetY } = useMemo(() => {
    const itemCount = sortedTracks.length
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT)

    // Use current scroll position, but reset to 0 if it seems like we have new filtered data
    const currentScrollTop = scrollTop

    const startIndex = Math.floor(currentScrollTop / ROW_HEIGHT)
    const endIndex = Math.min(startIndex + visibleCount + OVERSCAN, itemCount)
    const visibleStartIndex = Math.max(0, startIndex - OVERSCAN)

    return {
      visibleStartIndex,
      visibleEndIndex: endIndex,
      totalHeight: itemCount * ROW_HEIGHT,
      offsetY: visibleStartIndex * ROW_HEIGHT
    }
  }, [sortedTracks.length, containerHeight, scrollTop])

  // Get visible tracks
  const visibleTracks = useMemo(() => {
    return sortedTracks.slice(visibleStartIndex, visibleEndIndex)
  }, [sortedTracks, visibleStartIndex, visibleEndIndex])

  // Handle scroll with throttling for better performance
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    setScrollTop(container.scrollTop)

    // Trigger load more for non-cached mode
    if (!allTracksLoaded && hasMorePages && !loadingMore) {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop <= clientHeight + 200) {
        onLoadMore()
      }
    }
  }, [allTracksLoaded, hasMorePages, loadingMore, onLoadMore])

  // Throttled scroll handler
  const throttledHandleScroll = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        handleScroll()
        timeoutId = null
      }, 16) // ~60fps
    }
  }, [handleScroll])

  // Setup scroll listener and resize observer
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    container.addEventListener('scroll', throttledHandleScroll, { passive: true })

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [throttledHandleScroll])

  // Reset scroll position when filters change
  useEffect(() => {
    if (resetScrollPosition !== undefined) {
      // Immediately reset scroll state
      setScrollTop(0)

      // Reset the actual scroll position
      const container = scrollContainerRef.current
      if (container) {
        container.scrollTop = 0
      }
    }
  }, [resetScrollPosition])

  // Also reset when tracks array changes (likely from filtering)
  useEffect(() => {
    setScrollTop(0)
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTop = 0
    }
  }, [tracks])

  // Format audio quality
  const formatAudioQuality = useCallback((sampleRate: number, bitDepth: number, channels: number) => {
    const channelText = channels === 1 ? "Mono" : channels === 2 ? "Stereo" : `${channels}ch`
    return `${(sampleRate / 1000).toFixed(1)}kHz/${bitDepth}bit/${channelText}`
  }, [])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <div className="mt-3 text-center">
          <div className="text-sm font-medium">
            {loadingProgress.operation || "Loading tracks..."}
          </div>
          {loadingProgress.total > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">
                Page {loadingProgress.current} of {loadingProgress.total}
              </div>
              <div className="w-48 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tracks found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-b flex justify-between items-center">
        <span>
          Showing {visibleTracks.length} of {sortedTracks.length} tracks
          {sortedTracks.length !== tracks.length && ` (${tracks.length} total loaded)`}
        </span>
        {sortedTracks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              addAllToQueue(sortedTracks, 0)
              console.log(`Added ${sortedTracks.length} tracks to queue`)
            }}
            title="Play all tracks"
          >
            <Play className="w-3 h-3 mr-1" />
            Play All
          </Button>
        )}
      </div>

      {/* Virtual Table */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <div className="h-full overflow-auto" ref={scrollContainerRef}>
          {/* Container for virtual scrolling */}
          <div style={{ height: totalHeight + HEADER_HEIGHT, position: 'relative' }}>
            {/* Sticky Header */}
            <div className="sticky top-0 bg-background z-10">
              <Table style={{ tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: COLUMN_WIDTHS.actions }}>Actions</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.title }}
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center gap-2">
                        Title
                        <SortIcon field="title" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.artist }}
                      onClick={() => handleSort("artist")}
                    >
                      <div className="flex items-center gap-2">
                        Artist
                        <SortIcon field="artist" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.album }}
                      onClick={() => handleSort("album")}
                    >
                      <div className="flex items-center gap-2">
                        Album
                        <SortIcon field="album" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.track }}
                      onClick={() => handleSort("track_number")}
                    >
                      <div className="flex items-center gap-2">
                        Track
                        <SortIcon field="track_number" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.year }}
                      onClick={() => handleSort("year")}
                    >
                      <div className="flex items-center gap-2">
                        Year
                        <SortIcon field="year" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.genre }}
                      onClick={() => handleSort("genre")}
                    >
                      <div className="flex items-center gap-2">
                        Genre
                        <SortIcon field="genre" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.duration }}
                      onClick={() => handleSort("duration_seconds")}
                    >
                      <div className="flex items-center gap-2">
                        Duration
                        <SortIcon field="duration_seconds" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.bitrate }}
                      onClick={() => handleSort("audio_bitrate")}
                    >
                      <div className="flex items-center gap-2">
                        Bitrate
                        <SortIcon field="audio_bitrate" />
                      </div>
                    </TableHead>
                    <TableHead style={{ width: COLUMN_WIDTHS.quality }}>Quality</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      style={{ width: COLUMN_WIDTHS.format }}
                      onClick={() => handleSort("extension")}
                    >
                      <div className="flex items-center gap-2">
                        Format
                        <SortIcon field="extension" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            {/* Virtual Rows */}
            <div style={{ paddingTop: offsetY }}>
              <Table style={{ tableLayout: 'fixed' }}>
                <TableBody>
                  {visibleTracks.map((track, index) => (
                    <TrackRow
                      key={`${track.id}-${visibleStartIndex + index}`}
                      track={track}
                      index={visibleStartIndex + index}
                      tracks={sortedTracks}
                      formatDuration={formatDuration}
                      formatAudioQuality={formatAudioQuality}
                    />
                  ))}

                  {/* Loading more indicator */}
                  {loadingMore && !allTracksLoaded && (
                    <TableRow key="loading-more" style={{ height: ROW_HEIGHT }}>
                      <TableCell colSpan={11} className="text-center py-4">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading more tracks...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
