"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { LastfmSettings, LastfmAuthResponse, LastfmSessionResponse } from '@/lib/types'
import { apiService } from '@/lib/api'

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

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(LASTFM_STORAGE_KEY)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as LastfmSettings
        setSettings(parsed)
      }
    } catch (error) {
      console.warn('Failed to load Last.fm settings from localStorage:', error)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LASTFM_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to save Last.fm settings to localStorage:', error)
    }
  }, [settings])

  const getAuthUrl = useCallback(async (): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const response: LastfmAuthResponse = await apiService.getLastfmAuthUrl()
      return response.auth_url
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get Last.fm auth URL'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const authenticateWithToken = useCallback(async (token: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response: LastfmSessionResponse = await apiService.createLastfmSession({ token })

      setSettings(prev => ({
        ...prev,
        sessionKey: response.session_key,
        username: response.username,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Last.fm'
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
