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

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      console.log('🔥 Received postMessage:', {
        origin: event.origin,
        source: event.source === authPopup ? 'our popup' : 'unknown source',
        data: event.data
      })

      // Make sure the message is from our popup
      if (event.source !== authPopup) {
        console.warn('❌ Message not from our popup, ignoring')
        return
      }

      if (event.data.type === 'lastfm-token') {
        const token = event.data.token
        console.log('✅ Token received from popup:', token)

        // Close the popup and authenticate
        console.log('🔒 Closing popup and starting authentication...')
        authPopup.close()
        setAuthPopup(null)

        if (token) {
          authenticateWithToken(token)
            .then(() => {
              console.log('🎉 Authentication successful!')
              setIsAuthenticating(false)
            })
            .catch((error) => {
              console.error('❌ Failed to authenticate with token:', error)
              setIsAuthenticating(false)
            })
        } else {
          console.warn('⚠️ No token received in message')
          setIsAuthenticating(false)
        }
      } else {
        console.log('ℹ️ Unknown message type:', event.data.type)
      }
    }

    window.addEventListener('message', handleMessage)
    console.log('👂 Started listening for postMessages from popup')

    // Also monitor if popup is closed manually
    const checkClosed = () => {
      if (authPopup.closed) {
        console.log('🚪 Popup was closed manually')
        setIsAuthenticating(false)
        setAuthPopup(null)
        window.removeEventListener('message', handleMessage)
        return
      }
      setTimeout(checkClosed, 1000)
    }

    checkClosed()

    return () => {
      console.log('🧹 Cleaning up popup monitoring')
      window.removeEventListener('message', handleMessage)
      if (authPopup && !authPopup.closed) {
        console.log('🚪 Closing popup during cleanup')
        authPopup.close()
      }
    }
  }, [authPopup, authenticateWithToken])

  const handleStartAuth = async () => {
    try {
      console.log('🚀 Starting Last.fm authentication...')
      setIsAuthenticating(true)
      const authUrl = await getAuthUrl()
      console.log('🔗 Generated auth URL:', authUrl)

      const popup = window.open(
        authUrl,
        'lastfm-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes,location=yes'
      )

      if (popup) {
        console.log('✅ Popup opened successfully')
        console.log('👂 Setting up message listener...')
        setAuthPopup(popup)
        popup.focus()
      } else {
        console.error('❌ Failed to open popup')
        throw new Error('Failed to open popup - please allow popups for this site')
      }
    } catch (error) {
      console.error('💥 Failed to start Last.fm authentication:', error)
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
              <div>The popup will automatically send the token back.</div>
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <strong>🔍 Debug:</strong> Check your browser console (F12) for detailed postMessage logs!
              </div>
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
