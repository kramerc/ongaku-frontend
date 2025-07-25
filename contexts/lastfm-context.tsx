"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { LastfmSettings } from '@/lib/types'
import { lastFmService } from '@/lib/lastfm-service'

interface LastfmContextType extends LastfmSettings {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  getAuthUrl: () => Promise<string>
  authenticateWithToken: (token: string) => Promise<void>
  checkAuthStatus: () => Promise<void>
  logout: () => void
  setScrobblingEnabled: (enabled: boolean) => void
  clearError: () => void
}

const LastfmContext = createContext<LastfmContextType | null>(null)

const LASTFM_STORAGE_KEY = 'ongaku-lastfm-settings'

export function LastfmProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<LastfmSettings>({
    sessionKey: null,
    username: null,
    scrobblingEnabled: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved settings and initialize service on mount
  useEffect(() => {
    console.log('🔧 LastfmContext: Initializing Last.fm service...')

    // Initialize the Last.fm service
    const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY
    const secret = process.env.NEXT_PUBLIC_LASTFM_SECRET

    if (apiKey && secret) {
      lastFmService.init({
        apiKey,
        secret,
        callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/lastfm/callback` : undefined,
      })
      console.log('🚀 LastfmContext: Service initialized with API credentials')
    } else {
      console.error('❌ LastfmContext: Missing API credentials in environment variables')
    }

    // Load saved settings
    const savedSettings = localStorage.getItem(LASTFM_STORAGE_KEY)
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
        console.log('📁 LastfmContext: Loaded settings from localStorage:', parsed)

        // If we have a session key, set it in the service
        if (parsed.sessionKey) {
          console.log('🔑 LastfmContext: Setting existing session key in service')
          lastFmService.setSessionKey(parsed.sessionKey)
        }
      } catch (error) {
        console.error('❌ LastfmContext: Failed to parse saved settings:', error)
      }
    }

    console.log('✅ LastfmContext: Initialization complete')
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LASTFM_STORAGE_KEY, JSON.stringify(settings))
      console.log('💾 LastfmContext: Saved settings to localStorage:', settings)
    } catch (error) {
      console.warn('Failed to save Last.fm settings to localStorage:', error)
    }
  }, [settings])

  const getAuthUrl = useCallback(async (): Promise<string> => {
    console.log('🔗 LastfmContext: Getting auth URL...')
    setIsLoading(true)
    setError(null)

    try {
      const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/lastfm/callback` : undefined
      const authUrl = lastFmService.getAuthUrl(callbackUrl)
      console.log('✅ LastfmContext: Auth URL generated:', authUrl)
      return authUrl
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get Last.fm auth URL'
      console.error('❌ LastfmContext: Failed to get auth URL:', error)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const authenticateWithToken = useCallback(async (token: string): Promise<void> => {
    console.log('🔐 LastfmContext: Authenticating with token:', token)
    console.log('🔍 LastfmContext: Service initialized?', lastFmService.isAuthenticated !== undefined)
    setIsLoading(true)
    setError(null)

    try {
      const result = await lastFmService.authenticate(token)
      console.log('✅ LastfmContext: Authentication successful:', result)

      setSettings(prev => ({
        ...prev,
        sessionKey: result.sessionKey,
        username: result.username,
      }))
      console.log('💾 LastfmContext: Settings updated with new session')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Last.fm'
      console.error('❌ LastfmContext: Authentication failed:', error)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setSettings({
      sessionKey: null,
      username: null,
      scrobblingEnabled: true,
    })
    setError(null)
  }, [])

  const setScrobblingEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      scrobblingEnabled: enabled,
    }))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    // Check if localStorage has been updated with new session info
    try {
      const savedSettings = localStorage.getItem(LASTFM_STORAGE_KEY)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as LastfmSettings
        if (parsed.sessionKey && parsed.username &&
            (parsed.sessionKey !== settings.sessionKey || parsed.username !== settings.username)) {
          // New session info found - update our state
          setSettings(parsed)
          setError(null)
        }
      }
    } catch (error) {
      console.warn('Failed to check auth status:', error)
    }
  }, [settings.sessionKey, settings.username])

  const value: LastfmContextType = {
    ...settings,
    isAuthenticated: settings.sessionKey !== null,
    isLoading,
    error,
    getAuthUrl,
    authenticateWithToken,
    checkAuthStatus,
    logout,
    setScrobblingEnabled,
    clearError,
  }

  return (
    <LastfmContext.Provider value={value}>
      {children}
    </LastfmContext.Provider>
  )
}

export function useLastfm(): LastfmContextType {
  const context = useContext(LastfmContext)
  if (!context) {
    throw new Error('useLastfm must be used within a LastfmProvider')
  }
  return context
}
