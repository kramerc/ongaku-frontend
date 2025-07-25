"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLastfm } from '@/contexts/lastfm-context'

export default function LastfmCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authenticateWithToken } = useLastfm()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔄 Callback page loaded')
    console.log('🔍 Current URL:', window.location.href)
    console.log('🪟 Has opener?', !!window.opener)

    const token = searchParams.get('token')
    console.log('🎫 Token from URL:', token)

    // If this is in a popup, send the token to the parent and close
    if (window.opener) {
      console.log('📤 This is a popup, sending postMessage to parent...')

      const message = {
        type: 'lastfm-token',
        token: token
      }

      console.log('📨 Sending message:', message)
      console.log('🎯 Target origin:', window.location.origin)

      window.opener.postMessage(message, window.location.origin)
      console.log('✅ Message sent successfully')

      // Close the popup after a short delay
      console.log('⏰ Scheduling popup close in 1 second...')
      setTimeout(() => {
        console.log('🚪 Closing popup now')
        window.close()
      }, 1000)

      if (token) {
        console.log('✅ Setting status to success')
        setStatus('success')
      } else {
        console.log('❌ No token found, setting error status')
        setStatus('error')
        setErrorMessage('No authentication token received from Last.fm')
      }
      return
    }

    console.log('🖥️ Not in popup, handling authentication directly...')

    // If not in a popup, handle authentication normally
    if (!token) {
      console.log('❌ No token found in URL')
      setStatus('error')
      setErrorMessage('No authentication token received from Last.fm')
      return
    }

    const handleAuthentication = async () => {
      try {
        console.log('🔐 Starting direct authentication with token:', token)
        await authenticateWithToken(token)
        console.log('🎉 Direct authentication successful')
        setStatus('success')

        // Redirect back to the main app after a short delay
        setTimeout(() => {
          console.log('🔄 Redirecting to home page...')
          router.push('/')
        }, 2000)
      } catch (error) {
        console.error('❌ Direct authentication failed:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed')
      }
    }

    handleAuthentication()
  }, [searchParams, authenticateWithToken, router])

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Authenticating with Last.fm</h2>
          <p className="text-gray-600">Please wait while we complete your authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Authentication Successful!</h2>
          <p className="text-gray-600 mb-4">You have been successfully authenticated with Last.fm.</p>
          <p className="text-sm text-gray-500">Redirecting you back to the app...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">✗</div>
          <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Return to App
          </button>
        </div>
      </div>
    )
  }

  return null
}
