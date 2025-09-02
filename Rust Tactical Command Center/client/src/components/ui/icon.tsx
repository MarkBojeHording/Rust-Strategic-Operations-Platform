import React from 'react'
import { getKitIconData } from '@/lib/icons'

interface IconProps {
  emoji: string
  png?: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  preferPng?: boolean
}

const sizeClasses = {
  xs: 'w-3 h-3 text-xs',
  sm: 'w-4 h-4 text-sm',
  md: 'w-5 h-5 text-base',
  lg: 'w-6 h-6 text-lg',
  xl: 'w-8 h-8 text-xl'
}

/**
 * Flexible icon component that can render either PNG images or emoji fallbacks
 * Automatically chooses the best display method based on availability
 */
export function Icon({ 
  emoji, 
  png, 
  alt, 
  size = 'md', 
  className = '', 
  preferPng = true 
}: IconProps) {
  const sizeClass = sizeClasses[size]
  
  // Use PNG if available and preferred, otherwise fall back to emoji
  if (png && preferPng) {
    return (
      <img 
        src={png} 
        alt={alt}
        className={`${sizeClass} ${className} object-contain`}
        title={alt}
      />
    )
  }
  
  // Fallback to emoji
  return (
    <span 
      className={`${sizeClass} ${className} inline-block text-center leading-none`}
      title={alt}
      role="img"
      aria-label={alt}
    >
      {emoji}
    </span>
  )
}

// Specialized kit icon component
interface KitIconProps {
  kitType: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  preferPng?: boolean
}

export function KitIcon({ kitType, size = 'md', className = '', preferPng = true }: KitIconProps) {
  const iconData = getKitIconData(kitType)
  
  return (
    <Icon
      emoji={iconData.emoji}
      png={iconData.png}
      alt={iconData.alt}
      size={size}
      className={className}
      preferPng={preferPng}
    />
  )
}

