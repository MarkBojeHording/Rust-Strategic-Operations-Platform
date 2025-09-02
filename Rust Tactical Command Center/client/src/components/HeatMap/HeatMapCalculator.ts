import { Player, Location, HeatMapPoint, HeatMapConfig } from './types'

export class HeatMapCalculator {
  /**
   * Calculate player activity data for each base location
   */
  static calculatePlayerActivity(locations: Location[], players: Player[]): HeatMapPoint[] {
    return locations.map(location => {
      const basePlayerNames = location.players 
        ? location.players.split(",").map(p => p.trim()).filter(p => p)
        : []

      // Calculate different player counts
      const onlineCount = basePlayerNames.filter(playerName => 
        players.some(player => player.playerName === playerName && player.isOnline)
      ).length

      const offlineCount = basePlayerNames.filter(playerName => 
        players.some(player => 
          player.playerName === playerName && 
          !player.isOnline && 
          player.createdAt === undefined
        )
      ).length

      const premiumCount = basePlayerNames.filter(playerName => 
        players.some(player => 
          player.playerName === playerName && 
          player.createdAt !== undefined
        )
      ).length

      const totalPlayerCount = onlineCount + offlineCount + premiumCount

      // Calculate intensity based on activity
      const intensity = this.calculateIntensity(onlineCount, premiumCount, totalPlayerCount)

      return {
        x: location.x,
        y: location.y,
        intensity,
        playerCount: totalPlayerCount,
        onlineCount,
        offlineCount,
        premiumCount
      }
    }).filter(point => point.intensity > 0) // Only include points with activity
  }

  /**
   * Calculate heat map intensity based on player activity
   */
  private static calculateIntensity(
    onlineCount: number, 
    premiumCount: number, 
    totalCount: number
  ): number {
    if (totalCount === 0) return 0

    // Weight different types of activity
    const onlineWeight = 1.0    // Standard online players
    const premiumWeight = 1.5   // Premium players are weighted higher
    const baseWeight = 0.3      // Base presence weight

    const weightedActivity = 
      (onlineCount * onlineWeight) + 
      (premiumCount * premiumWeight) + 
      (totalCount * baseWeight)

    // Normalize to 0-1 range with a reasonable max
    const maxExpectedActivity = 10 // Adjust based on typical base sizes
    return Math.min(weightedActivity / maxExpectedActivity, 1.0)
  }

  /**
   * Generate gradient stops for heat map colors
   */
  static generateColorGradient(colorScheme: 'red' | 'blue' | 'green' | 'orange'): string[] {
    const gradients = {
      red: [
        'rgba(255, 0, 0, 0)',
        'rgba(255, 100, 0, 0.3)',
        'rgba(255, 50, 0, 0.6)', 
        'rgba(255, 0, 0, 0.8)'
      ],
      blue: [
        'rgba(0, 100, 255, 0)',
        'rgba(0, 150, 255, 0.3)',
        'rgba(0, 100, 255, 0.6)',
        'rgba(0, 50, 255, 0.8)'
      ],
      green: [
        'rgba(0, 255, 0, 0)',
        'rgba(50, 255, 0, 0.3)',
        'rgba(0, 255, 50, 0.6)',
        'rgba(0, 200, 0, 0.8)'
      ],
      orange: [
        'rgba(255, 165, 0, 0)',
        'rgba(255, 140, 0, 0.3)',
        'rgba(255, 120, 0, 0.6)',
        'rgba(255, 100, 0, 0.8)'
      ]
    }

    return gradients[colorScheme] || gradients.red
  }

  /**
   * Create radial gradient for a heat point
   */
  static createRadialGradient(
    point: HeatMapPoint, 
    config: HeatMapConfig, 
    mapDimensions: { width: number; height: number }
  ): string {
    const { x, y, intensity } = point
    const { radius, opacity, colorScheme } = config

    // Convert percentage coordinates to pixel coordinates
    const centerX = (x / 100) * mapDimensions.width
    const centerY = (y / 100) * mapDimensions.height

    const colors = this.generateColorGradient(colorScheme)
    const finalOpacity = intensity * opacity

    return `radial-gradient(circle ${radius}px at ${centerX}px ${centerY}px, 
      ${colors[3].replace(/[\d.]+\)$/, `${finalOpacity * 0.8})`)} 0%, 
      ${colors[2].replace(/[\d.]+\)$/, `${finalOpacity * 0.6})`)} 25%, 
      ${colors[1].replace(/[\d.]+\)$/, `${finalOpacity * 0.3})`)} 60%, 
      ${colors[0]} 100%)`
  }
}