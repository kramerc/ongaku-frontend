import { Track, TrackListResponse } from './types'

// IndexedDB cache for tracks
class TrackCache {
  private dbName = 'ongaku-music-cache'
  private dbVersion = 1
  private storeName = 'tracks'
  private db: IDBDatabase | null = null

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create tracks store with track ID as key
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })

          // Create indexes for efficient filtering
          store.createIndex('artist', 'artist', { unique: false })
          store.createIndex('album', 'album', { unique: false })
          store.createIndex('genre', 'genre', { unique: false })
          store.createIndex('album_artist', 'album_artist', { unique: false })
          store.createIndex('title', 'title', { unique: false })
          store.createIndex('year', 'year', { unique: false })
        }
      }
    })
  }

  // Store tracks in cache
  async storeTracks(tracks: Track[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to store tracks'))

      // Store each track
      tracks.forEach(track => {
        store.put(track)
      })
    })
  }

  // Get all tracks from cache
  async getAllTracks(): Promise<Track[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to get tracks from cache'))
      }
    })
  }

  // Get tracks by filter (optimized for performance)
  async getTracksByFilter(filters: Record<string, string>): Promise<Track[]> {
    if (!this.db) await this.init()

    // For exact matches, try to use indexes first
    const filterEntries = Object.entries(filters)
    if (filterEntries.length === 1) {
      const [key, value] = filterEntries[0]

      // Use index if available for exact matches
      if (['artist', 'album', 'genre', 'album_artist'].includes(key)) {
        try {
          return await this.getTracksByIndex(key as keyof Track, value)
        } catch (error) {
          console.warn(`Index lookup failed for ${key}, falling back to full scan:`, error)
        }
      }
    }

    // Fall back to full scan for complex filters or when index lookup fails
    const allTracks = await this.getAllTracks()
    return allTracks.filter(track => {
      return Object.entries(filters).every(([key, value]) => {
        const trackValue = track[key as keyof Track]
        if (typeof trackValue === 'string') {
          return trackValue.toLowerCase().includes(value.toLowerCase())
        }
        return String(trackValue) === value
      })
    })
  }

  // Get tracks using an index (for better performance)
  private async getTracksByIndex(field: keyof Track, value: string): Promise<Track[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index(field as string)
      const request = index.getAll(value)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`Failed to get tracks by ${field} index`))
      }
    })
  }

  // Search tracks by query
  async searchTracks(query: string): Promise<Track[]> {
    const allTracks = await this.getAllTracks()
    const searchTerm = query.toLowerCase()

    return allTracks.filter(track => {
      return (
        track.title.toLowerCase().includes(searchTerm) ||
        track.artist.toLowerCase().includes(searchTerm) ||
        track.album.toLowerCase().includes(searchTerm) ||
        track.genre.toLowerCase().includes(searchTerm) ||
        track.album_artist.toLowerCase().includes(searchTerm)
      )
    })
  }

  // Get track by ID
  async getTrackById(id: number): Promise<Track | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to get track from cache'))
      }
    })
  }

  // Remove tracks by IDs (for when tracks are deleted from library)
  async removeTracks(ids: number[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to remove tracks'))

      ids.forEach(id => {
        store.delete(id)
      })
    })
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear cache'))
    })
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ totalTracks: number; lastUpdated: Date }> {
    const tracks = await this.getAllTracks()
    return {
      totalTracks: tracks.length,
      lastUpdated: new Date() // In a real implementation, you'd store this
    }
  }

  // Check if cache is empty
  async isEmpty(): Promise<boolean> {
    const tracks = await this.getAllTracks()
    return tracks.length === 0
  }

  // Get unique values for filtering
  async getUniqueValues(field: keyof Track): Promise<string[]> {
    const tracks = await this.getAllTracks()
    const values = new Set<string>()

    tracks.forEach(track => {
      const value = track[field]
      if (value && typeof value === 'string' && value.trim()) {
        values.add(value)
      }
    })

    return Array.from(values).sort()
  }

  // Get albums for a specific artist
  async getAlbumsForArtist(artist: string): Promise<string[]> {
    const tracks = await this.getAllTracks()
    const albums = new Set<string>()

    tracks
      .filter(track => track.artist === artist)
      .forEach(track => {
        if (track.album && track.album.trim()) {
          albums.add(track.album)
        }
      })

    return Array.from(albums).sort()
  }

  // Sync with server: fetch all tracks and update cache
  async syncWithServer(fetchAllTracksFromServer: () => Promise<Track[]>): Promise<{ added: number; updated: number; removed: number }> {
    const serverTracks = await fetchAllTracksFromServer()
    const cachedTracks = await this.getAllTracks()

    // Create maps for efficient comparison
    const serverTrackMap = new Map(serverTracks.map(track => [track.id, track]))
    const cachedTrackMap = new Map(cachedTracks.map(track => [track.id, track]))

    const toAdd: Track[] = []
    const toUpdate: Track[] = []
    const toRemove: number[] = []

    // Find tracks to add or update
    serverTracks.forEach(serverTrack => {
      const cachedTrack = cachedTrackMap.get(serverTrack.id)
      if (!cachedTrack) {
        toAdd.push(serverTrack)
      } else if (cachedTrack.modified !== serverTrack.modified) {
        toUpdate.push(serverTrack)
      }
    })

    // Find tracks to remove (exist in cache but not on server)
    cachedTracks.forEach(cachedTrack => {
      if (!serverTrackMap.has(cachedTrack.id)) {
        toRemove.push(cachedTrack.id)
      }
    })

    // Apply changes
    if (toAdd.length > 0 || toUpdate.length > 0) {
      await this.storeTracks([...toAdd, ...toUpdate])
    }

    if (toRemove.length > 0) {
      await this.removeTracks(toRemove)
    }

    return {
      added: toAdd.length,
      updated: toUpdate.length,
      removed: toRemove.length
    }
  }
}

// Export singleton instance
export const trackCache = new TrackCache()
export default trackCache
