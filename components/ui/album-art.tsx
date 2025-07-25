"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Music } from 'lucide-react'
import { Track } from '@/lib/types'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AlbumArtProps {
  track: Track
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showFallback?: boolean
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
}

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

export function AlbumArt({
  track,
  size = 'md',
  className,
  showFallback = true
}: AlbumArtProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  // Check if track has album art
  const hasAlbumArt = track.album_art_path && track.album_art_mime_type && !imageError

  if (!hasAlbumArt && !showFallback) {
    return null
  }

  return (
    <div className={cn(
      'relative rounded overflow-hidden bg-muted flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      {hasAlbumArt && (
        <>
          <Image
            src={apiService.getAlbumArtUrl(track.id)}
            alt={`${track.album} by ${track.artist}`}
            width={200}
            height={200}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-200',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            unoptimized
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse">
                <Music className={cn('text-muted-foreground', iconSizes[size])} />
              </div>
            </div>
          )}
        </>
      )}

      {(!hasAlbumArt || imageError) && showFallback && (
        <Music className={cn('text-muted-foreground', iconSizes[size])} />
      )}
    </div>
  )
}
