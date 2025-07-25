"use client"

import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react'
import { Track, AudioPlayerState, AudioPlayerContextType } from '@/lib/types'
import { API_BASE_URL } from '@/lib/types'

// Action types for the reducer
type AudioPlayerAction =
  | { type: 'SET_CURRENT_TRACK'; payload: Track | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_QUEUE'; payload: Track[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'ADD_TO_QUEUE'; payload: Track }
  | { type: 'REMOVE_FROM_QUEUE'; payload: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_ERROR'; payload: string | null }

const initialState: AudioPlayerState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,
  repeat: 'none',
  shuffle: false,
  error: null,
}

function audioPlayerReducer(state: AudioPlayerState, action: AudioPlayerAction): AudioPlayerState {
  switch (action.type) {
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.payload }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload }
    case 'SET_VOLUME':
      return { ...state, volume: action.payload }
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_DURATION':
      return { ...state, duration: action.payload }
    case 'SET_QUEUE':
      return { ...state, queue: action.payload }
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload }
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.payload] }
    case 'REMOVE_FROM_QUEUE':
      const newQueue = state.queue.filter((_, index) => index !== action.payload)
      const newIndex = action.payload < state.currentIndex
        ? state.currentIndex - 1
        : action.payload === state.currentIndex
          ? -1
          : state.currentIndex
      return {
        ...state,
        queue: newQueue,
        currentIndex: newIndex,
        currentTrack: newIndex >= 0 ? newQueue[newIndex] : null
      }
    case 'CLEAR_QUEUE':
      return {
        ...state,
        queue: [],
        currentIndex: -1,
        currentTrack: null,
        isPlaying: false
      }
    case 'TOGGLE_REPEAT':
      const repeatOrder = ['none', 'one', 'all'] as const
      const currentRepeatIndex = repeatOrder.indexOf(state.repeat)
      const nextRepeat = repeatOrder[(currentRepeatIndex + 1) % repeatOrder.length]
      return { ...state, repeat: nextRepeat }
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    default:
      return state
  }
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(audioPlayerReducer, initialState)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = state.volume

    const audio = audioRef.current

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration })
    }

    const handleEnded = () => {
      dispatch({ type: 'SET_PLAYING', payload: false })
      next()
    }

    const handleError = (e: Event) => {
      const audio = e.target as HTMLAudioElement
      const error = audio.error

      let errorMessage = 'Unknown audio error'
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading audio'
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error'
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported'
            break
          default:
            errorMessage = `Audio error (code: ${error.code})`
        }
      }

      console.error('Audio playback error:', {
        message: errorMessage,
        error,
        currentTrack: state.currentTrack,
        audioSrc: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState
      })

      dispatch({ type: 'SET_PLAYING', payload: false })
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }

    const handleAbort = (e: Event) => {
      console.warn('Audio loading was aborted:', {
        currentTrack: state.currentTrack,
        audioSrc: (e.target as HTMLAudioElement).src
      })
    }

    const handleLoadStart = (e: Event) => {
      console.log('Audio loading started:', {
        currentTrack: state.currentTrack,
        audioSrc: (e.target as HTMLAudioElement).src
      })
    }

    // Global keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (state.isPlaying) {
            pause()
          } else {
            play()
          }
          break
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault()
            next()
          }
          break
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault()
            previous()
          }
          break
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('abort', handleAbort)
    audio.addEventListener('loadstart', handleLoadStart)
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('abort', handleAbort)
      audio.removeEventListener('loadstart', handleLoadStart)
      document.removeEventListener('keydown', handleKeyPress)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Update audio source when current track changes
  useEffect(() => {
    if (!isMountedRef.current) return

    if (audioRef.current && state.currentTrack) {
      const audio = audioRef.current
      const newSrc = `${API_BASE_URL}/tracks/${state.currentTrack.id}/play`

      // Only update if the source actually changed
      if (audio.src !== newSrc) {
        console.log('Loading new track:', {
          track: state.currentTrack.title,
          artist: state.currentTrack.artist,
          id: state.currentTrack.id,
          url: newSrc
        })

        // Pause current playback and reset
        audio.pause()
        audio.currentTime = 0

        // Set new source and load
        audio.src = newSrc

        // Only load if component is still mounted
        if (isMountedRef.current) {
          audio.load()
        }
      }
    } else if (audioRef.current && !state.currentTrack) {
      // Clear source when no track is selected
      const audio = audioRef.current
      audio.pause()
      audio.src = ''
    }
  }, [state.currentTrack])

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])

  // Start/stop time updates based on playing state
  useEffect(() => {
    if (state.isPlaying && audioRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          dispatch({ type: 'SET_CURRENT_TIME', payload: audioRef.current.currentTime })
        }
      }, 100)
    } else {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
    }
  }, [state.isPlaying])

  const play = useCallback((track?: Track) => {
    if (track && track.id !== state.currentTrack?.id) {
      // Playing a new track
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track })

      // Add to queue if not already there
      const existingIndex = state.queue.findIndex(t => t.id === track.id)
      if (existingIndex === -1) {
        dispatch({ type: 'ADD_TO_QUEUE', payload: track })
        dispatch({ type: 'SET_CURRENT_INDEX', payload: state.queue.length })
      } else {
        dispatch({ type: 'SET_CURRENT_INDEX', payload: existingIndex })
      }
    }

    if (audioRef.current && isMountedRef.current) {
      const audio = audioRef.current

      // Check if audio is ready to play
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || audio.src) {
        audio.play().then(() => {
          if (isMountedRef.current) {
            console.log('Audio playback started successfully')
            dispatch({ type: 'SET_PLAYING', payload: true })
          }
        }).catch(error => {
          if (isMountedRef.current) {
            console.error('Failed to play audio:', {
              error: error.message,
              name: error.name,
              currentTrack: state.currentTrack,
              audioSrc: audio.src,
              readyState: audio.readyState,
              networkState: audio.networkState
            })

            // Reset playing state on error
            dispatch({ type: 'SET_PLAYING', payload: false })
          }
        })
      } else {
        console.warn('Audio not ready to play:', {
          readyState: audio.readyState,
          src: audio.src,
          currentTrack: state.currentTrack
        })
      }
    }
  }, [state.currentTrack, state.queue])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      dispatch({ type: 'SET_PLAYING', payload: false })
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      dispatch({ type: 'SET_PLAYING', payload: false })
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
    }
  }, [])

  const getNextTrackIndex = useCallback(() => {
    if (state.queue.length === 0) return -1

    if (state.repeat === 'one') {
      return state.currentIndex
    }

    if (state.shuffle) {
      // Simple shuffle: pick a random track that's not the current one
      const availableIndices = state.queue
        .map((_, index) => index)
        .filter(index => index !== state.currentIndex)

      if (availableIndices.length === 0) {
        return state.repeat === 'all' ? 0 : -1
      }

      return availableIndices[Math.floor(Math.random() * availableIndices.length)]
    }

    const nextIndex = state.currentIndex + 1
    if (nextIndex >= state.queue.length) {
      return state.repeat === 'all' ? 0 : -1
    }

    return nextIndex
  }, [state.currentIndex, state.queue.length, state.repeat, state.shuffle])

  const getPreviousTrackIndex = useCallback(() => {
    if (state.queue.length === 0) return -1

    if (state.repeat === 'one') {
      return state.currentIndex
    }

    const prevIndex = state.currentIndex - 1
    if (prevIndex < 0) {
      return state.repeat === 'all' ? state.queue.length - 1 : -1
    }

    return prevIndex
  }, [state.currentIndex, state.queue.length, state.repeat])

  const next = useCallback(() => {
    const nextIndex = getNextTrackIndex()
    if (nextIndex >= 0 && state.queue[nextIndex]) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: state.queue[nextIndex] })

      // Auto-play if we were playing
      if (state.isPlaying) {
        setTimeout(() => play(), 100)
      }
    } else {
      // No next track
      stop()
    }
  }, [getNextTrackIndex, state.queue, state.isPlaying, play, stop])

  const previous = useCallback(() => {
    // If we're more than 3 seconds into the track, restart current track
    if (state.currentTime > 3) {
      seek(0)
      return
    }

    const prevIndex = getPreviousTrackIndex()
    if (prevIndex >= 0 && state.queue[prevIndex]) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: state.queue[prevIndex] })

      // Auto-play if we were playing
      if (state.isPlaying) {
        setTimeout(() => play(), 100)
      }
    }
  }, [state.currentTime, state.isPlaying, getPreviousTrackIndex, state.queue, play])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      dispatch({ type: 'SET_CURRENT_TIME', payload: time })
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    dispatch({ type: 'SET_VOLUME', payload: clampedVolume })
  }, [])

  const addToQueue = useCallback((track: Track) => {
    const existingIndex = state.queue.findIndex(t => t.id === track.id)
    if (existingIndex === -1) {
      dispatch({ type: 'ADD_TO_QUEUE', payload: track })
    }
  }, [state.queue])

  const addAllToQueue = useCallback((tracks: Track[], startIndex = 0) => {
    // Clear current queue and add all tracks
    dispatch({ type: 'SET_QUEUE', payload: tracks })

    // Set current track to the specified index
    if (startIndex < tracks.length) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: startIndex })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: tracks[startIndex] })
    }
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index })
  }, [])

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_QUEUE' })
  }, [])

  const toggleRepeat = useCallback(() => {
    dispatch({ type: 'TOGGLE_REPEAT' })
  }, [])

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHUFFLE' })
  }, [])

  const playFromQueue = useCallback((index: number) => {
    if (index >= 0 && index < state.queue.length) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: index })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: state.queue[index] })
      play()
    }
  }, [state.queue, play])

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  const contextValue: AudioPlayerContextType = {
    ...state,
    play,
    pause,
    stop,
    next,
    previous,
    seek,
    setVolume,
    addToQueue,
    addAllToQueue,
    removeFromQueue,
    clearQueue,
    toggleRepeat,
    toggleShuffle,
    playFromQueue,
    clearError,
  }

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}
