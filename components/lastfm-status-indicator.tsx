"use client"

import { Music } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLastfm } from '@/contexts/lastfm-context'

export function LastfmStatusIndicator() {
  const { isAuthenticated, username, scrobblingEnabled } = useLastfm()

  if (!isAuthenticated || !scrobblingEnabled) {
    return null
  }

  return (
    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
      <Music className="w-3 h-3 mr-1" />
      Scrobbling as {username}
    </Badge>
  )
}
