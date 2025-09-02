import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { MapPin, Home, Shield, Wheat, Castle, Tent, X, HelpCircle, Calculator, FileText, Image, Edit, Camera, StickyNote, Search, Plus, Minus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from '@/lib/queryClient'
import { RocketCalculatorSection } from './RocketCalculator'
import { ReportPreview } from './ReportPreview'
import ActionReportModal from './ActionReportModal'
import TCUpkeepModal from './TCUpkeepModal'
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

// ============= BASE REPORTS CONTENT COMPONENT =============
const BaseReportsContent = ({ baseId, baseOwners, onOpenReport }) => {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['/api/reports/base', baseId, baseOwners],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (baseOwners) {
        params.append('baseOwners', baseOwners);
      }
      const response = await fetch(`/api/reports/base/${baseId}?${params}`);
      return response.json();
    },
    enabled: !!baseId
  })

  const handleViewReport = (report) => {
    // Pass the report directly to onOpenReport
    if (report && onOpenReport) {
      onOpenReport(report);
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading reports...</div>
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reports found for this base</p>
        <p className="text-sm mt-1">Reports will appear here when tagged with this base or involving base owners</p>
      </div>
    )
  }

  return (
    <div className="border">
      {reports.map((report) => (
        <ReportPreview 
          key={report.id} 
          report={report} 
          onViewReport={handleViewReport}
        />
      ))}
    </div>
  )
}

// ============= BASE HEAT MAP COMPONENT =============
const BaseHeatMap = ({ baseId, modalType, fallbackPlayers }) => {
  // Fetch actual base owners from database for this specific base
  const { data: basePlayerTags = [] } = useQuery({
    queryKey: ['/api/player-base-tags/base', baseId],
    enabled: !!baseId
  })
  
  // Get actual player names tagged to this specific base from database
  let selectedPlayersList = basePlayerTags.map((tag: any) => tag.playerName).filter((name: string) => name)
  
  // If no database tags found and we have fallback players from form, use those
  if (selectedPlayersList.length === 0 && fallbackPlayers) {
    selectedPlayersList = fallbackPlayers.split(',').map(p => p.trim()).filter(p => p)
  }
  
  // Fetch session data for all selected players in a single query - MUST be called before any returns
  const { data: allSessionsData = {} } = useQuery({
    queryKey: ['/api/players/sessions/batch', selectedPlayersList.join(',')],
    queryFn: async () => {
      if (selectedPlayersList.length === 0) return {}
      
      const sessionsData: { [key: string]: any[] } = {}
      
      // Fetch sessions for each player
      for (const playerName of selectedPlayersList) {
        try {
          const response = await fetch(`/api/players/${encodeURIComponent(playerName)}/sessions`)
          if (response.ok) {
            const playerSessions = await response.json()
            sessionsData[playerName] = playerSessions
          } else {
            sessionsData[playerName] = []
          }
        } catch (error) {
          console.error(`Error fetching sessions for ${playerName}:`, error)
          sessionsData[playerName] = []
        }
      }
      return sessionsData
    },
    enabled: selectedPlayersList.length > 0
  })

  // Show message if no players are assigned - after all hooks are called
  if (selectedPlayersList.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-600">
        <h3 className="text-sm font-mono text-orange-400 mb-2">[ACTIVITY HEATMAP]</h3>
        <div className="text-gray-400 text-sm text-center py-4">
          No players assigned to this base
        </div>
      </div>
    )
  }

  // Generate heat map data from session history - multi-player version
  const generateHeatMapData = (allSessionsData: { [key: string]: any[] }) => {
    if (!allSessionsData || Object.keys(allSessionsData).length === 0) return {};
    
    // Create a map for each day of the week and each hour (0-23)
    // Track how many players are active in each hour
    const heatMap: { [key: string]: { [key: number]: number } } = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize heat map structure
    days.forEach(day => {
      heatMap[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        heatMap[day][hour] = 0;
      }
    });
    
    // Process sessions from each player separately to count overlapping activity
    Object.entries(allSessionsData).forEach(([playerName, sessions]) => {
      if (!sessions || sessions.length === 0) return;
      
      // Track which time slots this player is active in
      const playerActivity: { [key: string]: Set<number> } = {};
      days.forEach(day => {
        playerActivity[day] = new Set();
      });
      
      sessions.forEach((session: any) => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        
        // Handle sessions that span multiple hours or days
        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const currentDayIndex = currentTime.getDay();
          const currentDayName = days[currentDayIndex];
          const currentHour = currentTime.getHours();
          
          // Calculate how much of this hour is covered by the session
          const hourEnd = new Date(currentTime);
          hourEnd.setMinutes(59, 59, 999);
          
          const sessionEndForThisHour = endTime < hourEnd ? endTime : hourEnd;
          const minutesInThisHour = (sessionEndForThisHour.getTime() - currentTime.getTime()) / (1000 * 60);
          
          // If player has significant activity in this hour (>30 minutes), count them as active
          if (minutesInThisHour > 30) {
            playerActivity[currentDayName].add(currentHour);
          }
          
          // Move to next hour
          currentTime = new Date(hourEnd.getTime() + 1);
        }
      });
      
      // Add this player's activity to the heat map (increment player count for each active hour)
      days.forEach(day => {
        playerActivity[day].forEach(hour => {
          heatMap[day][hour] += 1;
        });
      });
    });
    
    return heatMap;
  };

  // Generate heat map data from all players
  const heatMapData = generateHeatMapData(allSessionsData);

  // Get heat map color based on number of players active in that hour
  const getHeatMapColor = (playerCount: number) => {
    if (playerCount === 0) return { className: 'bg-gray-800', style: {} };
    
    // Multi-player color coding system:
    // 1 player = light blue
    // 2 players = light blue (same as 1)
    // 3 players = yellow
    // 4 players = orange  
    // 5+ players = red
    switch (true) {
      case playerCount >= 5:
        return { className: 'bg-red-500', style: { opacity: '0.8' } };
      case playerCount === 4:
        return { className: 'bg-orange-500', style: { opacity: '0.8' } };
      case playerCount === 3:
        return { className: 'bg-yellow-500', style: { opacity: '0.8' } };
      case playerCount >= 1: // 1 or 2 players
        return { className: 'bg-blue-400', style: { opacity: '0.8' } };
      default:
        return { className: 'bg-gray-800', style: {} };
    }
  };

  // Helper function to render hour blocks for a day
  const renderDayColumn = (day: string) => {
    const dayData = heatMapData[day] || {};
    const hours = Array.from({ length: 24 }, (_, i) => 23 - i); // Start from 23 at top
    
    return hours.map(hour => {
      const playerCount = dayData[hour] || 0;
      const colorConfig = getHeatMapColor(playerCount);
      
      // Create player count description
      const getPlayerCountText = (count: number) => {
        if (count === 0) return 'No players';
        if (count === 1) return '1 player';
        return `${count} players`;
      };
      
      const getColorDescription = (count: number) => {
        if (count === 0) return '';
        if (count >= 5) return ' (Red)';
        if (count === 4) return ' (Orange)';
        if (count === 3) return ' (Yellow)';
        return ' (Light Blue)';
      };
      
      return (
        <div
          key={hour}
          className={`${colorConfig.className} border-b border-gray-700`}
          style={{
            height: '6.5px',
            marginBottom: '0.5px',
            ...colorConfig.style
          }}
          title={`${day} ${hour}:00 - ${getPlayerCountText(playerCount)}${getColorDescription(playerCount)}`}
        />
      );
    });
  };

  return (
    <div className="border border-gray-600 rounded-lg bg-gray-700 mb-3 relative">
      <label className="absolute top-0 left-0 text-xs font-medium text-gray-300 pl-0.5">Heat Map</label>
      <div className="p-2 pt-3">
        <div className="flex gap-1">
          {/* Hour labels column */}
          <div className="w-8">
            <div className="text-[10px] text-gray-400 text-center mb-1 h-4"></div>
            <div style={{height: '160px'}} className="flex flex-col justify-between py-1">
              {[0, 6, 12, 18].map((hour) => (
                <div key={hour} className="text-[9px] text-gray-500 text-right pr-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>
          
          {/* Day columns */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="flex-1">
              <div className="text-[10px] text-gray-400 text-center mb-1">{day}</div>
              <div className="bg-gray-800 rounded p-0.5" style={{height: '160px', position: 'relative'}}>
                <div className="flex flex-col h-full">
                  {renderDayColumn(day)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= LIVE PLAYER ACTIVITY COMPONENT =============
const LivePlayerActivity = ({ baseId, modalType }) => {
  // Fetch base player tags for this specific base
  const { data: basePlayerTags = [] } = useQuery({
    queryKey: ['/api/player-base-tags/base', baseId],
    enabled: !!baseId
  })

  // Fetch external players to get online status
  const { data: externalPlayers = [] } = useQuery({
    queryKey: ['/api/players'],
  })

  if (!baseId) {
    return <div className="text-gray-500 text-xs">No base selected</div>
  }

  if (basePlayerTags.length === 0) {
    return <div className="text-gray-500 text-xs">No players tagged</div>
  }

  // Match base players with external player data to get online status
  const playersWithStatus = basePlayerTags.map(tag => {
    const externalPlayer = externalPlayers.find(p => p.playerName === tag.playerName)
    return {
      name: tag.playerName,
      isOnline: externalPlayer?.isOnline || false
    }
  })

  return (
    <>
      {playersWithStatus.map((player, index) => (
        <div key={index} className="flex items-center justify-between text-xs">
          <span className="text-gray-300">{player.name}</span>
          <span className={`px-1 rounded font-medium ${
            player.isOnline 
              ? (modalType === 'enemy' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-black')
              : 'bg-gray-600 text-gray-300'
          }`}>
            {player.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      ))}
      {playersWithStatus.length === 0 && (
        <div className="text-gray-500 text-xs">No players found</div>
      )}
    </>
  )
}

// ============= PLAYER SEARCH SELECTOR COMPONENT =============
const PlayerSearchSelector = ({ selectedPlayers, onPlayersChange, maxHeight, modalType }) => {
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
      await apiRequest('POST', '/api/premium-players', { playerName: searchTerm.trim() })
      
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
      <div className="relative p-1">
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
            {filteredPlayers.slice(0, 10).map((player, index) => (
              <button
                key={`regular-${player.playerName}-${index}`}
                onClick={() => addPlayer(player.playerName)}
                className="w-full text-left px-2 py-1 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                <span className={player.isOnline ? 'text-yellow-400' : 'text-gray-400'}>
                  {player.playerName}
                </span>
                <span className="text-xs text-gray-500">
                  ({player.totalSessions} sessions)
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
                        ? (modalType === 'enemy' ? 'bg-red-500' : 'bg-yellow-500')
                        : 'bg-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isPremium 
                        ? 'text-orange-400' 
                        : player?.isOnline 
                        ? (modalType === 'enemy' ? 'text-red-400' : 'text-yellow-400')
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

// ============= REPORT ID GENERATOR =============
const generateReportId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'R'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const BaseModal = ({ 
  modal, 
  modalType, 
  editingLocation,
  locations,
  onSave,
  onCancel,
  onDelete,
  onOpenBaseReport,
  onOpenReport
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

    primaryRockets: 0,
    enemyPlayers: '',
    friendlyPlayers: '',
    reportId: generateReportId(),
    
    // TC Calculator data
    tcData: {
      goodForWipe: false,
      trackForTotal: true,
      mainTC: { wood: '', stone: '', metal: '', hqm: '' },
      additionalTCs: [],
      trackRemainingTime: false,
      timerDays: '00',
      timerHours: '00',
      timerMinutes: '00',
      isTimerActive: false
    }
  })
  
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false)
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false)

  const [showRocketCalculator, setShowRocketCalculator] = useState(false)
  const [rocketCalculatorPosition, setRocketCalculatorPosition] = useState({ x: 0, y: 0 })
  const [showReportPanel, setShowReportPanel] = useState(false)
  const [isEditingCoordinate, setIsEditingCoordinate] = useState(false)
  const [editableCoordinate, setEditableCoordinate] = useState('')
  
  // Report viewing state
  const [viewingReport, setViewingReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  
  const ownerInputRef = useRef(null)
  
  // Handler for opening reports from previews - use same system as map markers
  const handleOpenReport = useCallback((report) => {
    if (onOpenReport) {
      // Create a location object similar to what map markers have
      const reportLocation = {
        id: `report-${report.id}`,
        name: report.displayId || `R${report.id}`,
        x: 50, // Default position
        y: 50, 
        type: 'report-pvp',
        isReportMarker: true,
        reportId: report.id,
        displayReportId: report.displayId || `R${report.id}`,
        outcome: report.outcome,
        notes: report.notes,
        enemyPlayers: report.enemyPlayers || '',
        friendlyPlayers: report.friendlyPlayers || ''
      }
      
      onOpenReport(reportLocation)
      setShowReportPanel(false) // Close the report panel
    }
  }, [onOpenReport])
  
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

        primaryRockets: editingLocation.primaryRockets || 0,
        enemyPlayers: editingLocation.enemyPlayers || '',
        friendlyPlayers: editingLocation.friendlyPlayers || '',
        reportId: editingLocation.displayReportId || editingLocation.reportId || generateReportId(), // Use displayReportId first
        
        // Load saved TC Calculator data
        tcData: editingLocation.tcData || {
          goodForWipe: false,
          trackForTotal: true,
          mainTC: editingLocation.mainTC || { wood: '', stone: '', metal: '', hqm: '' },
          additionalTCs: editingLocation.additionalTCs || [],
          trackRemainingTime: editingLocation.trackRemainingTime || false,
          timerDays: editingLocation.tcTimerDays || '00',
          timerHours: editingLocation.tcTimerHours || '00',
          timerMinutes: editingLocation.tcTimerMinutes || '00',
          isTimerActive: false
        }
      })
    } else if (modalType === 'report') {
      const now = new Date()
      setFormData(prev => ({
        ...prev,
        reportTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      }))
    }
  }, [editingLocation, modalType])
  
  // Initialize editable coordinate
  useEffect(() => {
    const currentCoord = editingLocation ? editingLocation.name : getGridCoordinate(modal.x, modal.y, locations, null)
    setEditableCoordinate(currentCoord)
  }, [editingLocation, modal.x, modal.y, locations])
  
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
      reportId: modalType === 'report' ? formData.reportId : undefined,
      players: modalType === 'enemy' ? formData.players : undefined,
      isMainBase: modalType === 'enemy' ? true : undefined,
      oldestTC: modalType === 'enemy' && formData.oldestTC > 0 ? formData.oldestTC : undefined,
      ownerCoordinates: (formData.type === 'enemy-farm' || formData.type === 'enemy-flank' || formData.type === 'enemy-tower') ? formData.ownerCoordinates : undefined,
      library: modalType === 'enemy' ? formData.library : undefined,
      youtube: modalType === 'enemy' ? formData.youtube : undefined,
      roofCamper: modalType === 'enemy' ? formData.roofCamper : undefined,
      hostileSamsite: modalType === 'enemy' ? formData.hostileSamsite : undefined,

      primaryRockets: modalType === 'enemy' ? formData.primaryRockets : undefined,
      name: editableCoordinate, // Use the edited coordinate as the name
      
      // Include TC Calculator data for friendly bases
      tcData: modalType === 'friendly' ? formData.tcData : undefined,
      mainTC: modalType === 'friendly' ? formData.tcData.mainTC : undefined,
      additionalTCs: modalType === 'friendly' ? formData.tcData.additionalTCs : undefined,
      trackRemainingTime: modalType === 'friendly' ? formData.tcData.trackRemainingTime : undefined,
      tcTimerDays: modalType === 'friendly' ? formData.tcData.timerDays : undefined,
      tcTimerHours: modalType === 'friendly' ? formData.tcData.timerHours : undefined,
      tcTimerMinutes: modalType === 'friendly' ? formData.tcData.timerMinutes : undefined
    }
    
    onSave(baseData)
  }
  
  const renderReportModal = () => (
    <div>
      <div className="flex gap-4 items-end mb-4">
        <div className="flex-1">
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
              className="w-full px-2 py-1.5 bg-gray-800 border border-orange-600/50 rounded-md appearance-none pr-16 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
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
              <div className={`${getColor(formData.type)} bg-gray-800 rounded p-0.5 border border-orange-600/50`}>
                {getIcon(formData.type)}
              </div>
              <svg className="h-3 w-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div>
          <input 
            type="time" 
            value={formData.reportTime} 
            onChange={(e) => setFormData(prev => ({ ...prev, reportTime: e.target.value }))} 
            className="px-2 py-1.5 bg-gray-800 border border-orange-600/50 rounded-md text-orange-200 focus:border-orange-500 focus:outline-none font-mono" 
          />
        </div>
      </div>
      
      {/* Enemy and Friendly Player Containers */}
      <div className="flex gap-3 mb-4" style={{ height: '200px' }}>
        {/* Enemy Players */}
        <div className="flex-1 bg-gray-900 border border-red-500 rounded p-3 flex flex-col relative">
          <h4 className="absolute top-1 left-1 text-red-400 font-semibold text-xs z-10 font-mono tracking-wide">[ENEMY PLAYERS]</h4>
          <div className="flex-1 border border-gray-600 rounded bg-gray-700 mt-4">
            <PlayerSearchSelector 
              selectedPlayers={formData.enemyPlayers}
              onPlayersChange={(players) => setFormData(prev => ({ ...prev, enemyPlayers: players }))}
              maxHeight="160px"
              modalType={modalType}
            />
          </div>
        </div>
        
        {/* Friendly Players */}
        <div className="flex-1 bg-gray-900 border border-green-500 rounded p-3 flex flex-col relative">
          <h4 className="absolute top-1 left-1 text-green-400 font-semibold text-xs z-10 font-mono tracking-wide">[FRIENDLY PLAYERS]</h4>
          <div className="flex-1 border border-gray-600 rounded bg-gray-700 mt-4">
            <PlayerSearchSelector 
              selectedPlayers={formData.friendlyPlayers}
              onPlayersChange={(players) => setFormData(prev => ({ ...prev, friendlyPlayers: players }))}
              maxHeight="160px"
              modalType={modalType}
            />
          </div>
        </div>
      </div>
      
      {modalType === 'report' && (
        <textarea 
          value={formData.notes} 
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
          className="w-full h-20 px-2 py-1 bg-gray-800 border border-orange-600/50 rounded text-xs text-orange-200 placeholder-orange-500/60 resize-none focus:outline-none focus:border-orange-500 font-mono"
          placeholder="[add notes...]"
        />
      )}

    </div>
  )
  
  const renderBaseModal = () => (
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 flex flex-col">
        <label className="block text-sm font-medium mb-1 text-orange-200 font-mono tracking-wide">[BASE TYPE]</label>
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
            className="w-full px-2 py-1.5 bg-gray-800 border border-orange-600/50 rounded-md appearance-none pr-16 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
          >
            {modalType === 'friendly' && (
              <>
                <option value="friendly-main">Main Base</option>
                <option value="friendly-flank">Flank Base</option>
                <option value="friendly-farm">Farm</option>
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
            <div className={`${getColor(formData.type)} bg-gray-800 rounded p-0.5 border border-orange-600/50`}>
              {getIcon(formData.type)}
            </div>
            <svg className="h-3 w-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        <label className="block text-sm font-medium mb-1 text-orange-200 font-mono tracking-wide">{modalType === 'enemy' ? '[BASE OWNERS]' : '[BED OWNERS]'}</label>
        <div className="border border-orange-600/50 rounded-md bg-gray-800 flex-1" style={{minHeight: modalType === 'enemy' ? '160px' : '300px'}}>
          <PlayerSearchSelector 
            selectedPlayers={formData.players}
            onPlayersChange={(players) => setFormData(prev => ({ ...prev, players }))}
            maxHeight={modalType === 'enemy' ? '160px' : '300px'}
            modalType={modalType}
          />
        </div>
      </div>

      <div className="col-span-3">
        {modalType === 'friendly' && (
          <TCUpkeepModal 
            onClose={() => {}} 
            tcData={formData.tcData}
            onTCDataChange={(newTCData) => setFormData(prev => ({ ...prev, tcData: newTCData }))}
          />
        )}
        
        {modalType === 'enemy' && (
          <BaseHeatMap 
            baseId={editingLocation?.id} 
            modalType={modalType} 
            fallbackPlayers={formData.players} 
          />
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1 text-orange-200 font-mono tracking-wide">[NOTES]</label>
          <textarea 
            value={formData.notes} 
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
            className="w-full px-2 py-1.5 bg-gray-800 border border-orange-600/50 rounded-md resize-none text-orange-200 placeholder-orange-500/60 focus:border-orange-500 focus:outline-none font-mono" 
            placeholder="[add notes...]" 
            style={{height: modalType === 'friendly' ? '190px' : modalType === 'enemy' ? '120px' : '340px', resize: 'none'}} 
          />
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-mono">
      <div className="relative">
        <div className="relative">
          {modalType === 'enemy' && (
            <>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-orange-700 rounded-lg px-3 py-1.5 border-2 border-orange-600 shadow-lg whitespace-nowrap" style={{zIndex: 60}}>
                <span className="text-orange-100 font-mono font-bold text-3xl tracking-wider">
                  {editingLocation ? editingLocation.name : getGridCoordinate(modal.x, modal.y, locations, editingLocation?.id)}
                </span>
              </div>
              {(formData.type === 'enemy-farm' || formData.type === 'enemy-flank' || formData.type === 'enemy-tower') && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-lg px-2 py-1.5 border-2 border-orange-600/50 shadow-lg" style={{top: '28px', width: '90px', zIndex: 60}}>
                  <input
                    ref={ownerInputRef}
                    type="text"
                    value={formData.ownerCoordinates}
                    onChange={(e) => {
                      const capitalizedValue = e.target.value.toUpperCase()
                      setFormData(prev => ({ ...prev, ownerCoordinates: capitalizedValue }))
                      setShowOwnerSuggestions(true)
                    }}
                    onFocus={() => setShowOwnerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOwnerSuggestions(false), 200)}
                    placeholder="Main?"
                    className="px-1 py-0.5 bg-gray-800 border border-orange-600/40 rounded text-sm text-orange-200 placeholder-orange-500/60 focus:border-orange-500 focus:outline-none w-full text-center font-mono"
                  />
                  {showOwnerSuggestions && getFilteredSuggestions(formData.ownerCoordinates).length > 0 && (
                    <div className="absolute w-full mt-1 bg-gray-900 border border-orange-600/50 rounded-md shadow-lg max-h-32 overflow-auto left-0 right-0" style={{minWidth: '120px', zIndex: 70}}>
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
                          className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm text-orange-200 hover:bg-orange-900/30 transition-colors font-mono"
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
          
          <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 ${modalType === 'enemy' ? 'bg-red-600 border-red-500' : 'bg-red-600 border-red-500'} rounded-lg px-3 py-1.5 border-2 shadow-lg`} style={{zIndex: 60}}>
            {isEditingCoordinate ? (
              <input
                type="text"
                value={editableCoordinate}
                onChange={(e) => setEditableCoordinate(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingCoordinate(false)
                  }
                  if (e.key === 'Escape') {
                    setEditableCoordinate(editingLocation ? editingLocation.name : getGridCoordinate(modal.x, modal.y, locations, null))
                    setIsEditingCoordinate(false)
                  }
                }}
                onBlur={() => setIsEditingCoordinate(false)}
                autoFocus
                className="text-white font-mono font-bold text-3xl bg-transparent border-2 border-orange-500 rounded px-2 py-1 text-center focus:outline-none focus:border-orange-300"
              />
            ) : (
              <span 
                className="text-white font-mono font-bold text-3xl cursor-pointer hover:text-orange-200 transition-colors"
                onClick={() => setIsEditingCoordinate(true)}
              >
                {editableCoordinate}
              </span>
            )}
          </div>

          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 border-2 border-orange-600/50 flex flex-col relative" style={{height: '95vh', maxHeight: '805px', zIndex: 50}}>
            {/* Report ID Display - Top Left of Modal */}
            {modalType === 'report' && (
              <div className="absolute top-2 left-2 z-20">
                <span className="text-yellow-400 font-bold text-xs bg-gray-800 px-1 py-0.5 rounded border border-yellow-600">
                  {modalType === 'report' && formData.reportId ? formData.reportId : 'New Report'}
                </span>
              </div>
            )}
            <div className="p-4 border-b border-orange-600/50" style={{paddingTop: modalType === 'enemy' ? '32px' : '16px'}}>
              <div className="flex items-center justify-between">
                {modalType === 'enemy' && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-orange-400 font-bold text-lg flex-shrink-0 tracking-wider">[ENEMY]</div>
                    <div className="flex gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-orange-200 cursor-pointer font-mono">
                        <input 
                          type="checkbox" 
                          checked={formData.roofCamper} 
                          onChange={(e) => setFormData(prev => ({ ...prev, roofCamper: e.target.checked }))}
                          className="w-3.5 h-3.5 text-orange-600 bg-gray-800 border-orange-600/50 rounded focus:ring-orange-500 focus:ring-1"
                        />
                        <span>[ROOF CAMPER]</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-orange-200 cursor-pointer font-mono">
                        <input 
                          type="checkbox" 
                          checked={formData.hostileSamsite} 
                          onChange={(e) => setFormData(prev => ({ ...prev, hostileSamsite: e.target.checked }))}
                          className="w-3.5 h-3.5 text-orange-600 bg-gray-800 border-orange-600/50 rounded focus:ring-orange-500 focus:ring-1"
                        />
                        <span>[HOSTILE SAMSITE]</span>
                      </label>

                    </div>
                  </div>
                )}
                {modalType === 'friendly' && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-green-400 font-bold text-lg flex-shrink-0 tracking-wider">[FRIENDLY]</div>
                  </div>
                )}
                {modalType !== 'enemy' && modalType !== 'friendly' && <div></div>}
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCancel()
                  }} 
                  className="text-orange-400 hover:text-orange-200 cursor-pointer"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 px-4 pt-4 space-y-3 overflow-y-auto text-orange-200" style={{paddingTop: modalType === 'enemy' ? '24px' : '12px', position: 'relative', zIndex: 1}}>
              {modalType === 'report' && (
                <div className="mb-3">
                  <div className="border-2 border-dashed border-orange-600/50 rounded-lg p-8 text-center hover:border-orange-500/70 transition-colors flex flex-col items-center justify-center" style={{height: '240px'}}>
                    <svg className="h-7 w-7 text-orange-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-orange-400 text-xs font-mono">[CLICK TO UPLOAD SCREENSHOTS]</p>
                  </div>
                </div>
              )}
              
              {modalType !== 'report' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-orange-200 font-mono tracking-wide">[BASE SCREENSHOTS]</label>
                  <div className="border-2 border-dashed border-orange-600/50 rounded-lg p-3 text-center hover:border-orange-500/70 transition-colors flex flex-col items-center justify-center" style={{height: '160px', width: '65%', marginRight: 'auto'}}>
                    <svg className="h-9 w-9 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-orange-400 text-sm font-mono">[CLICK TO UPLOAD OR DRAG AND DROP]</p>
                    <p className="text-xs text-orange-500/80 mt-1 font-mono">[PNG, JPG UP TO 10MB]</p>
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
                    className="bg-gray-800 text-orange-200 py-1.5 px-3 rounded-md hover:bg-gray-700 transition-colors font-medium text-sm cursor-pointer border border-orange-600/40 font-mono"
                    type="button"
                  >
                    [CANCEL]
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
                    className="bg-gray-800 text-orange-200 py-1.5 px-3 rounded-md hover:bg-gray-700 transition-colors font-medium text-sm cursor-pointer border border-orange-600/40 font-mono"
                    type="button"
                  >
                    [ADVANCED]
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSave()
                    }} 
                    className="bg-orange-600 text-white py-1.5 px-3 rounded-md hover:bg-orange-700 transition-colors font-medium text-sm cursor-pointer border border-orange-500 font-mono"
                    type="button"
                  >
                    {editingLocation ? '[UPDATE REPORT]' : '[SAVE REPORT]'}
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
                      className="bg-orange-600 text-white py-1.5 px-3 rounded-md hover:bg-orange-700 transition-colors font-medium text-sm cursor-pointer border border-orange-500 font-mono"
                      type="button"
                    >
                      {editingLocation ? '[UPDATE]' : '[SAVE]'}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onCancel()
                      }} 
                      className="bg-gray-800 text-orange-200 py-1.5 px-3 rounded-md hover:bg-gray-700 transition-colors font-medium text-sm cursor-pointer border border-orange-600/40 font-mono"
                      type="button"
                    >
                      [CANCEL]
                    </button>
                    {modalType === 'enemy' && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowAdvancedPanel(!showAdvancedPanel)
                        }} 
                        className="bg-orange-700 text-white py-1.5 px-3 rounded-md hover:bg-orange-800 transition-colors font-medium text-sm cursor-pointer border border-orange-600 font-mono"
                        type="button"
                      >
                        [ADVANCED]
                      </button>
                    )}
                    {editingLocation && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete()
                        }} 
                        className="bg-orange-800 text-white py-1.5 px-3 rounded-md hover:bg-orange-900 transition-colors font-medium text-sm cursor-pointer border border-orange-700 font-mono"
                        type="button"
                      >
                        [DELETE]
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
                  <p className="text-gray-400 text-sm italic">No reports for this base yet.</p>
                  {/* Reports will be listed here */}
                </div>
              </div>
              
              {/* Create Report Button */}
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm font-medium transition-colors">
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
              
              {/* Reports List */}
              <div className="flex-1 overflow-y-auto mb-4">
                <BaseReportsContent 
                  baseId={editingLocation?.id} 
                  baseOwners={formData.players}
                  onOpenReport={handleOpenReport}
                />
              </div>
              
              {/* Create Report Button */}
              <button 
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // Close report panel and open base report modal
                  setShowReportPanel(false)
                  // This should trigger opening the base report modal with this base pre-selected
                  if (editingLocation && onOpenBaseReport) {
                    onOpenBaseReport(editingLocation)
                  }
                }}
              >
                Create New Report
              </button>
            </div>
          </div>
        )}

      </div>
      


      
    </div>
  )
}

export default BaseModal
