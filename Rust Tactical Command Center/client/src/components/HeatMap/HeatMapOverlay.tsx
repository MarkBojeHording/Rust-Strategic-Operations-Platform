import React, { useMemo } from 'react'
import { HeatMapProps } from './types'
import { HeatMapCalculator } from './HeatMapCalculator'

export const HeatMapOverlay: React.FC<HeatMapProps> = ({
  locations,
  players,
  config,
  mapDimensions,
  onConfigChange
}) => {
  // Calculate heat map points based on player activity
  const heatPoints = useMemo(() => {
    if (!config.enabled) return []
    return HeatMapCalculator.calculatePlayerActivity(locations, players)
  }, [locations, players, config.enabled])

  // Generate the heat map overlay styles
  const overlayStyles = useMemo(() => {
    if (!config.enabled || heatPoints.length === 0) return {}

    const gradients = heatPoints.map(point => 
      HeatMapCalculator.createRadialGradient(point, config, mapDimensions)
    )

    return {
      background: gradients.join(', '),
      opacity: config.opacity,
      pointerEvents: 'none' as const,
      mixBlendMode: 'multiply' as const
    }
  }, [heatPoints, config, mapDimensions])

  if (!config.enabled) return null

  return (
    <div 
      className="absolute inset-0 z-10"
      style={overlayStyles}
      data-testid="heatmap-overlay"
    />
  )
}

export default HeatMapOverlay