import {
  API_BASE_URL,
  Track,
  TrackListResponse,
  LibraryStats,
  RescanResponse,
  TrackFilters,
  SearchParams,
  PaginationParams
} from './types'

class ApiService {
  private baseUrl = API_BASE_URL

  // Generic fetch wrapper with error handling
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Get paginated list of tracks with optional filters
  async getTracks(params: PaginationParams & TrackFilters = {}): Promise<TrackListResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const endpoint = `/tracks${queryString ? `?${queryString}` : ''}`

    return this.fetchApi<TrackListResponse>(endpoint)
  }

  // Search tracks
  async searchTracks(params: SearchParams): Promise<TrackListResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const endpoint = `/tracks/search?${queryString}`

    return this.fetchApi<TrackListResponse>(endpoint)
  }

  // Get track by ID
  async getTrack(id: number): Promise<Track> {
    return this.fetchApi<Track>(`/tracks/${id}`)
  }

  // Get library statistics
  async getStats(): Promise<LibraryStats> {
    return this.fetchApi<LibraryStats>('/stats')
  }

  // Get list of artists
  async getArtists(): Promise<string[]> {
    return this.fetchApi<string[]>('/artists')
  }

  // Get list of albums
  async getAlbums(): Promise<string[]> {
    return this.fetchApi<string[]>('/albums')
  }

  // Get albums for a specific artist by filtering tracks
  async getAlbumsForArtist(artist: string): Promise<string[]> {
    const tracks = await this.getTracks({ artist, per_page: 1000 }) // Get many tracks to ensure we get all albums
    const albums = new Set<string>()
    tracks.tracks.forEach(track => {
      if (track.album && track.album.trim()) {
        albums.add(track.album)
      }
    })
    return Array.from(albums).sort()
  }

  // Get list of genres
  async getGenres(): Promise<string[]> {
    return this.fetchApi<string[]>('/genres')
  }

  // Trigger library rescan
  async rescanLibrary(): Promise<RescanResponse> {
    return this.fetchApi<RescanResponse>('/rescan', {
      method: 'POST',
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
