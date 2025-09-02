
import { useState, useEffect, useCallback } from 'react'
import { X, Castle, Home, Tent, Shield, Wheat, FileText, Clock, Skull, Rocket, Users } from 'lucide-react'
import type { ExternalPlayer } from '@shared/schema'

const ICON_MAP = {
  'enemy-small': Tent,
  'enemy-medium': Home,
  'enemy-large': Castle,
  'enemy-flank': Shield,
  'enemy-farm': Wheat
}

interface TeamsModalProps {
  isOpen: boolean
  onClose: () => void
  locations: any[]
  players: ExternalPlayer[]
  onOpenBaseModal?: (base: any) => void
}

export function TeamsModal({ isOpen, onClose, locations, players, onOpenBaseModal }: TeamsModalProps) {
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch reports when modal opens
  const fetchReports = useCallback(async () => {
    if (!isOpen) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/reports')
      if (response.ok) {
        const data = await response.json()
        setReports(data || [])
      } else {
        setReports([])
      }
    } catch (error) {
      console.warn('Failed to fetch reports:', error)
      setReports([])
    } finally {
      setIsLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchReports()
      // Set up interval for updates
      const interval = setInterval(fetchReports, 30000)
      return () => clearInterval(interval)
    } else {
      // Clear reports when modal closes
      setReports([])
    }
  }, [isOpen, fetchReports])

  if (!isOpen) return null

  // Filter to only enemy main bases (small, medium, large)
  const enemyMainBases = locations.filter(location => 
    location.type === 'enemy-small' || 
    location.type === 'enemy-medium' || 
    location.type === 'enemy-large'
  )

  const getBaseIcon = (type: string) => {
    const IconComponent = ICON_MAP[type as keyof typeof ICON_MAP] || Tent
    return IconComponent
  }

  const getOnlinePlayerCount = (baseLocation: any) => {
    if (!baseLocation.players) return 0
    const basePlayerNames = baseLocation.players.split(",").map((p: string) => p.trim()).filter((p: string) => p)
    return basePlayerNames.filter((playerName: string) => 
      players.some(player => player.playerName === playerName && player.isOnline)
    ).length
  }

  const getTotalPlayerCount = (baseLocation: any) => {
    if (!baseLocation.players) return 0
    return baseLocation.players.split(",").map((p: string) => p.trim()).filter((p: string) => p).length
  }

  const getReportCount = (baseLocation: any) => {
    return reports.filter((report: any) => 
      report.baseTags && report.baseTags.includes(baseLocation.id)
    ).length
  }

  const getLastActivityTime = (baseLocation: any) => {
    const baseReports = reports.filter((report: any) => 
      report.baseTags && report.baseTags.includes(baseLocation.id)
    )
    if (baseReports.length === 0) return null
    
    const latestReport = baseReports.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
    
    const timeDiff = Date.now() - new Date(latestReport.createdAt).getTime()
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Recent'
  }

  const getThreatLevel = (baseLocation: any) => {
    const onlineCount = getOnlinePlayerCount(baseLocation)
    const totalCount = getTotalPlayerCount(baseLocation)
    
    if (totalCount === 0) return { level: 'Unknown', color: 'text-gray-400' }
    if (onlineCount >= 3) return { level: 'High', color: 'text-red-400' }
    if (onlineCount >= 1) return { level: 'Medium', color: 'text-yellow-400' }
    return { level: 'Low', color: 'text-green-400' }
  }

  const handleBaseClick = (base: any) => {
    if (onOpenBaseModal) {
      onOpenBaseModal(base)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div 
        className="bg-gray-900 border border-orange-600/50 shadow-2xl rounded-lg"
        style={{ width: '1000px', height: '800px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange-600/30">
          <h2 className="text-xl font-bold text-orange-400 font-mono">[ENEMY TEAMS]</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            data-testid="button-close-teams"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 h-full overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500 mt-8">
              Loading teams data...
            </div>
          ) : enemyMainBases.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No enemy main bases found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enemyMainBases.map((base) => {
                const Icon = getBaseIcon(base.type)
                const onlineCount = getOnlinePlayerCount(base)
                const totalCount = getTotalPlayerCount(base)
                const reportCount = getReportCount(base)
                const lastActivity = getLastActivityTime(base)
                const threatLevel = getThreatLevel(base)
                
                return (
                  <div
                    key={base.id}
                    className="bg-gray-800 border border-orange-600/30 rounded-lg p-4 hover:border-orange-600/50 transition-colors cursor-pointer"
                    onClick={() => handleBaseClick(base)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="h-6 w-6 text-orange-400" />
                      <div>
                        <h3 className="text-lg font-bold text-orange-400">{base.name}</h3>
                        <p className="text-sm text-gray-400 capitalize">{base.type.replace('enemy-', '').replace('-', ' ')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Players Online:</span>
                        <span className={onlineCount > 0 ? 'text-red-400' : 'text-gray-500'}>
                          {onlineCount}/{totalCount}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Threat Level:</span>
                        <span className={threatLevel.color}>{threatLevel.level}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reports:</span>
                        <span className="text-blue-400">{reportCount}</span>
                      </div>
                      
                      {lastActivity && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Activity:</span>
                          <span className="text-yellow-400">{lastActivity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
