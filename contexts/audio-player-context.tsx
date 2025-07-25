"use client"

import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react'
import { Track, AudioPlayerState, AudioPlayerContextType } from '@/lib/types'
import { API_BASE_URL } from '@/lib/types'
import { useScrobbling } from '@/hooks/use-scrobbling'

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
  | { type: 'SET_LIBRARY_TRACKS'; payload: Track[] }
  | { type: 'SET_LIBRARY_INDEX'; payload: number }

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
  libraryTracks: [],
  libraryIndex: -1,
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
    case 'SET_LIBRARY_TRACKS':
      return { ...state, libraryTracks: action.payload }
    case 'SET_LIBRARY_INDEX':
      return { ...state, libraryIndex: action.payload }
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
  const hasUserInteractedRef = useRef(false)
  const playAttemptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const playingIntentRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Last.fm scrobbling integration
  const { onTrackStart, onTimeUpdate, isScrobblingEnabled, username } = useScrobbling()

  // Helper function to retry loading audio after abort
  const retryAudioLoad = useCallback(() => {
    if (!audioRef.current || !state.currentTrack) {
      console.log('No audio context available for retry')
      return
    }

    console.log(`Retrying audio load (attempt ${retryCountRef.current + 1}/${maxRetries})`)

    const audio = audioRef.current
    // Force reload the audio
    audio.load()
  }, [state.currentTrack, maxRetries])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (playAttemptTimeoutRef.current) {
        clearTimeout(playAttemptTimeoutRef.current)
      }
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = state.volume
    audioRef.current.preload = 'metadata'
    audioRef.current.crossOrigin = 'anonymous'

    const audio = audioRef.current

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration })

      // Reset retry counter on successful load
      retryCountRef.current = 0

      console.log('loadedmetadata event fired', {
        duration: audio.duration,
        isPlaying: state.isPlaying,
        playingIntent: playingIntentRef.current,
        paused: audio.paused,
        hasUserInteracted: hasUserInteractedRef.current,
        readyState: audio.readyState
      })

      // If we have a playing intent but audio isn't playing, start playing now
      if (playingIntentRef.current && audio.paused && hasUserInteractedRef.current) {
        console.log('Audio loaded, attempting to play as requested')
        audio.play().then(() => {
          console.log('Successfully resumed playback after loading metadata')
        }).catch(error => {
          console.warn('Failed to auto-play after loading metadata:', error)

          // Handle different types of errors more specifically
          let errorMessage = 'Failed to start playback - please click play'
          if (error.name === 'AbortError' || error.message.includes('aborted')) {
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1
              console.warn(`Audio loading aborted, retrying... (${retryCountRef.current}/${maxRetries})`)
              setTimeout(() => retryAudioLoad(), 1000) // Retry after 1 second
              return // Don't show error message or reset playing intent during retry
            } else {
              errorMessage = 'Audio loading failed after multiple attempts - please try again'
            }
            playingIntentRef.current = false
          } else if (error.name === 'NotAllowedError' || error.message.includes('user didn\'t interact')) {
            errorMessage = 'Click play button to start audio (browser autoplay blocked)'
            playingIntentRef.current = false
          } else {
            playingIntentRef.current = false
          }

          dispatch({ type: 'SET_PLAYING', payload: false })
          dispatch({ type: 'SET_ERROR', payload: errorMessage })
        })
      }
    }

    const handleCanPlay = () => {
      // Audio is ready to play, if we have a play intent and user has interacted, start playing
      console.log('canplay event fired', {
        isPlaying: state.isPlaying,
        playingIntent: playingIntentRef.current,
        paused: audio.paused,
        hasUserInteracted: hasUserInteractedRef.current,
        readyState: audio.readyState
      })

      if (playingIntentRef.current && audio.paused && hasUserInteractedRef.current) {
        console.log('Audio can play, attempting to start playback')

        // Clear any pending play attempts
        if (playAttemptTimeoutRef.current) {
          clearTimeout(playAttemptTimeoutRef.current)
        }

        // Attempt to play immediately since audio is ready
        audio.play().then(() => {
          console.log('Successfully started playback from canplay event')
        }).catch(error => {
          console.warn('Failed to auto-play on canplay:', error)

          // Handle different types of errors more specifically
          let errorMessage = 'Failed to start playback - please try again'
          if (error.name === 'AbortError' || error.message.includes('aborted')) {
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1
              console.warn(`Audio loading aborted during canplay, retrying... (${retryCountRef.current}/${maxRetries})`)
              setTimeout(() => retryAudioLoad(), 1000) // Retry after 1 second
              return // Don't show error message or reset playing intent during retry
            } else {
              errorMessage = 'Audio loading failed after multiple attempts - please try again'
            }
            playingIntentRef.current = false
          } else if (error.name === 'NotAllowedError' || error.message.includes('user didn\'t interact')) {
            errorMessage = 'Click play button to start audio (browser autoplay blocked)'
            playingIntentRef.current = false
          } else {
            playingIntentRef.current = false
          }

          dispatch({ type: 'SET_PLAYING', payload: false })
          dispatch({ type: 'SET_ERROR', payload: errorMessage })
        })
      }
    }

    const handleEnded = () => {
      dispatch({ type: 'SET_PLAYING', payload: false })
      // Don't call next() directly here to avoid dependency issues
      // Instead, handle next track logic inline
      setTimeout(() => {
        if (state.queue.length > 0) {
          // Handle queue tracks
          let nextIndex = -1
          if (state.repeat === 'one') {
            nextIndex = state.currentIndex
          } else if (state.shuffle) {
            // Simple shuffle: pick a random track that's not the current one
            const availableIndices = state.queue
              .map((_, index) => index)
              .filter(index => index !== state.currentIndex)

            if (availableIndices.length === 0) {
              nextIndex = state.repeat === 'all' ? 0 : -1
            } else {
              nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
            }
          } else {
            const nextIdx = state.currentIndex + 1
            if (nextIdx >= state.queue.length) {
              nextIndex = state.repeat === 'all' ? 0 : -1
            } else {
              nextIndex = nextIdx
            }
          }

          if (nextIndex >= 0 && state.queue[nextIndex]) {
            const nextTrack = state.queue[nextIndex]
            dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex })
            dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })
            if (hasUserInteractedRef.current) {
              dispatch({ type: 'SET_PLAYING', payload: true })
            }
          }
        } else if (state.libraryTracks.length > 0) {
          // No queue, use library tracks as fallback
          let nextLibraryIndex = -1

          if (state.currentTrack) {
            // Find current track in library
            const currentLibraryIndex = state.libraryTracks.findIndex(t => t.id === state.currentTrack!.id)
            if (currentLibraryIndex >= 0) {
              nextLibraryIndex = currentLibraryIndex + 1
            } else {
              // Current track not in library, start from library index
              nextLibraryIndex = state.libraryIndex + 1
            }
          } else {
            // No current track, start from beginning or current library index
            nextLibraryIndex = state.libraryIndex >= 0 ? state.libraryIndex + 1 : 0
          }

          // Check if we have a valid next track in library
          if (nextLibraryIndex < state.libraryTracks.length) {
            const nextTrack = state.libraryTracks[nextLibraryIndex]
            dispatch({ type: 'SET_LIBRARY_INDEX', payload: nextLibraryIndex })
            dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })
            if (hasUserInteractedRef.current) {
              dispatch({ type: 'SET_PLAYING', payload: true })
            }
          }
          // If nextLibraryIndex >= libraryTracks.length, we've reached the end
        }
        // If no queue and no library tracks, playback stops naturally
      }, 100)
    }

    const handleError = (e: Event) => {
      if (!state.currentTrack) return;

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
            errorMessage = 'Audio format not supported or source not ready'
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
        readyState: audio.readyState,
        errorCode: error?.code
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

    // Global keyboard shortcuts and user interaction detection
    const handleKeyPress = (e: KeyboardEvent) => {
      // Mark user interaction
      hasUserInteractedRef.current = true

      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (audioRef.current) {
            if (audioRef.current.paused) {
              audioRef.current.play().catch(console.warn)
              dispatch({ type: 'SET_PLAYING', payload: true })
            } else {
              audioRef.current.pause()
              dispatch({ type: 'SET_PLAYING', payload: false })
            }
          }
          break
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault()
            // Trigger next track without calling the function directly
            setTimeout(() => {
              // Use the same logic as next() but inline
              if (state.queue.length > 0) {
                let nextIndex = -1
                if (state.repeat === 'one') {
                  nextIndex = state.currentIndex
                } else if (state.shuffle) {
                  const availableIndices = state.queue
                    .map((_, index) => index)
                    .filter(index => index !== state.currentIndex)

                  if (availableIndices.length === 0) {
                    nextIndex = state.repeat === 'all' ? 0 : -1
                  } else {
                    nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
                  }
                } else {
                  const nextIdx = state.currentIndex + 1
                  if (nextIdx >= state.queue.length) {
                    nextIndex = state.repeat === 'all' ? 0 : -1
                  } else {
                    nextIndex = nextIdx
                  }
                }

                if (nextIndex >= 0 && state.queue[nextIndex]) {
                  const nextTrack = state.queue[nextIndex]
                  dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex })
                  dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })
                  if (state.isPlaying) {
                    dispatch({ type: 'SET_PLAYING', payload: true })
                  }
                }
              } else if (state.libraryTracks.length > 0) {
                // No queue, use library tracks as fallback
                let nextLibraryIndex = -1

                if (state.currentTrack) {
                  // Find current track in library
                  const currentLibraryIndex = state.libraryTracks.findIndex(t => t.id === state.currentTrack!.id)
                  if (currentLibraryIndex >= 0) {
                    nextLibraryIndex = currentLibraryIndex + 1
                  } else {
                    // Current track not in library, start from library index
                    nextLibraryIndex = state.libraryIndex + 1
                  }
                } else {
                  // No current track, start from beginning or current library index
                  nextLibraryIndex = state.libraryIndex >= 0 ? state.libraryIndex + 1 : 0
                }

                // Check if we have a valid next track in library
                if (nextLibraryIndex < state.libraryTracks.length) {
                  const nextTrack = state.libraryTracks[nextLibraryIndex]
                  dispatch({ type: 'SET_LIBRARY_INDEX', payload: nextLibraryIndex })
                  dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })
                  if (state.isPlaying) {
                    playingIntentRef.current = true
                    dispatch({ type: 'SET_PLAYING', payload: true })
                  }
                }
              }
            }, 0)
          }
          break
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault()
            // Trigger previous track
            setTimeout(() => {
              if (audioRef.current && audioRef.current.currentTime > 3) {
                audioRef.current.currentTime = 0
                dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
                return
              }

              if (state.queue.length > 0) {
                let prevIndex = -1
                if (state.repeat === 'one') {
                  prevIndex = state.currentIndex
                } else {
                  const prevIdx = state.currentIndex - 1
                  if (prevIdx < 0) {
                    prevIndex = state.repeat === 'all' ? state.queue.length - 1 : -1
                  } else {
                    prevIndex = prevIdx
                  }
                }

                if (prevIndex >= 0 && state.queue[prevIndex]) {
                  const prevTrack = state.queue[prevIndex]
                  dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex })
                  dispatch({ type: 'SET_CURRENT_TRACK', payload: prevTrack })
                  if (state.isPlaying) {
                    dispatch({ type: 'SET_PLAYING', payload: true })
                  }
                }
              } else if (state.libraryTracks.length > 0) {
                // No queue, use library tracks as fallback
                let prevLibraryIndex = -1

                if (state.currentTrack) {
                  // Find current track in library
                  const currentLibraryIndex = state.libraryTracks.findIndex(t => t.id === state.currentTrack!.id)
                  if (currentLibraryIndex >= 0) {
                    prevLibraryIndex = currentLibraryIndex - 1
                  } else {
                    // Current track not in library, go to previous from library index
                    prevLibraryIndex = state.libraryIndex - 1
                  }
                } else {
                  // No current track, go to previous from current library index
                  prevLibraryIndex = state.libraryIndex - 1
                }

                // Check if we have a valid previous track in library
                if (prevLibraryIndex >= 0) {
                  const prevTrack = state.libraryTracks[prevLibraryIndex]
                  dispatch({ type: 'SET_LIBRARY_INDEX', payload: prevLibraryIndex })
                  dispatch({ type: 'SET_CURRENT_TRACK', payload: prevTrack })
                  if (state.isPlaying) {
                    playingIntentRef.current = true
                    dispatch({ type: 'SET_PLAYING', payload: true })
                  }
                }
              }
            }, 0)
          }
          break
      }
    }

    // Track user interactions to handle autoplay restrictions
    const handleUserInteraction = () => {
      hasUserInteractedRef.current = true
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('abort', handleAbort)
    audio.addEventListener('loadstart', handleLoadStart)
    document.addEventListener('keydown', handleKeyPress)
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('abort', handleAbort)
      audio.removeEventListener('loadstart', handleLoadStart)
      document.removeEventListener('keydown', handleKeyPress)
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
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
        dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })

        // Reset retry counter for new track
        retryCountRef.current = 0

        // Set new source
        audio.src = newSrc

        // Load the new audio source
        if (isMountedRef.current) {
          audio.load()
        }

        // Notify Last.fm about the new track
        if (isScrobblingEnabled) {
          onTrackStart(state.currentTrack)
        }
      }
    } else if (audioRef.current && !state.currentTrack) {
      // Clear source when no track is selected
      const audio = audioRef.current
      audio.pause()
      audio.src = ''
      dispatch({ type: 'SET_PLAYING', payload: false })
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
      dispatch({ type: 'SET_DURATION', payload: 0 })
    }
  }, [state.currentTrack, isScrobblingEnabled, onTrackStart])

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])

  // Handle playing state changes
  useEffect(() => {
    if (audioRef.current && state.currentTrack) {
      const audio = audioRef.current

      if (playingIntentRef.current && audio.paused && hasUserInteractedRef.current) {
        // We want to play but audio is paused - try to play
        console.log('Playing state effect triggered, attempting to play', {
          readyState: audio.readyState,
          src: audio.src,
          currentTrack: state.currentTrack.title,
          playingIntent: playingIntentRef.current
        })

        if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          audio.play().catch(error => {
            console.warn('Failed to start playback in state effect:', error)
            dispatch({ type: 'SET_PLAYING', payload: false })
            playingIntentRef.current = false
            dispatch({ type: 'SET_ERROR', payload: 'Failed to start playback - please try again' })
          })
        } else {
          // Audio not ready yet, wait a bit and try again
          console.log('Audio not ready, will retry when canplay event fires')
        }
      } else if (!playingIntentRef.current && !audio.paused) {
        // We want to pause but audio is playing - pause it
        audio.pause()
      }
    }
  }, [state.isPlaying, state.currentTrack])

  // Start/stop time updates based on playing state
  useEffect(() => {
    if (state.isPlaying && audioRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime
          const duration = audioRef.current.duration

          dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime })

          // Update Last.fm scrobbling status
          if (isScrobblingEnabled && duration > 0) {
            onTimeUpdate(currentTime, duration)
          }
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
  }, [state.isPlaying, isScrobblingEnabled, onTimeUpdate])

  const play = useCallback(async (track?: Track) => {
    console.log('play() called with:', { track: track?.title, currentTrack: state.currentTrack?.title })

    if (track && track.id !== state.currentTrack?.id) {
      // Playing a new track
      console.log('Playing new track:', track.title)
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track })

      // Only add to queue if the queue is not empty (user has explicitly added items)
      // This allows library navigation when queue is empty
      if (state.queue.length > 0) {
        const existingIndex = state.queue.findIndex(t => t.id === track.id)
        if (existingIndex === -1) {
          dispatch({ type: 'ADD_TO_QUEUE', payload: track })
          dispatch({ type: 'SET_CURRENT_INDEX', payload: state.queue.length })
        } else {
          dispatch({ type: 'SET_CURRENT_INDEX', payload: existingIndex })
        }
      } else {
        // Clear queue index when not using queue
        dispatch({ type: 'SET_CURRENT_INDEX', payload: -1 })
      }

      // Update library index if this track is in the library
      const libraryIndex = state.libraryTracks.findIndex(t => t.id === track.id)
      if (libraryIndex >= 0) {
        dispatch({ type: 'SET_LIBRARY_INDEX', payload: libraryIndex })
      }

      // Clear any previous error when playing a new track
      dispatch({ type: 'SET_ERROR', payload: null })

      // Mark user interaction when play is called explicitly
      hasUserInteractedRef.current = true

      // Set playing intent - the actual play will happen when audio is loaded
      console.log('Setting playing state to true for new track')
      playingIntentRef.current = true
      dispatch({ type: 'SET_PLAYING', payload: true })
      return
    }

    console.log('Resuming current track or no track parameter provided')
    if (audioRef.current && isMountedRef.current) {
      const audio = audioRef.current

      // Ensure we have a valid source
      if (!audio.src || audio.src === window.location.href) {
        console.warn('No valid audio source available')
        dispatch({ type: 'SET_ERROR', payload: 'No audio source available' })
        return
      }

      // Check if audio is ready to play
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          // Mark user interaction when play is called explicitly
          hasUserInteractedRef.current = true
          playingIntentRef.current = true

          console.log('Audio ready, attempting to play immediately')
          await audio.play()

          if (isMountedRef.current) {
            console.log('Audio playback started successfully')
            dispatch({ type: 'SET_PLAYING', payload: true })
            dispatch({ type: 'SET_ERROR', payload: null })
          }
        } catch (error: any) {
          if (isMountedRef.current) {
            const errorMessage = error?.message || error?.toString() || 'Unknown playback error'
            const errorDetails = {
              message: errorMessage,
              name: error?.name || 'UnknownError',
              code: error?.code,
              currentTrack: state.currentTrack?.title,
              audioSrc: audio.src,
              readyState: audio.readyState,
              networkState: audio.networkState,
              paused: audio.paused,
              ended: audio.ended,
              duration: audio.duration,
              currentTime: audio.currentTime,
              hasUserInteracted: hasUserInteractedRef.current
            }

            console.error('Failed to play audio:', errorDetails)

            // Set user-friendly error message based on error type
            let userErrorMessage = errorMessage
            if (error?.name === 'AbortError' || errorMessage.includes('aborted')) {
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current += 1
                console.warn(`Audio loading aborted in play function, retrying... (${retryCountRef.current}/${maxRetries})`)
                setTimeout(() => retryAudioLoad(), 1000) // Retry after 1 second
                dispatch({ type: 'SET_PLAYING', payload: false })
                return // Don't show error message or reset playing intent during retry
              } else {
                userErrorMessage = 'Audio loading failed after multiple attempts - please try again'
              }
              playingIntentRef.current = false
            } else if (errorMessage.includes('user didn\'t interact') ||
                errorMessage.includes('NotAllowedError') ||
                errorMessage.includes('play() request was interrupted')) {
              userErrorMessage = 'Autoplay blocked - click play button to start audio'
              playingIntentRef.current = false
            } else if (errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
              userErrorMessage = 'Network error - check your connection'
              playingIntentRef.current = false
            } else if (errorMessage.includes('decode') || errorMessage.includes('MediaError')) {
              userErrorMessage = 'Audio format not supported'
              playingIntentRef.current = false
            } else if (errorMessage.includes('not suitable') || errorMessage.includes('MEDIA_ERR_SRC_NOT_SUPPORTED')) {
              userErrorMessage = 'Audio source not ready - please try again'
              playingIntentRef.current = false
            } else {
              playingIntentRef.current = false
            }

            // Reset playing state and set error
            dispatch({ type: 'SET_PLAYING', payload: false })
            dispatch({ type: 'SET_ERROR', payload: userErrorMessage })
          }
        }
      } else {
        console.warn('Audio not ready to play, waiting for load:', {
          readyState: audio.readyState,
          src: audio.src,
          currentTrack: state.currentTrack
        })

        // Set playing intent - the audio will start playing once it's loaded
        playingIntentRef.current = true
        dispatch({ type: 'SET_PLAYING', payload: true })
      }
    }
  }, [state.currentTrack, state.queue, state.libraryTracks])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      playingIntentRef.current = false
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
      const nextTrack = state.queue[nextIndex]
      dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })

      // Auto-play if we were playing and user has interacted
      if (state.isPlaying && hasUserInteractedRef.current) {
        setTimeout(() => play(nextTrack), 100)
      }
    } else {
      // No next track in queue, try library tracks as fallback
      if (state.libraryTracks.length > 0) {
        let nextLibraryIndex = -1

        if (state.currentTrack) {
          // Find current track in library
          const currentLibraryIndex = state.libraryTracks.findIndex(t => t.id === state.currentTrack!.id)
          if (currentLibraryIndex >= 0) {
            nextLibraryIndex = currentLibraryIndex + 1
          } else {
            // Current track not in library, start from library index
            nextLibraryIndex = state.libraryIndex + 1
          }
        } else {
          // No current track, start from beginning or current library index
          nextLibraryIndex = state.libraryIndex >= 0 ? state.libraryIndex + 1 : 0
        }

        // Check if we have a valid next track in library
        if (nextLibraryIndex < state.libraryTracks.length) {
          const nextTrack = state.libraryTracks[nextLibraryIndex]
          dispatch({ type: 'SET_LIBRARY_INDEX', payload: nextLibraryIndex })
          dispatch({ type: 'SET_CURRENT_TRACK', payload: nextTrack })

          // Set playing intent directly instead of calling play() to avoid conflicts
          if (state.isPlaying && hasUserInteractedRef.current) {
            playingIntentRef.current = true
            dispatch({ type: 'SET_PLAYING', payload: true })
          }
        } else {
          // Reached end of library
          stop()
        }
      } else {
        // No library tracks available
        stop()
      }
    }
  }, [getNextTrackIndex, state.queue, state.isPlaying, state.libraryTracks, state.libraryIndex, state.currentTrack, stop])

  const previous = useCallback(() => {
    // If we're more than 3 seconds into the track, restart current track
    if (state.currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
      }
      return
    }

    const prevIndex = getPreviousTrackIndex()
    if (prevIndex >= 0 && state.queue[prevIndex]) {
      const prevTrack = state.queue[prevIndex]
      dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex })
      dispatch({ type: 'SET_CURRENT_TRACK', payload: prevTrack })

      // Auto-play if we were playing and user has interacted
      if (state.isPlaying && hasUserInteractedRef.current) {
        setTimeout(() => play(prevTrack), 100)
      }
    } else {
      // No previous track in queue, try library tracks as fallback
      if (state.libraryTracks.length > 0) {
        let prevLibraryIndex = -1

        if (state.currentTrack) {
          // Find current track in library
          const currentLibraryIndex = state.libraryTracks.findIndex(t => t.id === state.currentTrack!.id)
          if (currentLibraryIndex >= 0) {
            prevLibraryIndex = currentLibraryIndex - 1
          } else {
            // Current track not in library, go to previous from library index
            prevLibraryIndex = state.libraryIndex - 1
          }
        } else {
          // No current track, go to previous from current library index
          prevLibraryIndex = state.libraryIndex - 1
        }

        // Check if we have a valid previous track in library
        if (prevLibraryIndex >= 0) {
          const prevTrack = state.libraryTracks[prevLibraryIndex]
          dispatch({ type: 'SET_LIBRARY_INDEX', payload: prevLibraryIndex })
          dispatch({ type: 'SET_CURRENT_TRACK', payload: prevTrack })

          // Set playing intent directly instead of calling play() to avoid conflicts
          if (state.isPlaying && hasUserInteractedRef.current) {
            playingIntentRef.current = true
            dispatch({ type: 'SET_PLAYING', payload: true })
          }
        }
        // If prevLibraryIndex < 0, we're at the beginning, do nothing
      }
    }
  }, [state.currentTime, state.isPlaying, getPreviousTrackIndex, state.queue, state.libraryTracks, state.libraryIndex, state.currentTrack])

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
    // Validate track object
    if (!track || !track.id || typeof track.id !== 'number') {
      console.error('Invalid track object passed to addToQueue:', track)
      return
    }

    const existingIndex = state.queue.findIndex(t => t.id === track.id)
    if (existingIndex === -1) {
      dispatch({ type: 'ADD_TO_QUEUE', payload: track })
      console.log('Track added to queue:', {
        id: track.id,
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist'
      })
    } else {
      console.log('Track already in queue:', track.title || 'Unknown Title')
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

  const setLibraryTracks = useCallback((tracks: Track[]) => {
    dispatch({ type: 'SET_LIBRARY_TRACKS', payload: tracks })
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
    setLibraryTracks,
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
