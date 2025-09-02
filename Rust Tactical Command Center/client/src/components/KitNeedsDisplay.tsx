import React from 'react'
import { getActiveKits } from '@/lib/icons'

interface KitNeedsDisplayProps {
  kitResources: any
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

/**
 * Dynamic display component that shows PNG icons with quantities for active kit requests
 * Only renders icons for kit types that have numbers entered
 * Designed as an "invisible container" that provides quick visual reference
 */
export function KitNeedsDisplay({ kitResources, size = 'xs', className = '' }: KitNeedsDisplayProps) {
  const activeKits = getActiveKits(kitResources)
  
  if (activeKits.length === 0) return null
  
  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2', 
    md: 'w-2.5 h-2.5'
  }
  
  const textSizeClasses = {
    xs: 'text-[5px]',
    sm: 'text-[6px]',
    md: 'text-xs'
  }
  
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`}>
      {activeKits.map(({ kitType, amount, iconData }) => (
        <div key={kitType} className="flex items-center -space-x-0.5 flex-shrink-0">
          {iconData.png ? (
            <img 
              src={iconData.png} 
              alt={iconData.alt}
              className={`${sizeClasses[size]} object-contain ${
                kitType === 'fullkit' ? '-translate-x-0.5' : kitType === 'meds' ? '-translate-x-px' : ''
              }`}
            />
          ) : (
            <span className={`${textSizeClasses[size]}`}>{iconData.emoji}</span>
          )}
          <span className={`${textSizeClasses[size]} font-medium text-white leading-none`}>
            {amount}
          </span>
        </div>
      ))}
    </div>
  )
}

export default KitNeedsDisplay