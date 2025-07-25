// API Types based on OpenAPI 3.0.0 specification

export interface Track {
  id: number
  path: string
  extension: string
  title: string
  artist: string
  album: string
  disc_number?: number | null
  track_number?: number | null
  year?: number | null
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

export interface TrackListResponse {
  tracks: Track[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface LibraryStats {
  total_tracks: number
  total_duration_seconds: number
  unique_artists: number
  unique_albums: number
  unique_genres: number
}

export interface RescanResponse {
  message: string
  status: string
}

export interface ApiError {
  error: string
}

// API Configuration
export const API_BASE_URL = "http://localhost:4000/api/v1"

// Filter types for track queries
export interface TrackFilters {
  title?: string
  artist?: string
  album?: string
  genre?: string
  album_artist?: string
}

// Search parameters
export interface SearchParams {
  q: string
  page?: number
  per_page?: number
}

// Pagination parameters
export interface PaginationParams {
  page?: number
  per_page?: number
}
