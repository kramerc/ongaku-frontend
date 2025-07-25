"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  List,
  X
} from 'lucide-react'
import { useAudioPlayer } from '@/contexts/audio-player-context'
import { Track } from '@/lib/types'

interface AudioPlayerProps {
  formatDuration: (seconds: number) => string
}

export function AudioPlayer({ formatDuration }: AudioPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    currentIndex,
    repeat,
    shuffle,
    error,
    libraryTracks,
    libraryIndex,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    clearError,
  } = useAudioPlayer()

  const [showQueue, setShowQueue] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Test audio connection
  const testAudioConnection = async () => {
    if (!currentTrack) return

    try {
      const response = await fetch(`http://localhost:4000/api/v1/tracks/${currentTrack.id}/play`, {
        method: 'HEAD'
      })

      if (!response.ok) {
        setConnectionError(`HTTP ${response.status}: ${response.statusText}`)
      } else {
        setConnectionError(null)
        console.log('Audio connection test successful:', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        })
      }
    } catch (error) {
      setConnectionError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Audio connection test failed:', error)
    }
  }

  // Test connection when track changes
  useEffect(() => {
    if (currentTrack) {
      testAudioConnection()
    }
  }, [currentTrack])

  // Format progress as percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    seek(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  if (!currentTrack) {
    return null
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Connection Error Display */}
      {connectionError && (
        <div className="bg-destructive/10 border-b border-destructive/20 p-2">
          <div className="text-sm text-destructive text-center">
            Audio connection error: {connectionError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-xs"
              onClick={testAudioConnection}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Playback Error Display */}
      {error && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-2 dark:bg-yellow-900/20 dark:border-yellow-800/30">
          <div className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-xs"
              onClick={clearError}
            >
              Dismiss
            </Button>
            {error.includes('Autoplay blocked') && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6 text-xs"
                onClick={() => {
                  clearError()
                  play()
                }}
              >
                Play Now
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Queue Overlay */}
      {showQueue && (
        <div className="border-b bg-background p-4 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <List className="w-4 h-4" />
              Queue ({queue.length} tracks)
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearQueue}
                disabled={queue.length === 0}
              >
                Clear All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQueue(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            {queue.map((track, index) => (
              <div
                key={`queue-${track.id}-${index}`}
                className={`flex items-center gap-3 p-2 rounded text-sm hover:bg-muted/50 cursor-pointer ${
                  index === currentIndex ? 'bg-primary/10 border border-primary/20' : ''
                }`}
                onClick={() => playFromQueue(index)}
              >
                <div className="w-6 text-center text-xs text-muted-foreground">
                  {index === currentIndex && isPlaying ? (
                    <Music className="w-3 h-3 text-primary" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{track.title}</div>
                  <div className="text-muted-foreground truncate">{track.artist}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDuration(track.duration_seconds)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue(index)
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Player */}
      <div className="p-4">
        {/* Progress Bar */}
        <div
          className="w-full h-1 bg-secondary rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{currentTrack.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {currentTrack.artist} • {currentTrack.album}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Time Display */}
            <div className="text-xs text-muted-foreground font-mono hidden sm:block">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={previous}
                disabled={
                  // Disable if no queue and no library tracks
                  (queue.length === 0 && libraryTracks.length === 0) ||
                  // Disable if in queue and at beginning with no repeat
                  (queue.length > 0 && currentIndex <= 0 && repeat !== 'all') ||
                  // Disable if no queue but at beginning of library
                  (queue.length === 0 && libraryTracks.length > 0 &&
                   currentTrack && libraryTracks.findIndex(t => t.id === currentTrack.id) <= 0)
                }
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => isPlaying ? pause() : play()}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={next}
                disabled={
                  // Disable if no queue and no library tracks
                  (queue.length === 0 && libraryTracks.length === 0) ||
                  // Disable if in queue and at end with no repeat
                  (queue.length > 0 && currentIndex >= queue.length - 1 && repeat !== 'all') ||
                  // Disable if no queue but at end of library
                  (queue.length === 0 && libraryTracks.length > 0 &&
                   currentTrack && libraryTracks.findIndex(t => t.id === currentTrack.id) >= libraryTracks.length - 1)
                }
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Additional Controls */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className={`w-8 h-8 p-0 ${shuffle ? 'text-primary' : ''}`}
                onClick={toggleShuffle}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`w-8 h-8 p-0 ${repeat !== 'none' ? 'text-primary' : ''}`}
                onClick={toggleRepeat}
                title={`Repeat: ${repeat}`}
              >
                <RepeatIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setShowQueue(!showQueue)}
                title="Queue"
              >
                <List className="w-4 h-4" />
              </Button>

              {/* Volume Control */}
              <div className="hidden md:flex items-center gap-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                >
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
