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
  tags: Record<string, string | number | boolean | null>
  album_art_path?: string | null
  album_art_mime_type?: string | null
  album_art_size?: number | null
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
export const API_BASE_URL = "https://ongaku-dev.m3r.dev/api/v1"

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

// Audio Player Types
export interface AudioPlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  queue: Track[]
  currentIndex: number
  repeat: 'none' | 'one' | 'all'
  shuffle: boolean
  error: string | null
  libraryTracks: Track[]
  libraryIndex: number
}

export interface AudioPlayerContextType extends AudioPlayerState {
  play: (track?: Track) => void
  pause: () => void
  stop: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  addToQueue: (track: Track) => void
  addAllToQueue: (tracks: Track[], startIndex?: number) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  playFromQueue: (index: number) => void
  clearError: () => void
  setLibraryTracks: (tracks: Track[]) => void
}

// Last.fm Integration Types
export interface LastfmAuthResponse {
  auth_url: string
  token: string
}

export interface LastfmSessionRequest {
  token: string
}

export interface LastfmSessionResponse {
  session_key: string
  username: string
  message: string
}

export interface ScrobbleRequest {
  session_key: string
  timestamp: number
  album_artist?: string
}

export interface NowPlayingRequest {
  session_key: string
}

export interface ScrobbleResponse {
  success: boolean
  message: string
  scrobble_id?: string
}

export interface NowPlayingResponse {
  success: boolean
  message: string
}

export interface LastfmSettings {
  sessionKey: string | null
  username: string | null
  scrobblingEnabled: boolean
}
