"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Disc, Music2, BarChart3 } from "lucide-react"
import { LibraryStats } from "@/lib/types"
import { apiService } from "@/lib/api"

interface LibraryBrowserProps {
  onFilter: (type: string, value: string) => void
  stats: LibraryStats | null
  activeFilters: Record<string, string>
  useCache?: boolean
}

export function LibraryBrowser({ onFilter, stats, activeFilters, useCache = true }: LibraryBrowserProps) {
  const [artists, setArtists] = useState<string[]>([])
  const [albums, setAlbums] = useState<string[]>([])
  const [filteredAlbums, setFilteredAlbums] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [filteredGenres, setFilteredGenres] = useState<string[]>([])
  const [loading, setLoading] = useState({ artists: false, albums: false, genres: false })
  const [activeTab, setActiveTab] = useState<'stats' | 'artists' | 'albums' | 'genres'>('stats')

  const fetchData = async (endpoint: 'artists' | 'albums' | 'genres', setter: (data: string[]) => void, loadingKey: string) => {
    setLoading(prev => ({ ...prev, [loadingKey]: true }))
    try {
      let data: string[]
      if (endpoint === 'artists') {
        data = await apiService.getArtists(useCache)
      } else if (endpoint === 'albums') {
        data = await apiService.getAlbums(useCache)
      } else {
        data = await apiService.getGenres(useCache)
      }
      setter(data)
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error)
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  // Fetch albums for a specific artist
  const fetchAlbumsForArtist = async (artist: string) => {
    setLoading(prev => ({ ...prev, albums: true }))
    try {
      const data = await apiService.getAlbumsForArtist(artist, useCache)
      setFilteredAlbums(data)
    } catch (error) {
      console.error('Error fetching albums for artist:', error)
    } finally {
      setLoading(prev => ({ ...prev, albums: false }))
    }
  }

  // Fetch genres for a specific artist or album
  const fetchGenresForFilter = async (filters: Record<string, string>) => {
    setLoading(prev => ({ ...prev, genres: true }))
    try {
      const tracks = await apiService.getTracks({ ...filters, per_page: 1000 })
      const genreSet = new Set<string>()
      tracks.tracks.forEach(track => {
        if (track.genre && track.genre.trim()) {
          genreSet.add(track.genre)
        }
      })
      setFilteredGenres(Array.from(genreSet).sort())
    } catch (error) {
      console.error('Error fetching genres for filter:', error)
    } finally {
      setLoading(prev => ({ ...prev, genres: false }))
    }
  }

  useEffect(() => {
    if (activeTab === 'artists' && artists.length === 0) {
      fetchData('artists', setArtists, 'artists')
    } else if (activeTab === 'albums' && albums.length === 0) {
      fetchData('albums', setAlbums, 'albums')
    } else if (activeTab === 'genres' && genres.length === 0) {
      fetchData('genres', setGenres, 'genres')
    }
  }, [activeTab, artists.length, albums.length, genres.length, useCache])

  // Refresh data when cache mode changes
  useEffect(() => {
    if (activeTab === 'artists' && artists.length > 0) {
      fetchData('artists', setArtists, 'artists')
    } else if (activeTab === 'albums' && albums.length > 0) {
      fetchData('albums', setAlbums, 'albums')
    } else if (activeTab === 'genres' && genres.length > 0) {
      fetchData('genres', setGenres, 'genres')
    }
  }, [useCache])

  // Update filtered albums when artist filter changes
  useEffect(() => {
    if (activeFilters.artist) {
      fetchAlbumsForArtist(activeFilters.artist)
    } else {
      // Reset to show all albums when no artist is selected
      setFilteredAlbums([])
    }
  }, [activeFilters.artist])

  // Update filtered genres when artist or album filter changes
  useEffect(() => {
    if (activeFilters.artist || activeFilters.album) {
      const filters: Record<string, string> = {}
      if (activeFilters.artist) filters.artist = activeFilters.artist
      if (activeFilters.album) filters.album = activeFilters.album
      fetchGenresForFilter(filters)
    } else {
      // Reset to show all genres when no filters are selected
      setFilteredGenres([])
    }
  }, [activeFilters.artist, activeFilters.album])

  const formatDuration = (seconds: number) => {
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
    <div className="w-80 border-r bg-muted/30 p-4 flex flex-col">
      <div className="flex flex-col gap-2 mb-4">
        <Button
          variant={activeTab === 'stats' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('stats')}
          className="justify-start"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Statistics
        </Button>
        <Button
          variant={activeTab === 'artists' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('artists')}
          className="justify-start"
        >
          <Users className="w-4 h-4 mr-2" />
          Artists ({stats?.unique_artists || 0})
        </Button>
        <Button
          variant={activeTab === 'albums' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('albums')}
          className="justify-start"
        >
          <Disc className="w-4 h-4 mr-2" />
          Albums ({activeFilters.artist ? filteredAlbums.length : stats?.unique_albums || 0})
        </Button>
        <Button
          variant={activeTab === 'genres' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('genres')}
          className="justify-start"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Genres ({(activeFilters.artist || activeFilters.album) ? filteredGenres.length : stats?.unique_genres || 0})
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Library Overview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tracks:</span>
                  <span className="font-mono">{stats.total_tracks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-mono">{formatDuration(stats.total_duration_seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Artists:</span>
                  <span className="font-mono">{stats.unique_artists.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Albums:</span>
                  <span className="font-mono">{stats.unique_albums.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Genres:</span>
                  <span className="font-mono">{stats.unique_genres.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'artists' && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Artists</h3>
            {loading.artists ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="space-y-1">
                {artists.map((artist) => (
                  <Button
                    key={artist}
                    variant={activeFilters.artist === artist ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => onFilter('artist', artist)}
                  >
                    <div className="truncate">{artist}</div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'albums' && (
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Albums
              {activeFilters.artist && (
                <span className="text-xs text-muted-foreground ml-2">
                  for {activeFilters.artist}
                </span>
              )}
            </h3>
            {loading.albums ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="space-y-1">
                {(activeFilters.artist ? filteredAlbums : albums).map((album) => (
                  <Button
                    key={album}
                    variant={activeFilters.album === album ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => onFilter('album', album)}
                  >
                    <div className="truncate">{album}</div>
                  </Button>
                ))}
                {activeFilters.artist && filteredAlbums.length === 0 && !loading.albums && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No albums found for this artist
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'genres' && (
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Genres
              {(activeFilters.artist || activeFilters.album) && (
                <span className="text-xs text-muted-foreground ml-2">
                  for {activeFilters.artist ? activeFilters.artist : ''}
                  {activeFilters.artist && activeFilters.album ? ' - ' : ''}
                  {activeFilters.album ? activeFilters.album : ''}
                </span>
              )}
            </h3>
            {loading.genres ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {((activeFilters.artist || activeFilters.album) ? filteredGenres : genres).map((genre) => (
                  <Badge
                    key={genre}
                    variant={activeFilters.genre === genre ? "default" : "secondary"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onFilter('genre', genre)}
                  >
                    {genre}
                  </Badge>
                ))}
                {(activeFilters.artist || activeFilters.album) && filteredGenres.length === 0 && !loading.genres && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No genres found for this selection
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
