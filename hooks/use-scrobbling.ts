"use client"

import { useCallback, useRef, useEffect } from 'react'
import { Track } from '@/lib/types'
import { useLastfm } from '@/contexts/lastfm-context'
import { apiService } from '@/lib/api'

interface ScrobbleState {
  track: Track | null
  startTime: number | null
  hasScrobbled: boolean
  hasUpdatedNowPlaying: boolean
}

export function useScrobbling() {
  const { isAuthenticated, sessionKey, scrobblingEnabled, username } = useLastfm()
  const scrobbleState = useRef<ScrobbleState>({
    track: null,
    startTime: null,
    hasScrobbled: false,
    hasUpdatedNowPlaying: false,
  })

  // Reset scrobble state when track changes
  const onTrackStart = useCallback((track: Track) => {
    if (!isAuthenticated || !scrobblingEnabled || !sessionKey) {
      return
    }

    console.log('Last.fm: Track started', { track: track.title, artist: track.artist })

    scrobbleState.current = {
      track,
      startTime: Date.now(),
      hasScrobbled: false,
      hasUpdatedNowPlaying: false,
    }

    // Update "now playing" status
    apiService.updateNowPlaying(track.id, { session_key: sessionKey })
      .then((response) => {
        if (response.success) {
          console.log('Last.fm: Now playing updated successfully')
          scrobbleState.current.hasUpdatedNowPlaying = true
        } else {
          console.warn('Last.fm: Failed to update now playing:', response.message)
        }
      })
      .catch((error) => {
        console.warn('Last.fm: Error updating now playing:', error)
      })
  }, [isAuthenticated, scrobblingEnabled, sessionKey])

  // Check if track should be scrobbled based on play time
  const checkScrobbleConditions = useCallback((currentTime: number, duration: number): boolean => {
    const state = scrobbleState.current

    if (!state.track || !state.startTime || state.hasScrobbled) {
      return false
    }

    // Last.fm scrobble conditions:
    // - Track must be longer than 30 seconds
    // - Must have played for at least 50% of the track OR 4 minutes, whichever is less
    if (duration < 30) {
      return false
    }

    const requiredTime = Math.min(duration * 0.5, 240) // 50% or 4 minutes
    return currentTime >= requiredTime
  }, [])

  // Attempt to scrobble the current track
  const scrobbleTrack = useCallback((currentTime: number, duration: number) => {
    const state = scrobbleState.current

    if (!isAuthenticated || !scrobblingEnabled || !sessionKey || !state.track || !state.startTime) {
      return
    }

    if (!checkScrobbleConditions(currentTime, duration)) {
      return
    }

    if (state.hasScrobbled) {
      return // Already scrobbled this track
    }

    console.log('Last.fm: Scrobbling track', {
      track: state.track.title,
      artist: state.track.artist,
      currentTime,
      duration,
      username
    })

    const timestamp = Math.floor(state.startTime / 1000) // Convert to Unix timestamp

    apiService.scrobbleTrack(state.track.id, {
      session_key: sessionKey,
      timestamp,
      album_artist: state.track.album_artist || undefined,
    })
      .then((response) => {
        if (response.success) {
          console.log('Last.fm: Track scrobbled successfully', { scrobbleId: response.scrobble_id })
          scrobbleState.current.hasScrobbled = true
        } else {
          console.warn('Last.fm: Failed to scrobble track:', response.message)
        }
      })
      .catch((error) => {
        console.warn('Last.fm: Error scrobbling track:', error)
      })
  }, [isAuthenticated, scrobblingEnabled, sessionKey, username, checkScrobbleConditions])

  // Check scrobble conditions on time update
  const onTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (checkScrobbleConditions(currentTime, duration)) {
      scrobbleTrack(currentTime, duration)
    }
  }, [checkScrobbleConditions, scrobbleTrack])

  // Handle track stopping/pausing (for potential future use)
  const onTrackStop = useCallback(() => {
    // Currently no action needed, but could be used for:
    // - Canceling now playing status
    // - Analytics about listening time
    // - Partial scrobbles (if Last.fm supported them)
  }, [])

  return {
    onTrackStart,
    onTimeUpdate,
    onTrackStop,
    isScrobblingEnabled: isAuthenticated && scrobblingEnabled,
    username,
  }
}
