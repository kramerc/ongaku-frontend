"use client"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlbumArt } from "@/components/ui/album-art"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react"
import { Track } from "@/lib/types"

interface MusicTableProps {
  tracks: Track[]
  loading: boolean
  loadingMore: boolean
  hasMorePages: boolean
  allTracksLoaded: boolean
  loadingProgress: { current: number; total: number; operation: string }
  onLoadMore: () => void
  formatDuration: (seconds: number) => string
}

type SortField = keyof Track
type SortDirection = "asc" | "desc"

export function MusicTable({
  tracks,
  loading,
  loadingMore,
  hasMorePages,
  allTracksLoaded,
  loadingProgress,
  onLoadMore,
  formatDuration,
}: MusicTableProps) {
  const [sortField, setSortField] = useState<SortField>("title")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll effect (only when not all tracks are loaded)
  useEffect(() => {
    if (allTracksLoaded) return // Skip infinite scroll when all tracks are loaded

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      // Load more when user scrolls to within 200px of the bottom
      if (scrollHeight - scrollTop <= clientHeight + 200 && hasMorePages && !loadingMore) {
        onLoadMore()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [hasMorePages, loadingMore, onLoadMore, allTracksLoaded])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Sort tracks locally (since API doesn't support custom sorting)
  const sortedTracks = [...tracks].sort((a, b) => {
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

  // Format audio quality
  const formatAudioQuality = (sampleRate: number, bitDepth: number, channels: number) => {
    const channelText = channels === 1 ? "Mono" : channels === 2 ? "Stereo" : `${channels}ch`
    return `${(sampleRate / 1000).toFixed(1)}kHz/${bitDepth}bit/${channelText}`
  }

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
      {/* Table */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <div className="h-full overflow-auto" ref={scrollContainerRef}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60px]">Art</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[200px]"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-2">
                    Title
                    <SortIcon field="title" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[150px]"
                  onClick={() => handleSort("artist")}
                >
                  <div className="flex items-center gap-2">
                    Artist
                    <SortIcon field="artist" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[150px]"
                  onClick={() => handleSort("album")}
                >
                  <div className="flex items-center gap-2">
                    Album
                    <SortIcon field="album" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[60px]"
                  onClick={() => handleSort("track_number")}
                >
                  <div className="flex items-center gap-2">
                    Track
                    <SortIcon field="track_number" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[60px]"
                  onClick={() => handleSort("year")}
                >
                  <div className="flex items-center gap-2">
                    Year
                    <SortIcon field="year" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[100px]"
                  onClick={() => handleSort("genre")}
                >
                  <div className="flex items-center gap-2">
                    Genre
                    <SortIcon field="genre" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[80px]"
                  onClick={() => handleSort("duration_seconds")}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    <SortIcon field="duration_seconds" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[100px]"
                  onClick={() => handleSort("audio_bitrate")}
                >
                  <div className="flex items-center gap-2">
                    Bitrate
                    <SortIcon field="audio_bitrate" />
                  </div>
                </TableHead>
                <TableHead className="min-w-[120px]">Quality</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none min-w-[80px]"
                  onClick={() => handleSort("extension")}
                >
                  <div className="flex items-center gap-2">
                    Format
                    <SortIcon field="extension" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTracks.map((track, index) => (
                <TableRow key={`${track.id}-${index}`} className="hover:bg-muted/50">
                  <TableCell>
                    <AlbumArt track={track} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="truncate" title={track.title}>
                      {track.title || "Unknown Title"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={track.artist}>
                      {track.artist || "Unknown Artist"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={track.album}>
                      {track.album || "Unknown Album"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {track.track_number ? (
                      <span className="font-mono text-sm">
                        {track.disc_number && track.disc_number > 1
                          ? `${track.disc_number}-${track.track_number}`
                          : track.track_number}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    {track.year && (
                      <span className="font-mono text-sm">{track.year}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {track.genre && (
                      <Badge variant="secondary" className="text-xs">
                        {track.genre}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatDuration(track.duration_seconds)}</TableCell>
                  <TableCell className="font-mono text-sm">{track.audio_bitrate} kbps</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatAudioQuality(track.sample_rate, track.bit_depth, track.channels)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {track.extension}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {/* Loading more indicator */}
              {loadingMore && !allTracksLoaded && (
                <TableRow key="loading-more">
                  <TableCell colSpan={10} className="text-center py-4">
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
  )
}
