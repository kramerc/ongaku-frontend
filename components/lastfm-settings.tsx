"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ExternalLink,
  User,
  Music,
  Loader2,
  AlertCircle,
  CheckCircle,
  LogOut
} from 'lucide-react'
import { useLastfm } from '@/contexts/lastfm-context'

export function LastfmSettings() {
  const {
    isAuthenticated,
    username,
    scrobblingEnabled,
    isLoading,
    error,
    getAuthUrl,
    authenticateWithToken,
    checkAuthStatus,
    logout,
    setScrobblingEnabled,
    clearError,
  } = useLastfm()

  const [authToken, setAuthToken] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authPopup, setAuthPopup] = useState<Window | null>(null)

  // Clear error when component unmounts or auth state changes
  useEffect(() => {
    return () => clearError()
  }, [clearError])

  // Monitor popup for completion and check for authentication
  useEffect(() => {
    if (!authPopup) return

    const checkPopup = async () => {
      try {
        if (authPopup.closed) {
          setIsAuthenticating(false)
          setAuthPopup(null)

          // Poll for authentication status - check if localStorage was updated
          let attempts = 0
          const maxAttempts = 10
          const pollInterval = 1000 // 1 second

          const pollForAuth = async () => {
            attempts++
            try {
              await checkAuthStatus()

              // If we're now authenticated, stop polling
              if (isAuthenticated) {
                return
              }
            } catch (error) {
              console.warn('Failed to check auth status:', error)
            }

            if (attempts < maxAttempts) {
              setTimeout(pollForAuth, pollInterval)
            }
          }

          // Start polling after a short delay
          setTimeout(pollForAuth, 1000)
          return
        }

        // Continue monitoring
        setTimeout(checkPopup, 1000)
      } catch (error) {
        console.warn('Error monitoring popup:', error)
        setIsAuthenticating(false)
        setAuthPopup(null)
      }
    }

    checkPopup()

    return () => {
      if (authPopup && !authPopup.closed) {
        authPopup.close()
      }
    }
  }, [authPopup, checkAuthStatus, isAuthenticated])

  const handleStartAuth = async () => {
    try {
      setIsAuthenticating(true)
      const authUrl = await getAuthUrl()

      const popup = window.open(
        authUrl,
        'lastfm-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes,location=yes'
      )

      if (popup) {
        setAuthPopup(popup)
        popup.focus()
      } else {
        throw new Error('Failed to open popup - please allow popups for this site')
      }
    } catch (error) {
      console.error('Failed to start Last.fm authentication:', error)
      setIsAuthenticating(false)
    }
  }

  const handleCompleteAuth = async (token?: string) => {
    const tokenToUse = token || authToken.trim()

    if (!tokenToUse) {
      return
    }

    setIsAuthenticating(true)
    try {
      await authenticateWithToken(tokenToUse)
      setAuthToken('')
    } catch (error) {
      console.error('Failed to complete Last.fm authentication:', error)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = () => {
    logout()
    setAuthToken('')
  }

  if (isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Last.fm Integration
          </CardTitle>
          <CardDescription>
            Connected to Last.fm for automatic scrobbling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{username}</div>
              <div className="text-sm text-muted-foreground">Connected to Last.fm</div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </div>

          {/* Scrobbling Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="scrobbling-enabled" className="text-sm font-medium">
                Enable Scrobbling
              </Label>
              <div className="text-xs text-muted-foreground">
                Automatically scrobble played tracks to Last.fm
              </div>
            </div>
            <Switch
              id="scrobbling-enabled"
              checked={scrobblingEnabled}
              onCheckedChange={setScrobblingEnabled}
            />
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect from Last.fm
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Last.fm Integration
        </CardTitle>
        <CardDescription>
          Connect your Last.fm account to automatically scrobble played tracks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm border rounded-lg bg-destructive/10 border-destructive/20 text-destructive">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Click the button below to authorize with Last.fm. Your authorization will be processed automatically.
          </div>

          <Button
            onClick={handleStartAuth}
            disabled={isLoading || isAuthenticating}
            className="w-full"
          >
            {isLoading || isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isAuthenticating ? 'Waiting for authorization...' : 'Loading...'}
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Authorize with Last.fm
              </>
            )}
          </Button>

          {isAuthenticating && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div>Complete the authorization in the popup window.</div>
              <div>Close the popup when authorization is complete.</div>
            </div>
          )}

          {/* Manual token input as fallback */}
          <details className="group">
            <summary className="text-sm text-muted-foreground cursor-pointer select-none">
              Manual token entry (if popup doesn&apos;t work)
            </summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="auth-token" className="text-sm">
                Authorization Token
              </Label>
              <div className="flex gap-2">
                <Input
                  id="auth-token"
                  type="text"
                  placeholder="Paste your Last.fm token here"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  disabled={isAuthenticating}
                />
                <Button
                  onClick={() => handleCompleteAuth()}
                  disabled={!authToken.trim() || isAuthenticating}
                  size="sm"
                >
                  {isAuthenticating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                After authorization, the token will be in the URL: ?token=YOUR_TOKEN
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}
