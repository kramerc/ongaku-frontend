"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react"

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

interface MusicTableProps {
  tracks: Track[]
  loading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  formatDuration: (seconds: number) => string
}

type SortField = keyof Track
type SortDirection = "asc" | "desc"

export function MusicTable({
  tracks,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  formatDuration,
}: MusicTableProps) {
  const [sortField, setSortField] = useState<SortField>("title")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

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

  // Format file size
  const formatFileSize = (bitrate: number, duration: number) => {
    const sizeInMB = (bitrate * duration) / (8 * 1024)
    return `${sizeInMB.toFixed(1)} MB`
  }

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading tracks...</span>
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
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
              {sortedTracks.map((track) => (
                <TableRow key={track.id} className="hover:bg-muted/50">
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
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
