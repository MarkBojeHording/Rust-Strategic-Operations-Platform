import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { MapPin, Home, Shield, Wheat, Castle, Tent, X, HelpCircle, Calculator, FileText, Image, Edit, Camera, StickyNote, Search, Plus, Minus } from "lucide-react"
import { useQuery, useQueries } from "@tanstack/react-query"
import { apiRequest, queryClient } from '@/lib/queryClient'
import { RocketCalculatorSection } from './RocketCalculator'
import type { ExternalPlayer } from '@shared/schema'

// ============= CONSTANTS =============
const LABELS = {
  "friendly-main": "Main",
  "friendly-flank": "Flank", 
  "friendly-farm": "Farm",
  "friendly-boat": "Boat",
  "friendly-garage": "Garage",
  "enemy-small": "Small",
  "enemy-medium": "Medium",
  "enemy-large": "Large",
  "enemy-flank": "Flank",
  "enemy-tower": "Tower",
  "enemy-farm": "Farm",
  "enemy-decaying": "Decaying",
  "report-pvp": "PvP",
  "report-heli": "Heli",
  "report-bradley": "Bradley"
}

const ICON_MAP = {
  "friendly-main": Home,
  "friendly-flank": Shield,
  "friendly-farm": Wheat,
  "friendly-boat": Castle,
  "friendly-garage": Castle,
  "enemy-small": Tent,
  "enemy-medium": Castle,
  "enemy-large": Shield,
  "enemy-flank": Shield,
  "enemy-tower": Castle,
  "enemy-farm": Wheat,
  "enemy-decaying": Castle,
  "report-pvp": Shield,
  "report-heli": Shield,
  "report-bradley": Shield
}

const getColor = (type: string) => {
  if (type.startsWith("friendly")) return "text-green-400"
  if (type.startsWith("enemy")) return "text-red-400"
  return "text-yellow-400"
}

const getIcon = (type: string) => {
  const Icon = ICON_MAP[type] || MapPin
  return <Icon className="h-3 w-3" />
}

const MATERIAL_ICONS = {
  wood: "🪵",
  stone: "🪨",
  metal: "🔩",
  hqm: "⚙️"
}

const MATERIAL_LABELS = {
  wood: "Wood",
  stone: "Stone",
  metal: "Metal",
  hqm: "HQM"
}

// Grid configuration for coordinate calculation
const GRID_CONFIG = {
  COLS: 32,
  ROWS: 24,
  CELL_WIDTH_PERCENT: 3.125,
  CELL_HEIGHT_PERCENT: 4.167
}

// Generate grid coordinate from x,y position
const getGridCoordinate = (x: number, y: number, existingLocations: any[] = [], excludeId: string | null = null) => {
  const col = Math.floor(x / GRID_CONFIG.CELL_WIDTH_PERCENT)
  const row = Math.floor(y / GRID_CONFIG.CELL_HEIGHT_PERCENT)
  const clampedCol = Math.min(Math.max(col, 0), GRID_CONFIG.COLS - 1)
  const clampedRow = Math.min(Math.max(row, 0), GRID_CONFIG.ROWS - 1)
  const letter = clampedCol < 26 ? String.fromCharCode(65 + clampedCol) : `A${String.fromCharCode(65 + clampedCol - 26)}`
  const number = clampedRow + 1
  const baseCoord = `${letter}${number}`
  
  const duplicates = existingLocations.filter(loc => {
    if (excludeId && loc.id === excludeId) return false
    const locBase = loc.name.split('(')[0]
    return locBase === baseCoord
  })
  
  return duplicates.length === 0 ? baseCoord : `${baseCoord}(${duplicates.length + 1})`
}

// ============= ENEMY BASE HEAT MAP COMPONENT =============
const EnemyBaseHeatMap = ({ players }: { players: string }) => {
  // Parse selected players from comma-separated string
  const selectedPlayersList = useMemo(() => {
    return players ? players.split(',').map(p => p.trim()).filter(p => p) : []
  }, [players])
  
  // Fetch session data for all selected players
  const sessionQueries = useQueries({
    queries: selectedPlayersList.map(playerName => ({
      queryKey: ['/api/players', playerName, 'sessions'],
      enabled: !!playerName
    }))
  })
  
  // Multi-player heat map data generation
  const generateMultiPlayerHeatMapData = (allPlayersData: any[]) => {
    const heatMapData: Record<string, Record<number, number>> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize empty data structure
    days.forEach(day => {
      heatMapData[day] = {}
      for (let hour = 0; hour < 24; hour++) {
        heatMapData[day][hour] = 0
      }
    })
    
    // Process each player's session data for accurate concurrent tracking
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = days[dayIndex]
      
      for (let hour = 0; hour < 24; hour++) {
        let concurrentPlayers = 0
        
        // Count players with active sessions during this specific day/hour
        allPlayersData.forEach(playerSessions => {
          if (!playerSessions || !Array.isArray(playerSessions)) return
          
          // Check if this player has a session active during this specific day/hour
          const hasActiveSession = playerSessions.some(session => {
            const startTime = new Date(session.startTime)
            const endTime = new Date(session.endTime)
            
            // Get the day of week and check if it matches
            const sessionStartDay = startTime.getDay()
            const sessionEndDay = endTime.getDay()
            
            // Check if session spans across the target day and hour
            if (sessionStartDay === dayIndex || sessionEndDay === dayIndex) {
              const sessionStartHour = startTime.getHours()
              const sessionEndHour = endTime.getHours()
              
              // For same day sessions
              if (sessionStartDay === sessionEndDay && sessionStartDay === dayIndex) {
                return hour >= sessionStartHour && hour < sessionEndHour
              }
              
              // For sessions spanning midnight (different days)
              if (sessionStartDay === dayIndex && sessionEndDay !== dayIndex) {
                return hour >= sessionStartHour
              }
              
              if (sessionEndDay === dayIndex && sessionStartDay !== dayIndex) {
                return hour < sessionEndHour
              }
            }
            
            return false
          })
          
          if (hasActiveSession) {
            concurrentPlayers++
          }
        })
        
        heatMapData[dayName][hour] = concurrentPlayers
      }
    }
    
    return heatMapData
  }
  
  // Get heat map color based on concurrent player count
  const getMultiPlayerHeatMapColor = (playerCount: number) => {
    if (playerCount === 0) return { className: 'bg-gray-800', style: {} }
    if (playerCount === 1) return { className: 'bg-blue-900', style: {} }        // Dark blue
    if (playerCount === 2) return { className: 'bg-green-400', style: {} }       // Light green
    if (playerCount === 3) return { className: 'bg-yellow-400', style: {} }      // Yellow
    if (playerCount === 4) return { className: 'bg-orange-500', style: {} }      // Orange
    return { className: 'bg-red-500', style: {} }                               // Red (5+ players)
  }
  
  // Render day column with hours
  const renderDayColumn = (day: string, heatMapData: any) => {
    const dayData = heatMapData[day] || {}
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return hours.map(hour => {
      const playerCount = dayData[hour] || 0
      const colorConfig = getMultiPlayerHeatMapColor(playerCount)
      
      return (
        <div
          key={hour}
          className={`${colorConfig.className} border-b border-gray-700`}
          style={{
            height: '6px',
            marginBottom: '0.5px',
            ...colorConfig.style
          }}
          title={`${day} ${hour}:00 - ${playerCount} player${playerCount !== 1 ? 's' : ''} active`}
        />
      )
    })
  }
  
  // Get all session data
  const allSessionsData = sessionQueries.map(query => query.data || [])
  const isLoading = sessionQueries.some(query => query.isLoading)
  
  // Generate heat map data
  const heatMapData = useMemo(() => {
    if (isLoading) return {}
    return generateMultiPlayerHeatMapData(allSessionsData)
  }, [allSessionsData, isLoading])
  
  return (
    <div className="border border-gray-600 rounded-lg bg-gray-700 mb-3 relative">
      <label className="absolute top-0 left-0 text-xs font-medium text-gray-300 pl-0.5">Heat Map</label>
      <div className="p-2 pt-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-400 text-sm">Loading activity data...</div>
          </div>
        ) : selectedPlayersList.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-sm">Select base owners to view activity heat map</div>
          </div>
        ) : (
          <div className="flex gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="flex-1">
                <div className="text-[10px] text-gray-400 text-center">{day}</div>
                <div className="bg-gray-800 rounded p-1" style={{height: '160px', position: 'relative'}}>
                  {renderDayColumn(day, heatMapData)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============= BASE REPORTS CONTENT COMPONENT =============
const BaseReportsContent = ({ baseName, onOpenReport }) => {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['/api/reports']
  })

  // Filter reports for this specific base
  const baseReports = reports.filter(report => {
    if (!baseName) return false
    return report.baseId || 
           report.locationName === baseName ||
           report.locationCoords === baseName ||
           (report.content?.baseName === baseName) ||
           (report.content?.baseCoords === baseName)
  })

  // Report type labels mapping
  const FULL_CATEGORY_NAMES = {
    'report-pvp': 'PvP Encounter',
    'report-spotted': 'Spotted Enemy',
    'report-bradley': 'Bradley/Heli Activity',
    'report-oil': 'Oil/Cargo Activity', 
    'report-monument': 'Monument Activity',
    'report-farming': 'Farming Activity',
    'report-loaded': 'Loaded Enemy',
    'report-raid': 'Raid Activity'
  }

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading reports...</div>
  }

  if (baseReports.length === 0) {
    return <div className="text-gray-400 text-sm italic">No reports for this base yet.</div>
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3">
      {baseReports.map((report) => {
        const content = report.content || {}
        const hasCamera = content.camera && content.camera.trim() !== ''
        const hasNotes = content.notes && content.notes.trim() !== ''
        
        return (
          <div key={report.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-white font-medium text-sm">
                {FULL_CATEGORY_NAMES[content.type] || content.type}
              </h4>
              <span className="text-gray-400 text-xs">
                {content.reportTime || 'No time'}
              </span>
            </div>
            
            <div className="flex gap-2 mb-2">
              <div className={`flex items-center gap-1 ${hasCamera ? 'text-white' : 'text-gray-600'}`}>
                <Camera className="w-3 h-3" />
              </div>
              <div className={`flex items-center gap-1 ${hasNotes ? 'text-white' : 'text-gray-600'}`}>
                <StickyNote className="w-3 h-3" />
              </div>
            </div>
            
            {content.enemyPlayers && (
              <div className="text-xs text-red-400 mb-1">
                Enemies: {content.enemyPlayers}
              </div>
            )}
            
            {content.friendlyPlayers && (
              <div className="text-xs text-green-400 mb-1">
                Friendlies: {content.friendlyPlayers}
              </div>
            )}
            
            {hasNotes && (
              <div className="text-xs text-gray-300 mt-2">
                {content.notes.slice(0, 100)}{content.notes.length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============= PLAYER SEARCH SELECTOR COMPONENT =============
const PlayerSearchSelector = ({ selectedPlayers, onPlayersChange, maxHeight }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Fetch players from external API
  const { data: players = [] } = useQuery<ExternalPlayer[]>({
    queryKey: ['/api/players']
  })

  // Fetch premium players from our database
  const { data: premiumPlayers = [] } = useQuery({
    queryKey: ['/api/premium-players']
  })

  // Parse selected players from comma-separated string
  const selectedPlayersList = selectedPlayers ? selectedPlayers.split(',').map(p => p.trim()).filter(p => p) : []
  
  // Filter regular players based on search term
  const filteredPlayers = players.filter(player => 
    player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedPlayersList.includes(player.playerName)
  )

  // Filter premium players based on search term
  const filteredPremiumPlayers = premiumPlayers.filter(player => 
    player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedPlayersList.includes(player.playerName)
  )

  // Check if we have any results
  const hasResults = filteredPlayers.length > 0 || filteredPremiumPlayers.length > 0
  


  const addPlayer = (playerName) => {
    const newPlayers = [...selectedPlayersList, playerName].join(', ')
    onPlayersChange(newPlayers)
    setSearchTerm('')
    setShowDropdown(false)
  }

  const createPremiumPlayer = async () => {
    if (!searchTerm.trim()) return
    
    try {
      await apiRequest('/api/premium-players', {
        method: 'POST',
        body: { playerName: searchTerm.trim() }
      })
      
      // Add the player to the selection
      addPlayer(searchTerm.trim())
      
      // Invalidate premium players cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/premium-players'] })
    } catch (error) {
      console.error('Failed to create premium player:', error)
    }
  }

  const removePlayer = (playerName) => {
    const newPlayers = selectedPlayersList.filter(p => p !== playerName).join(', ')
    onPlayersChange(newPlayers)
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search Input */}
      <div className="relative p-2 border-b border-gray-600">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-7 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            placeholder="Search players to add..."
          />
        </div>
        
        {/* Search Results Dropdown */}
        {showDropdown && searchTerm.trim() && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-gray-800 border border-gray-600 rounded max-h-32 overflow-y-auto z-50">
            {/* Regular Players */}
            {filteredPlayers.slice(0, 10).map((player) => (
              <button
                key={`regular-${player.id}`}
                onClick={() => addPlayer(player.playerName)}
                className="w-full text-left px-2 py-1 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={player.isOnline ? 'text-green-400' : 'text-gray-400'}>
                  {player.playerName}
                </span>
              </button>
            ))}
            
            {/* Premium Players */}
            {filteredPremiumPlayers.slice(0, 10).map((player) => (
              <button
                key={`premium-${player.id}`}
                onClick={() => addPlayer(player.playerName)}
                className="w-full text-left px-2 py-1 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-orange-400">
                  {player.playerName}
                </span>
                <span className="text-xs text-orange-600">
                  (Premium)
                </span>
              </button>
            ))}
            
            {/* Create Premium Profile Option */}
            {!hasResults && searchTerm.trim() && (
              <button
                onClick={createPremiumPlayer}
                className="w-full text-left px-2 py-1 hover:bg-gray-700 flex items-center gap-2 text-sm border-t border-gray-600"
              >
                <Plus className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400">
                  Create Premium profile: "{searchTerm.trim()}"
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Players List */}
      <div className="flex-1 overflow-y-auto p-2">
        {selectedPlayersList.length === 0 ? (
          <div className="text-gray-500 text-sm italic">No players selected</div>
        ) : (
          <div className="space-y-1">
            {selectedPlayersList.map((playerName, index) => {
              const player = players.find(p => p.playerName === playerName)
              const premiumPlayer = premiumPlayers.find(p => p.playerName === playerName)
              const isPremium = !!premiumPlayer
              
              return (
                <div key={index} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isPremium 
                        ? 'bg-orange-500' 
                        : player?.isOnline 
                        ? 'bg-green-500' 
                        : 'bg-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isPremium 
                        ? 'text-orange-400' 
                        : player?.isOnline 
                        ? 'text-green-400' 
                        : 'text-gray-400'
                    }`}>
                      {playerName}
                    </span>
                    {isPremium && (
                      <span className="text-xs text-orange-600">
                        (Premium)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removePlayer(playerName)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const BaseModal = ({ 
  modal, 
  modalType, 
  editingLocation,
  locations,
  onSave,
  onCancel,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    type: modalType === 'friendly' ? 'friendly-main' : modalType === 'enemy' ? 'enemy-small' : 'report-pvp',
    notes: '',
    oldestTC: 0,
    players: '',
    upkeep: { wood: 0, stone: 0, metal: 0, hqm: 0 },
    reportTime: '',
    reportOutcome: 'neutral',
    ownerCoordinates: '',
    library: '',
    youtube: '',
    roofCamper: false,
    hostileSamsite: false,
    raidedOut: false,
    primaryRockets: 0,
    enemyPlayers: '',
    friendlyPlayers: ''
  })
  
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false)
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false)
  const [showRaidedOutPrompt, setShowRaidedOutPrompt] = useState(false)
  const [showRocketCalculator, setShowRocketCalculator] = useState(false)
  const [rocketCalculatorPosition, setRocketCalculatorPosition] = useState({ x: 0, y: 0 })
  const [showReportPanel, setShowReportPanel] = useState(false)
  
  // Query to fetch reports for this base using location coordinates
  const { data: baseReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/reports/location', editingLocation?.coordinates],
    enabled: !!editingLocation?.coordinates && showReportPanel
  })
  
  const ownerInputRef = useRef(null)
  
  const handleToggleRocketCalculator = useCallback((e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setRocketCalculatorPosition({
      x: rect.right + 10,
      y: rect.top
    })
    setShowRocketCalculator(!showRocketCalculator)
  }, [showRocketCalculator])
  
  // Initialize form data when editing
  useEffect(() => {
    if (editingLocation) {
      setFormData({
        type: editingLocation.type,
        notes: editingLocation.notes || '',
        oldestTC: editingLocation.oldestTC || 0,
        players: editingLocation.players || '',
        upkeep: editingLocation.upkeep || { wood: 0, stone: 0, metal: 0, hqm: 0 },
        reportTime: editingLocation.time || '',
        reportOutcome: editingLocation.outcome || 'neutral',
        ownerCoordinates: editingLocation.ownerCoordinates || '',
        library: editingLocation.library || '',
        youtube: editingLocation.youtube || '',
        roofCamper: editingLocation.roofCamper || false,
        hostileSamsite: editingLocation.hostileSamsite || false,
        raidedOut: editingLocation.raidedOut || false,
        primaryRockets: editingLocation.primaryRockets || 0,
        enemyPlayers: editingLocation.enemyPlayers || '',
        friendlyPlayers: editingLocation.friendlyPlayers || ''
      })
    } else if (modalType === 'report') {
      const now = new Date()
      setFormData(prev => ({
        ...prev,
        reportTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      }))
    }
  }, [editingLocation, modalType])
  
  // Get subordinate bases for this main base
  const getSubordinateBases = useCallback(() => {
    if (!editingLocation || modalType !== 'enemy') return []
    
    const isMainBase = editingLocation.type === "enemy-small" || editingLocation.type === "enemy-medium" || editingLocation.type === "enemy-large"
    if (!isMainBase) return []
    
    const currentCoords = editingLocation.name.split('(')[0] // Remove (2), (3) etc
    
    return locations.filter(loc => {
      const isSubordinate = loc.type === "enemy-flank" || loc.type === "enemy-farm" || loc.type === "enemy-tower"
      if (!isSubordinate) return false
      
      // Check if this subordinate is linked to this main base
      if (loc.ownerCoordinates === currentCoords) return true
      
      return false
    }).map(loc => loc.name)
  }, [editingLocation, locations, modalType])

  const getMainBases = useCallback(() => {
    const bases = locations.filter(loc => 
      !loc.type.includes('farm') && 
      !loc.type.includes('flank') && 
      !loc.type.includes('boat') && 
      !loc.type.includes('garage') && 
      !loc.type.includes('decaying') &&
      !loc.type.includes('tower') &&
      !loc.type.startsWith('report')
    ).map(loc => loc.name.split('(')[0])
    
    return [...new Set(bases)]
  }, [locations])
  
  const getMainBasesWithInfo = useCallback(() => {
    const bases = locations.filter(loc => 
      !loc.type.includes('farm') && 
      !loc.type.includes('flank') && 
      !loc.type.includes('boat') && 
      !loc.type.includes('garage') && 
      !loc.type.includes('decaying') &&
      !loc.type.includes('tower') &&
      !loc.type.startsWith('report')
    )
    
    const baseMap = new Map()
    bases.forEach(base => {
      const coord = base.name.split('(')[0]
      if (!baseMap.has(coord)) {
        baseMap.set(coord, base.type)
      }
    })
    
    return baseMap
  }, [locations])
  
  const getFilteredSuggestions = useCallback((input) => {
    if (!input) return []
    const basesMap = getMainBasesWithInfo()
    const filtered = []
    basesMap.forEach((type, coord) => {
      if (coord.toLowerCase().startsWith(input.toLowerCase())) {
        filtered.push({ coord, type })
      }
    })
    return filtered.sort((a, b) => a.coord.localeCompare(b.coord))
  }, [getMainBasesWithInfo])
  
  const handleSave = () => {
    const baseData = {
      type: formData.type,
      notes: formData.notes,
      description: LABELS[formData.type] || formData.type,
      upkeep: modalType === 'friendly' ? formData.upkeep : undefined,
      time: modalType === 'report' ? formData.reportTime : undefined,
      outcome: modalType === 'report' ? formData.reportOutcome : undefined,
      enemyPlayers: modalType === 'report' ? formData.enemyPlayers : undefined,
      friendlyPlayers: modalType === 'report' ? formData.friendlyPlayers : undefined,
      players: modalType === 'enemy' ? formData.players : undefined,
      isMainBase: modalType === 'enemy' ? true : undefined,
      oldestTC: modalType === 'enemy' && formData.oldestTC > 0 ? formData.oldestTC : undefined,
      ownerCoordinates: (formData.type === 'enemy-farm' || formData.type === 'enemy-flank' || formData.type === 'enemy-tower') ? formData.ownerCoordinates : undefined,
      library: modalType === 'enemy' ? formData.library : undefined,
      youtube: modalType === 'enemy' ? formData.youtube : undefined,
      roofCamper: modalType === 'enemy' ? formData.roofCamper : undefined,
      hostileSamsite: modalType === 'enemy' ? formData.hostileSamsite : undefined,
      raidedOut: modalType === 'enemy' ? formData.raidedOut : undefined,
      primaryRockets: modalType === 'enemy' ? formData.primaryRockets : undefined
    }
    
    onSave(baseData)
  }
  
  const renderReportModal = () => (
    <div>
      <div className="flex gap-4 items-end mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-gray-200">Report Type</label>
          <div className="relative">
            <select 
              value={formData.type} 
              onChange={(e) => {
                const newType = e.target.value
                setFormData(prev => ({ 
                  ...prev, 
                  type: newType,
                  reportOutcome: newType === 'report-farming' ? 'lost' : newType === 'report-loaded' ? 'won' : 'neutral'
                }))
              }} 
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md appearance-none pr-16 text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="report-pvp">PVP General</option>
              <option value="report-spotted">Spotted Enemy</option>
              <option value="report-bradley">Countered/Took Bradley/Heli</option>
              <option value="report-oil">Countered/Took Oil/Cargo</option>
              <option value="report-monument">Big Score/Fight at Monument</option>
              <option value="report-farming">Killed While Farming</option>
              <option value="report-loaded">Killed Loaded Enemy</option>
              <option value="report-raid">Countered Raid</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-1">
              <div className={`${getColor(formData.type)} bg-gray-700 rounded p-0.5 border border-gray-600`}>
                {getIcon(formData.type)}
              </div>
              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Time</label>
          <input 
            type="time" 
            value={formData.reportTime} 
            onChange={(e) => setFormData(prev => ({ ...prev, reportTime: e.target.value }))} 
            className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:outline-none" 
          />
        </div>
      </div>
      
      {/* Enemy and Friendly Player Containers */}
      <div className="flex gap-3 mb-4" style={{ height: '200px' }}>
        {/* Enemy Players */}
        <div className="flex-1 bg-gray-900 border border-red-500 rounded p-3 flex flex-col">
          <h4 className="text-red-400 font-semibold text-sm mb-2">Enemy Players</h4>
          <div className="flex-1 overflow-y-auto">
            <textarea 
              value={formData.enemyPlayers}
              onChange={(e) => setFormData(prev => ({ ...prev, enemyPlayers: e.target.value }))}
              className="w-full h-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-red-500"
              placeholder="List enemy players..."
            />
          </div>
        </div>
        
        {/* Friendly Players */}
        <div className="flex-1 bg-gray-900 border border-green-500 rounded p-3 flex flex-col">
          <h4 className="text-green-400 font-semibold text-sm mb-2">Friendly Players</h4>
          <div className="flex-1 overflow-y-auto">
            <textarea 
              value={formData.friendlyPlayers}
              onChange={(e) => setFormData(prev => ({ ...prev, friendlyPlayers: e.target.value }))}
              className="w-full h-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-green-500"
              placeholder="List friendly players..."
            />
          </div>
        </div>
      </div>
      
      {/* Notes Container */}
      <div className="bg-gray-900 border border-gray-600 rounded p-3">
        <h4 className="text-gray-300 font-semibold text-sm mb-2">Notes</h4>
        <textarea 
          value={formData.notes} 
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
          className="w-full h-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
          placeholder="Add report details..."
        />
      </div>
    </div>
  )
  
  const renderBaseModal = () => (
    <div className="grid grid-cols-5 gap-4">
      <div className="col-span-2 flex flex-col">
        <label className="block text-sm font-medium mb-1 text-gray-200">Base Type</label>
        <div className="relative mb-3">
          <select 
            value={formData.type} 
            onChange={(e) => {
              const newType = e.target.value
              setFormData(prev => ({
                ...prev,
                type: newType,
                ownerCoordinates: (newType !== 'enemy-farm' && newType !== 'enemy-flank' && newType !== 'enemy-tower') ? '' : prev.ownerCoordinates
              }))
            }} 
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md appearance-none pr-16 text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            {modalType === 'friendly' && (
              <>
                <option value="friendly-main">Friendly Main Base</option>
                <option value="friendly-flank">Friendly Flank Base</option>
                <option value="friendly-farm">Friendly Farm</option>
                <option value="friendly-boat">Boat Base</option>
                <option value="friendly-garage">Garage</option>
              </>
            )}
            {modalType === 'enemy' && (
              <>
                <option value="enemy-small">Main Small</option>
                <option value="enemy-medium">Main Medium</option>
                <option value="enemy-large">Main Large</option>
                <option value="enemy-flank">Flank Base</option>
                <option value="enemy-tower">Tower</option>
                <option value="enemy-farm">Farm</option>
                <option value="enemy-decaying">Decaying Base</option>
              </>
            )}
          </select>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-1">
            <div className={`${getColor(formData.type)} bg-gray-700 rounded p-0.5 border border-gray-600`}>
              {getIcon(formData.type)}
            </div>
            <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {modalType === 'enemy' && (
          <RocketCalculatorSection
            primaryRockets={formData.primaryRockets}
            onPrimaryRocketsChange={(value) => setFormData(prev => ({ ...prev, primaryRockets: value }))}
            showCalculatorModal={showRocketCalculator}
            calculatorPosition={rocketCalculatorPosition}
            onToggleCalculator={handleToggleRocketCalculator}
            onCloseCalculator={() => setShowRocketCalculator(false)}
          />
        )}
        
        {modalType === 'enemy' && (
          <label className="block text-sm font-medium mb-1 text-gray-200">Base owners</label>
        )}
        <div className="border border-gray-600 rounded-md bg-gray-700 flex-1" style={{minHeight: modalType === 'enemy' ? '160px' : '300px'}}>
          {modalType === 'enemy' ? (
            <PlayerSearchSelector 
              selectedPlayers={formData.players}
              onPlayersChange={(players) => setFormData(prev => ({ ...prev, players }))}
              maxHeight="160px"
            />
          ) : (
            <div className="h-full bg-green-600 rounded flex items-center justify-center">
              <div className="text-center">
                <div className="text-white font-bold text-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
                  COMING
                </div>
                <div className="text-white font-bold text-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
                  SOON
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-3">
        {modalType === 'friendly' && (
          <div className="border border-gray-600 rounded-lg p-3 bg-gray-700 mb-3">
            <label className="block text-sm font-medium mb-1 text-gray-300">Upkeep Tracker</label>
            <div className="space-y-2">
              {['wood', 'stone', 'metal', 'hqm'].map((resource) => (
                <div key={resource} className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-400 w-12 capitalize">{resource.toUpperCase()}</label>
                  <input 
                    type="number" 
                    value={formData.upkeep[resource]} 
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      upkeep: { ...prev.upkeep, [resource]: Math.max(0, Math.min(999999, Number(e.target.value))) }
                    }))} 
                    className="flex-1 px-1.5 py-0.5 bg-gray-600 border border-gray-500 rounded text-sm text-gray-200 focus:border-blue-500 focus:outline-none" 
                    min="0"
                    max="999999"
                    style={{maxWidth: '100px'}}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        

        {modalType === 'enemy' && (
          <EnemyBaseHeatMap players={formData.players} />
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Notes</label>
          <textarea 
            value={formData.notes} 
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md resize-none text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
            placeholder="Add notes..." 
            style={{height: modalType === 'friendly' ? '190px' : modalType === 'enemy' ? '120px' : '340px', resize: 'none'}} 
          />
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative">
        <div className="relative">
          {modalType === 'enemy' && (
            <>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-red-600 rounded-lg px-3 py-1.5 border-2 border-red-500 shadow-lg whitespace-nowrap" style={{zIndex: 60}}>
                <span className="text-white font-mono font-bold text-3xl">
                  {editingLocation ? editingLocation.name : getGridCoordinate(modal.x, modal.y, locations, editingLocation?.id)}
                </span>
              </div>
              {(formData.type === 'enemy-farm' || formData.type === 'enemy-flank' || formData.type === 'enemy-tower') && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg px-2 py-1.5 border-2 border-gray-600 shadow-lg" style={{top: '28px', width: '90px', zIndex: 60}}>
                  <input
                    ref={ownerInputRef}
                    type="text"
                    value={formData.ownerCoordinates}
                    onChange={(e) => {
                      const uppercaseValue = e.target.value.toUpperCase()
                      setFormData(prev => ({ ...prev, ownerCoordinates: uppercaseValue }))
                      setShowOwnerSuggestions(true)
                    }}
                    onFocus={() => setShowOwnerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOwnerSuggestions(false), 200)}
                    placeholder="Main?"
                    className="px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none w-full text-center"
                  />
                  {showOwnerSuggestions && getFilteredSuggestions(formData.ownerCoordinates).length > 0 && (
                    <div className="absolute w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-32 overflow-auto left-0 right-0" style={{minWidth: '120px', zIndex: 70}}>
                      {getFilteredSuggestions(formData.ownerCoordinates).map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, ownerCoordinates: suggestion.coord }))
                            setShowOwnerSuggestions(false)
                            ownerInputRef.current?.focus()
                          }}
                          className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                          <div className={`${getColor(suggestion.type)} flex-shrink-0 scale-75`}>
                            {getIcon(suggestion.type)}
                          </div>
                          <span>{suggestion.coord}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {modalType !== 'enemy' && (
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-red-600 rounded-lg px-3 py-1.5 border-2 border-red-500 shadow-lg" style={{zIndex: 60}}>
              <span className="text-white font-mono font-bold text-3xl">
                {editingLocation ? editingLocation.name : getGridCoordinate(modal.x, modal.y)}
              </span>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 border border-gray-700 flex flex-col relative" style={{height: '95vh', maxHeight: '805px', zIndex: 50}}>
            <div className="p-4 border-b border-gray-700" style={{paddingTop: modalType === 'enemy' ? '32px' : '16px'}}>
              <div className="flex items-center justify-between">
                {modalType === 'enemy' && (
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-3 flex gap-1 flex-wrap overflow-hidden" style={{marginTop: '-4px'}}>
                      {getSubordinateBases().map((baseName, index) => (
                        <button
                          key={index}
                          className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600 hover:bg-gray-600 hover:border-gray-500 transition-colors h-4 leading-none"
                          onClick={() => {
                            // Find the subordinate base and open its modal
                            const subordinateBase = locations.find(loc => loc.name === baseName)
                            if (subordinateBase) {
                              // Close current modal and open subordinate base modal
                              onCancel()
                              // Use a small delay to ensure clean transition
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openBaseModal', {
                                  detail: {
                                    location: subordinateBase,
                                    modalType: 'enemy'
                                  }
                                }))
                              }, 50)
                            }
                          }}
                        >
                          {baseName}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-red-500 font-bold text-lg flex-shrink-0">ENEMY</div>
                      <div className="flex gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.roofCamper} 
                            onChange={(e) => setFormData(prev => ({ ...prev, roofCamper: e.target.checked }))}
                            className="w-3.5 h-3.5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                          />
                          <span>Roof Camper</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.hostileSamsite} 
                            onChange={(e) => setFormData(prev => ({ ...prev, hostileSamsite: e.target.checked }))}
                            className="w-3.5 h-3.5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                          />
                          <span>Hostile Samsite</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.raidedOut} 
                            onChange={(e) => {
                              if (!formData.raidedOut && e.target.checked) {
                                setShowRaidedOutPrompt(true)
                              } else {
                                setFormData(prev => ({ ...prev, raidedOut: false }))
                              }
                            }}
                            className="w-3.5 h-3.5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                          />
                          <span>Raided Out</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                {modalType === 'friendly' && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-green-500 font-bold text-lg flex-shrink-0">FRIENDLY</div>
                  </div>
                )}
                {modalType === 'report' && <div></div>}
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCancel()
                  }} 
                  className="text-gray-400 hover:text-gray-200 cursor-pointer"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 px-4 pt-4 space-y-3 overflow-y-auto text-gray-200" style={{paddingTop: modalType === 'enemy' ? '24px' : '12px', position: 'relative', zIndex: 1}}>
              {modalType === 'report' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-200">Report Screenshots</label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center hover:border-gray-500 transition-colors flex flex-col items-center justify-center" style={{height: '100px'}}>
                    <svg className="h-7 w-7 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-xs">Click to upload screenshots</p>
                  </div>
                </div>
              )}
              
              {modalType !== 'report' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-200">Base Screenshots</label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center hover:border-gray-500 transition-colors flex flex-col items-center justify-center" style={{height: '160px', width: '65%', marginRight: 'auto'}}>
                    <svg className="h-9 w-9 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Click to upload screenshots or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}

              {modalType === 'report' ? renderReportModal() : renderBaseModal()}
            </div>

            {modalType === 'report' ? (
              <div className="px-4 pb-2 relative z-50">
                <div className="flex gap-2 justify-end items-center">
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onCancel()
                    }} 
                    className="bg-gray-700 text-gray-200 py-1.5 px-3 rounded-md hover:bg-gray-600 transition-colors font-medium text-sm cursor-pointer"
                    type="button"
                  >
                    Cancel
                  </button>
                  <div className="flex-1"></div>
                  
                  <div className="flex rounded border border-gray-600 overflow-hidden" style={{height: '30px'}}>
                    {['won', 'neutral', 'lost'].map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, reportOutcome: outcome }))}
                        className={`px-2 flex items-center justify-center transition-all cursor-pointer ${
                          outcome === 'neutral' ? 'border-l border-r border-gray-600' : ''
                        } ${
                          formData.reportOutcome === outcome 
                            ? outcome === 'won' ? 'bg-green-500 text-white' : outcome === 'lost' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                            : outcome === 'won' ? 'bg-gray-700 text-green-400 hover:bg-gray-600' : outcome === 'lost' ? 'bg-gray-700 text-red-400 hover:bg-gray-600' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {outcome === 'won' ? (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                          </svg>
                        ) : outcome === 'lost' ? (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.28 3.22a.75.75 0 00-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 101.06 1.06L8 9.06l3.72 3.72a.75.75 0 101.06-1.06L9.06 8l3.72-3.72a.75.75 0 00-1.06-1.06L8 6.94 4.28 3.22z"/>
                          </svg>
                        ) : (
                          <span className="text-sm font-bold">?</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    className="bg-gray-700 text-gray-200 py-1.5 px-3 rounded-md hover:bg-gray-600 transition-colors font-medium text-sm cursor-pointer"
                    type="button"
                  >
                    Advanced
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSave()
                    }} 
                    className="bg-blue-600 text-white py-1.5 px-3 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
                    type="button"
                  >
                    {editingLocation ? 'Update Report' : 'Save Report'}
                  </button>
                </div>

                {editingLocation && (
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete()
                      }} 
                      className="text-red-600 hover:text-red-700 text-sm cursor-pointer"
                      type="button"
                    >
                      Delete Report
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 pb-2 relative z-50">
                <div className="flex justify-between">
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Toggle the Reports panel to show reports for this base
                      setShowReportPanel(!showReportPanel)
                    }} 
                    className={`${showReportPanel ? 'bg-yellow-700' : 'bg-yellow-600'} text-white py-1.5 px-3 rounded-md hover:bg-yellow-700 transition-colors font-medium text-sm cursor-pointer`}
                    type="button"
                  >
                    Report {showReportPanel ? '◄' : ''}
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSave()
                      }} 
                      className="bg-blue-600 text-white py-1.5 px-3 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
                      type="button"
                    >
                      {editingLocation ? 'Update' : 'Save'}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onCancel()
                      }} 
                      className="bg-gray-700 text-gray-200 py-1.5 px-3 rounded-md hover:bg-gray-600 transition-colors font-medium text-sm cursor-pointer"
                      type="button"
                    >
                      Cancel
                    </button>
                    {modalType === 'enemy' && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowAdvancedPanel(!showAdvancedPanel)
                        }} 
                        className="bg-purple-600 text-white py-1.5 px-3 rounded-md hover:bg-purple-700 transition-colors font-medium text-sm cursor-pointer"
                        type="button"
                      >
                        Advanced
                      </button>
                    )}
                    {editingLocation && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete()
                        }} 
                        className="bg-red-600 text-white py-1.5 px-3 rounded-md hover:bg-red-700 transition-colors font-medium text-sm cursor-pointer"
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Report Panel */}
        {showReportPanel && (
          <div 
            className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 absolute"
            style={{
              height: '95vh',
              maxHeight: '805px',
              width: '320px',
              left: '16px',
              transform: 'translateX(-100%)',
              top: 0,
              zIndex: 45
            }}
          >
            <div className="p-4 h-full flex flex-col">
              <h3 className="text-white font-bold mb-4">Base Reports</h3>
              
              {/* List of reports for this base */}
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="space-y-2">
                  {reportsLoading ? (
                    <p className="text-gray-400 text-sm">Loading reports...</p>
                  ) : baseReports.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No reports for this base yet.</p>
                  ) : (
                    baseReports.map(report => (
                      <div key={report.id} className="bg-gray-700 rounded p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white font-medium">{report.reportType}</span>
                          <span className="text-gray-400 text-xs">
                            {report.reportTime ? new Date(report.reportTime).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            }) : 'No time'}
                          </span>
                        </div>
                        {report.players && (
                          <div className="text-gray-300 mb-1">
                            <strong>Players:</strong> {report.players}
                          </div>
                        )}
                        {report.notes && (
                          <div className="text-gray-300">
                            <strong>Notes:</strong> {report.notes}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {report.youtube && <Camera className="w-3 h-3 text-white" />}
                          {report.notes && <StickyNote className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>
              
              {/* Create Report Button */}
              <button 
                onClick={() => {
                  if (editingLocation) {
                    window.dispatchEvent(new CustomEvent('openBaseReport', {
                      detail: { location: editingLocation }
                    }))
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm font-medium transition-colors"
              >
                Create New Report
              </button>
            </div>
          </div>
        )}
        
        {/* Advanced Panel */}
        {modalType === 'enemy' && showAdvancedPanel && (
          <div 
            className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 absolute"
            style={{
              height: '95vh',
              maxHeight: '805px',
              width: '280px',
              left: '100%',
              top: 0,
              marginLeft: '10px',
              zIndex: 45
            }}
          >
            <div className="p-4" style={{ height: '100%', overflowY: 'auto' }}>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-white font-bold mb-4">Advanced Settings</h3>
                
                <div className="flex flex-col items-center">
                  <label className="block text-sm font-medium mb-1 text-gray-200">Oldest TC</label>
                  <input 
                    type="number" 
                    value={formData.oldestTC || ''} 
                    onChange={(e) => setFormData(prev => ({ ...prev, oldestTC: Math.min(360, Math.max(0, Number(e.target.value) || 0)) }))} 
                    className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:outline-none" 
                    min="0" 
                    max="360" 
                    style={{width: '60px'}}
                    placeholder="0"
                  />
                  
                  {/* TC Orientation Display */}
                  <div className="mt-4">
                    <div className="relative bg-gray-800 rounded-lg p-4" style={{width: '120px', height: '120px'}}>
                      <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0">
                        {/* Center dot */}
                        <circle cx="60" cy="60" r="2" fill="#4B5563" />
                        
                        {/* Direction line */}
                        {formData.oldestTC > 0 && (
                          <>
                            <line
                              x1="60"
                              y1="60"
                              x2={60 + 40 * Math.cos((formData.oldestTC + 180 - 90) * Math.PI / 180)}
                              y2={60 + 40 * Math.sin((formData.oldestTC + 180 - 90) * Math.PI / 180)}
                              stroke="#3B82F6"
                              strokeWidth="2"
                            />
                            
                            {/* Triangle at end of line */}
                            <g transform={`translate(${60 + 40 * Math.cos((formData.oldestTC + 180 - 90) * Math.PI / 180)}, ${60 + 40 * Math.sin((formData.oldestTC + 180 - 90) * Math.PI / 180)}) rotate(${formData.oldestTC + 180})`}>
                              <path
                                d="M -4 -4 L 4 -4 L 0 4 Z"
                                fill="#3B82F6"
                              />
                            </g>
                          </>
                        )}
                      </svg>
                      
                      {/* Base icon in center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-gray-700 rounded-full p-0.5 shadow-md border border-gray-600">
                          <div className={getColor(formData.type)}>
                            {getIcon(formData.type)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {formData.oldestTC > 0 && (
                    <div className="text-xs text-gray-400 text-center mt-2">
                      TC facing: {formData.oldestTC}° → Line pointing: {(formData.oldestTC + 180) % 360}°
                    </div>
                  )}
                  
                  {/* Library Dropdown */}
                  <div className="w-full mt-6">
                    <label className="block text-sm font-medium mb-1 text-gray-200">Library</label>
                    <select 
                      value={formData.library}
                      onChange={(e) => setFormData(prev => ({ ...prev, library: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                      <option value="">Select...</option>
                    </select>
                  </div>
                  
                  {/* YouTube Video Input */}
                  <div className="w-full mt-4 mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-200">YouTube Video</label>
                    <input 
                      type="text" 
                      value={formData.youtube}
                      onChange={(e) => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                      placeholder="Enter YouTube URL..."
                      className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        

        {showReportPanel && (
          <div 
            className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 absolute"
            style={{
              height: '95vh',
              maxHeight: '805px',
              width: '320px',
              left: '16px',
              transform: 'translateX(-100%)',
              top: 0,
              zIndex: 45
            }}
          >
            <div className="p-4 h-full flex flex-col">


              <h3 className="text-white font-bold mb-4">Base Reports</h3>
              
              {/* List of reports for this base */}
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="space-y-2">
                  {reportsLoading ? (
                    <p className="text-gray-400 text-sm">Loading reports...</p>
                  ) : baseReports.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No reports for this base yet.</p>
                  ) : (
                    baseReports.map(report => (
                      <div key={report.id} className="bg-gray-700 rounded p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white font-medium">{report.reportType}</span>
                          <span className="text-gray-400 text-xs">
                            {report.reportTime ? new Date(report.reportTime).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            }) : 'No time'}
                          </span>
                        </div>
                        {report.players && (
                          <div className="text-gray-300 mb-1">
                            <strong>Players:</strong> {report.players}
                          </div>
                        )}
                        {report.notes && (
                          <div className="text-gray-300">
                            <strong>Notes:</strong> {report.notes}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {report.youtube && <Camera className="w-3 h-3 text-white" />}
                          {report.notes && <StickyNote className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              

              <div className="flex gap-3 flex-1 mb-4">



                  <div className="flex-1 overflow-y-auto">

                  </div>
                </div>
                

                <div className="w-1/2 bg-gray-900 border-2 border-green-500 rounded p-3 flex flex-col">

                  <div className="flex-1 overflow-y-auto">

                  </div>
                </div>
              </div>
              

              <div className="bg-gray-900 border-2 border-gray-600 rounded p-3 h-32">

                <textarea 


                />
              </div>
              
              {/* Create Report Button */}
              <button className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm font-medium transition-colors">
                Create New Report
              </button>
            </div>
          </div>
        )}
        
        {false && showRaidedOutPrompt && ( // DISABLED RAIDED OUT PROMPT
          <RaidedOutPrompt 
            onConfirm={() => {
              setShowRaidedOutPrompt(false)
              setFormData(prev => ({ ...prev, raidedOut: true }))
            }}
            onCancel={() => {
              setShowRaidedOutPrompt(false)
              setFormData(prev => ({ ...prev, raidedOut: true }))
            }}
          />
        )}
      </div>
    </div>
  )
}

export default BaseModal
