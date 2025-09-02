export interface Player {
  id: number
  playerName: string
  isOnline: boolean
  totalSessions: number
  createdAt?: string
}

export interface Location {
  id: string
  x: number
  y: number
  players?: string
  name: string
  type: string
}

export interface HeatMapPoint {
  x: number
  y: number
  intensity: number
  playerCount: number
  onlineCount: number
  offlineCount: number
  premiumCount: number
}

export interface HeatMapConfig {
  enabled: boolean
  radius: number
  maxIntensity: number
  opacity: number
  colorScheme: 'red' | 'blue' | 'green' | 'orange'
}

export interface HeatMapProps {
  locations: Location[]
  players: Player[]
  config: HeatMapConfig
  mapDimensions: { width: number; height: number }
  onConfigChange?: (config: HeatMapConfig) => void
}