import {
  API_BASE_URL,
  Track,
  TrackListResponse,
  LibraryStats,
  RescanResponse,
  TrackFilters,
  SearchParams,
  PaginationParams,
  LastfmAuthResponse,
  LastfmSessionRequest,
  LastfmSessionResponse,
  ScrobbleRequest,
  NowPlayingRequest,
  ScrobbleResponse,
  NowPlayingResponse
} from './types'
import { trackCache } from './cache'

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

  // Fetch all tracks from server (for cache population)
  async getAllTracksFromServer(onProgress?: (current: number, total: number) => void): Promise<Track[]> {
    const allTracks: Track[] = []
    let page = 1
    let hasMore = true
    let totalPages = 1
    const perPage = 1000 // Large page size for efficiency

    while (hasMore) {
      const response = await this.getTracks({ page, per_page: perPage })
      allTracks.push(...response.tracks)

      totalPages = response.total_pages
      hasMore = page < response.total_pages

      // Report progress
      if (onProgress) {
        onProgress(page, totalPages)
      }

      page++
    }

    return allTracks
  }

  // Get tracks with caching support
  async getTracksWithCache(
    params: PaginationParams & TrackFilters = {},
    useCache = true,
    onProgress?: (current: number, total: number, operation: string) => void
  ): Promise<TrackListResponse> {
    if (!useCache) {
      return this.getTracks(params)
    }

    try {
      // Check if cache is empty and populate if needed
      if (await trackCache.isEmpty()) {
        await this.populateCache(onProgress)
      }

      // Get tracks from cache
      const { page = 1, per_page = 50, ...filters } = params

      let tracks: Track[]
      if (Object.keys(filters).length > 0) {
        tracks = await trackCache.getTracksByFilter(filters)
      } else {
        tracks = await trackCache.getAllTracks()
      }

      // Apply pagination to cached results
      const startIndex = (page - 1) * per_page
      const endIndex = startIndex + per_page
      const paginatedTracks = tracks.slice(startIndex, endIndex)

      return {
        tracks: paginatedTracks,
        total: tracks.length,
        page,
        per_page,
        total_pages: Math.ceil(tracks.length / per_page)
      }
    } catch (error) {
      console.warn('Cache error, falling back to API:', error)
      return this.getTracks(params)
    }
  }

  // Search tracks with caching support
  async searchTracksWithCache(
    params: SearchParams,
    useCache = true,
    onProgress?: (current: number, total: number, operation: string) => void
  ): Promise<TrackListResponse> {
    if (!useCache) {
      return this.searchTracks(params)
    }

    try {
      // Check if cache is empty and populate if needed
      if (await trackCache.isEmpty()) {
        await this.populateCache(onProgress)
      }

      const { q, page = 1, per_page = 50 } = params
      const tracks = await trackCache.searchTracks(q)

      // Apply pagination to search results
      const startIndex = (page - 1) * per_page
      const endIndex = startIndex + per_page
      const paginatedTracks = tracks.slice(startIndex, endIndex)

      return {
        tracks: paginatedTracks,
        total: tracks.length,
        page,
        per_page,
        total_pages: Math.ceil(tracks.length / per_page)
      }
    } catch (error) {
      console.warn('Cache error, falling back to API:', error)
      return this.searchTracks(params)
    }
  }

  // Populate cache with all tracks
  async populateCache(onProgress?: (current: number, total: number, operation: string) => void): Promise<void> {
    const allTracks = await this.getAllTracksFromServer((current, total) => {
      if (onProgress) {
        onProgress(current, total, "Loading tracks from server")
      }
    })

    if (onProgress) {
      onProgress(1, 1, "Storing tracks in cache")
    }

    await trackCache.storeTracks(allTracks)
  }

  // Sync cache with server
  async syncCache(onProgress?: (current: number, total: number, operation: string) => void): Promise<{ added: number; updated: number; removed: number }> {
    return trackCache.syncWithServer(() => {
      return this.getAllTracksFromServer((current, total) => {
        if (onProgress) {
          onProgress(current, total, "Syncing with server")
        }
      })
    })
  }

  // Clear cache
  async clearCache(): Promise<void> {
    return trackCache.clearCache()
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
  async getArtists(useCache = true): Promise<string[]> {
    if (useCache) {
      try {
        if (await trackCache.isEmpty()) {
          await this.populateCache()
        }
        return trackCache.getUniqueValues('artist')
      } catch (error) {
        console.warn('Cache error, falling back to API:', error)
      }
    }
    return this.fetchApi<string[]>('/artists')
  }

  // Get list of albums
  async getAlbums(useCache = true): Promise<string[]> {
    if (useCache) {
      try {
        if (await trackCache.isEmpty()) {
          await this.populateCache()
        }
        return trackCache.getUniqueValues('album')
      } catch (error) {
        console.warn('Cache error, falling back to API:', error)
      }
    }
    return this.fetchApi<string[]>('/albums')
  }

  // Get albums for a specific artist by filtering tracks
  async getAlbumsForArtist(artist: string, useCache = true): Promise<string[]> {
    if (useCache) {
      try {
        if (await trackCache.isEmpty()) {
          await this.populateCache()
        }
        return trackCache.getAlbumsForArtist(artist)
      } catch (error) {
        console.warn('Cache error, falling back to API:', error)
      }
    }
    // Fallback to original implementation
    const tracks = await this.getTracks({ artist, per_page: 1000 })
    const albums = new Set<string>()
    tracks.tracks.forEach(track => {
      if (track.album && track.album.trim()) {
        albums.add(track.album)
      }
    })
    return Array.from(albums).sort()
  }

  // Get list of genres
  async getGenres(useCache = true): Promise<string[]> {
    if (useCache) {
      try {
        if (await trackCache.isEmpty()) {
          await this.populateCache()
        }
        return trackCache.getUniqueValues('genre')
      } catch (error) {
        console.warn('Cache error, falling back to API:', error)
      }
    }
    return this.fetchApi<string[]>('/genres')
  }

  // Trigger library rescan
  async rescanLibrary(): Promise<RescanResponse> {
    const response = await this.fetchApi<RescanResponse>('/rescan', {
      method: 'POST',
    })

    // Clear cache after rescan to force refresh
    try {
      await this.clearCache()
    } catch (error) {
      console.warn('Failed to clear cache after rescan:', error)
    }

    return response
  }

  // Get audio stream URL for a track
  getAudioStreamUrl(trackId: number): string {
    return `${this.baseUrl}/tracks/${trackId}/play`
  }

  // Get album art URL for a track
  getAlbumArtUrl(trackId: number): string {
    return `${this.baseUrl}/tracks/${trackId}/albumart`
  }

  // Last.fm Integration

  // Get Last.fm authentication URL
  async getLastfmAuthUrl(): Promise<LastfmAuthResponse> {
    return this.fetchApi<LastfmAuthResponse>('/lastfm/auth')
  }

  // Create Last.fm session with token
  async createLastfmSession(request: LastfmSessionRequest): Promise<LastfmSessionResponse> {
    return this.fetchApi<LastfmSessionResponse>('/lastfm/session', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Scrobble a track to Last.fm
  async scrobbleTrack(trackId: number, request: ScrobbleRequest): Promise<ScrobbleResponse> {
    return this.fetchApi<ScrobbleResponse>(`/tracks/${trackId}/scrobble`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Update "now playing" status on Last.fm
  async updateNowPlaying(trackId: number, request: NowPlayingRequest): Promise<NowPlayingResponse> {
    return this.fetchApi<NowPlayingResponse>(`/tracks/${trackId}/now-playing`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
