import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, User, Plus } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ExternalPlayer } from '@shared/schema';
import { ReportPreview } from './ReportPreview';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBaseModal?: (baseId: string, baseName: string) => void;
}

// Component to fetch and display reports for a specific player using centralized API
const PlayerReportsContent = ({ playerName }: { playerName: string | null }) => {
  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/reports/player', playerName],
    enabled: !!playerName
  })

  if (isLoading) {
    return <div className="text-center py-4">Loading reports...</div>
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reports found for this player</p>
        <p className="text-sm mt-1">Reports will appear here when this player is tagged in reports</p>
      </div>
    )
  }

  return (
    <div className="border max-h-64 overflow-y-auto">
      {reports.map((report: any) => (
        <ReportPreview key={report.id} report={report} />
      ))}
    </div>
  )
}

export function PlayerModal({ isOpen, onClose, onOpenBaseModal }: PlayerModalProps) {
  const [nameSearch, setNameSearch] = useState('');
  const [baseNumberSearch, setBaseNumberSearch] = useState('');
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [premiumPlayerName, setPremiumPlayerName] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch teammates from the database
  const { data: teammatesData = [], isLoading: teammatesLoading } = useQuery<{playerName: string}[]>({
    queryKey: ['/api/teammates'],
    enabled: isOpen,
  });

  const teammates = new Set(teammatesData.map(t => t.playerName));

  // Fetch players from the external API via our server
  const { data: players = [], isLoading } = useQuery<ExternalPlayer[]>({
    queryKey: ['/api/players'],
    enabled: isOpen,
  });

  // Fetch real-time BattleMetrics server players
  const { data: battlemetricsPlayers = [] } = useQuery<any[]>({
    queryKey: ['/api/battlemetrics/players'],
    enabled: isOpen,
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Fetch active server info for BattleMetrics integration
  const { data: activeServer } = useQuery({
    queryKey: ['/api/battlemetrics/servers/active'],
    enabled: isOpen
  });

  // Fetch premium players from our database
  const { data: premiumPlayers = [] } = useQuery<any[]>({
    queryKey: ['/api/premium-players'],
    enabled: isOpen,
  });

  // Fetch session history for selected player
  const { data: sessionHistory = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ['/api/players', selectedPlayer, 'sessions'],
    enabled: !!selectedPlayer,
  });

  // Fetch player base tags for selected player
  const { data: playerBaseTags = [] } = useQuery<any[]>({
    queryKey: ['/api/player-base-tags/player', selectedPlayer],
    enabled: !!selectedPlayer,
  })

  // Fetch player profile for selected player
  const { data: playerProfile } = useQuery<any>({
    queryKey: ['/api/player-profiles', selectedPlayer],
    enabled: !!selectedPlayer,
  })

  // State for profile form
  const [profileData, setProfileData] = useState({
    aliases: '',
    notes: ''
  })

  // Update profile data when player profile is loaded
  useEffect(() => {
    if (playerProfile) {
      setProfileData({
        aliases: playerProfile.aliases || '',
        notes: playerProfile.notes || ''
      })
    } else if (selectedPlayer) {
      // Reset form for new player without profile
      setProfileData({
        aliases: '',
        notes: ''
      })
    }
  }, [playerProfile, selectedPlayer])

  // Save player profile
  const savePlayerProfile = async () => {
    if (!selectedPlayer) return
    
    try {
      await apiRequest('POST', '/api/player-profiles', {
        playerName: selectedPlayer,
        aliases: profileData.aliases,
        notes: profileData.notes
      })
      
      // Invalidate and refetch the profile
      queryClient.invalidateQueries({ queryKey: ['/api/player-profiles', selectedPlayer] })
    } catch (error) {
      console.error('Error saving player profile:', error)
    }
  }

  // Fetch all player base tags for determining enemy/friendly status
  const { data: allPlayerBaseTags = [] } = useQuery<any[]>({
    queryKey: ['/api/player-base-tags'],
    enabled: isOpen,
  })

  // Helper function to determine if a player is primarily associated with enemy bases
  const isEnemyPlayer = (playerName: string) => {
    const playerTags = allPlayerBaseTags.filter((tag: any) => tag.playerName === playerName)
    if (playerTags.length === 0) return false
    
    const enemyTags = playerTags.filter((tag: any) => tag.baseType.startsWith('enemy'))
    return enemyTags.length > playerTags.length / 2 // More than half enemy bases
  };

  // Helper function to check if a player is a teammate
  const isTeammate = (playerName: string) => {
    return teammates.has(playerName);
  };

  // Mutations for teammate management
  const addTeammateMutation = useMutation({
    mutationFn: async (playerName: string) => {
      return apiRequest('POST', '/api/teammates', { playerName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teammates'] });
    }
  });

  const removeTeammateMutation = useMutation({
    mutationFn: async (playerName: string) => {
      return apiRequest('DELETE', `/api/teammates/${playerName}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teammates'] });
    }
  });

  // Functions to manage teammates
  const addTeammate = (playerName: string) => {
    addTeammateMutation.mutate(playerName);
  };

  const removeTeammate = (playerName: string) => {
    removeTeammateMutation.mutate(playerName);
  };

  // Merge BattleMetrics real-time data with existing player data
  const mergedPlayers = players.map(player => {
    const bmPlayer = battlemetricsPlayers.find(bp => bp.name === player.playerName);
    return {
      ...player,
      isOnlineBM: bmPlayer?.isOnline || false,
      lastSeenBM: bmPlayer?.lastSeen || null,
      battlemetricsId: bmPlayer?.id || null
    };
  });

  // Add players that are online in BattleMetrics but not in our database
  const onlineBMPlayers = battlemetricsPlayers.filter(bmPlayer => 
    bmPlayer.isOnline && !players.some(p => p.playerName === bmPlayer.name)
  ).map(bmPlayer => ({
    playerName: bmPlayer.name,
    isOnline: true,
    isOnlineBM: true,
    totalSessions: 0,
    battlemetricsId: bmPlayer.id,
    lastSeenBM: bmPlayer.lastSeen
  }));

  const allPlayers = [...mergedPlayers, ...onlineBMPlayers];

  // Filter players based on search criteria
  const filteredPlayers = allPlayers.filter(player => {
    const nameMatch = nameSearch === '' || player.playerName.toLowerCase().includes(nameSearch.toLowerCase());
    // For now, search by session count for base number search (you can customize this)
    const sessionMatch = baseNumberSearch === '' || (player.totalSessions || 0).toString().includes(baseNumberSearch);
    return nameMatch && sessionMatch;
  });

  // Filter premium players based on search criteria
  const filteredPremiumPlayers = premiumPlayers.filter((player: any) => {
    const nameMatch = nameSearch === '' || player.playerName.toLowerCase().includes(nameSearch.toLowerCase());
    return nameMatch;
  });

  const createPremiumPlayer = async () => {
    if (!premiumPlayerName.trim()) return;
    
    try {
      await apiRequest('POST', '/api/premium-players', { 
        playerName: premiumPlayerName.trim() 
      });
      
      // Refresh premium players data
      queryClient.invalidateQueries({ queryKey: ['/api/premium-players'] });
      
      // Close dialog and reset form
      setShowPremiumDialog(false);
      setPremiumPlayerName('');
    } catch (error) {
      console.error('Failed to create premium player:', error);
    }
  };

  // Heat map generation function
  const generateHeatMapData = (sessions: any[]) => {
    if (!sessions || sessions.length === 0) return {};
    
    // Create a map for each day of the week and each hour (0-23)
    const heatMap: { [key: string]: { [key: number]: number } } = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize heat map structure
    days.forEach(day => {
      heatMap[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        heatMap[day][hour] = 0;
      }
    });
    
    // Process each session and add to heat map
    sessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayIndex = startTime.getDay();
      const dayName = days[dayIndex];
      
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
        
        // Add intensity based on minutes (0-60 minutes = 0-1 intensity)
        if (heatMap[currentDayName]) {
          heatMap[currentDayName][currentHour] += Math.min(minutesInThisHour / 60, 1);
        }
        
        // Move to next hour
        currentTime = new Date(hourEnd.getTime() + 1);
      }
    });
    
    // Normalize values to prevent intensity > 1
    Object.keys(heatMap).forEach(day => {
      Object.keys(heatMap[day]).forEach(hour => {
        const hourNum = parseInt(hour);
        heatMap[day][hourNum] = Math.min(heatMap[day][hourNum], 1);
      });
    });
    
    return heatMap;
  };

  // Get heat map data for selected player
  const heatMapData = selectedPlayer ? generateHeatMapData(sessionHistory) : {};

  // Helper function to get heat map color intensity - simplified for single player view
  const getHeatMapColor = (intensity: number) => {
    if (intensity === 0) return { className: 'bg-gray-800', style: {} };
    // Simple white intensity - easier to read and will work better when combined with enemy base colors
    const opacity = Math.min(intensity * 0.8 + 0.2, 1); // Min 20% opacity, max 100%
    return { 
      className: 'bg-white', 
      style: { opacity: opacity.toString() }
    };
  };

  // Helper function to render hour blocks for a day
  const renderDayColumn = (day: string) => {
    const dayData = heatMapData[day] || {};
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return hours.map(hour => {
      const intensity = dayData[hour] || 0;
      const colorConfig = getHeatMapColor(intensity);
      
      return (
        <div
          key={hour}
          className={`${colorConfig.className} border-b border-gray-700`}
          style={{
            height: '8px',
            marginBottom: '0.5px',
            ...colorConfig.style
          }}
          title={`${day} ${hour}:00 - Activity: ${Math.round(intensity * 100)}%`}
        />
      );
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[1150px] min-w-[1150px] max-w-[1150px] h-[800px] bg-gray-900 border-2 border-orange-600/50 font-mono">
          <DialogHeader>
            <DialogTitle className="text-orange-400 text-xl font-bold flex items-center gap-2 tracking-wider">
              <User className="w-5 h-5" />
              {selectedPlayer ? (
                <div className="flex items-center gap-2">
                  <span className={`${isTeammate(selectedPlayer) ? 'text-green-400' : 'text-orange-400'}`}>
                    [{selectedPlayer.toUpperCase()}]
                  </span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isTeammate(selectedPlayer)
                      ? (players.find(p => p.playerName === selectedPlayer)?.isOnline ? 'bg-green-600 text-green-200' : 'bg-gray-700 text-gray-400')
                      : players.find(p => p.playerName === selectedPlayer)?.isOnline 
                        ? 'bg-yellow-600 text-yellow-200' 
                        : 'bg-gray-600 text-gray-300'
                  }`}>
                    {players.find(p => p.playerName === selectedPlayer)?.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                  {isTeammate(selectedPlayer) && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded-full border border-green-600/30">
                      TEAMMATE
                    </span>
                  )}
                  <div className="flex items-center gap-2 ml-2">
                    <Checkbox
                      checked={isTeammate(selectedPlayer)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addTeammate(selectedPlayer);
                        } else {
                          removeTeammate(selectedPlayer);
                        }
                      }}
                      className="h-4 w-4 border-2 border-white bg-gray-700 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 hover:border-gray-300"
                    />
                    <span className="text-xs text-gray-300">Teammate</span>
                  </div>
                </div>
              ) : '[PLAYER MANAGEMENT]'}
              {!selectedPlayer && (
                <Plus 
                  className="w-4 h-4 text-orange-400 cursor-pointer hover:text-orange-300" 
                  onClick={() => setShowPremiumDialog(true)}
                />
              )}
              {selectedPlayer && (
                <Button
                  onClick={() => setSelectedPlayer(null)}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-2 border-orange-600/50 text-orange-300 hover:bg-orange-900/30 font-mono tracking-wide"
                >
                  [BACK TO PLAYERS]
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Session History View */}
            {selectedPlayer ? (
              <div className="h-[650px] flex gap-4">
                {/* Left Column - Session History */}
                <div className="w-3/4 overflow-y-auto bg-gray-800 rounded-lg border border-gray-600 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2"></h3>
                    
                    {/* Player Profile Information */}
                    <div className="space-y-3 mb-4">
                      {/* Aliases Field */}
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Aliases</div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter known aliases..."
                            value={profileData.aliases}
                            onChange={(e) => setProfileData(prev => ({ ...prev, aliases: e.target.value }))}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                          <button
                            onClick={savePlayerProfile}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Notes</div>
                        <textarea
                          placeholder="Add notes about this player..."
                          rows={3}
                          value={profileData.notes}
                          onChange={(e) => setProfileData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm resize-none"
                        />
                      </div>

                      {/* Main Base Links */}
                      {playerBaseTags.filter((tag: any) => tag.baseType.includes('-main') || tag.baseType.includes('-large')).length > 0 && (
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Main Bases</div>
                          <div className="flex gap-2 flex-wrap">
                            {playerBaseTags
                              .filter((tag: any) => tag.baseType.includes('-main') || tag.baseType.includes('-large'))
                              .map((tag: any) => (
                                <button
                                  key={tag.id}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-blue-200 text-xs rounded-full transition-colors cursor-pointer"
                                  title={`Open ${tag.baseType} base at ${tag.baseCoords || tag.baseName}`}
                                  onClick={() => {
                                    if (onOpenBaseModal) {
                                      onOpenBaseModal(tag.baseId, tag.baseName)
                                      onClose() // Close player modal when opening base modal
                                    }
                                  }}
                                >
                                  📍 {tag.baseName}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* All Base Tags */}
                      {playerBaseTags.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-400 mb-1">All Base Associations</div>
                          <div className="flex gap-2 flex-wrap">
                            {playerBaseTags.map((tag: any) => (
                              <span
                                key={tag.id}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  tag.baseType.startsWith('enemy') 
                                    ? 'bg-red-600 text-red-200' 
                                    : 'bg-green-600 text-green-200'
                                }`}
                                title={`${tag.baseType} base at ${tag.baseCoords || tag.baseName}`}
                              >
                                {tag.baseName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="text-gray-400">Loading...</div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {sessionHistory.map((session: any) => (
                        <div
                          key={session.id}
                          className="bg-gray-700 px-3 py-2 border-b border-gray-600"
                          data-testid={`session-${session.id}`}
                        >
                          <div className="flex justify-between items-center text-xs whitespace-nowrap">
                            <div className="text-white">
                              {new Date(session.startTime).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric'
                              })} {new Date(session.startTime).toLocaleTimeString(undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false
                              })} - {new Date(session.endTime).toLocaleTimeString(undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false
                              })}
                            </div>
                            <div className="text-gray-400 ml-2">
                              {session.durationHours}h
                            </div>
                          </div>
                        </div>
                      ))}
                      {sessionHistory.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                          No data available
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right Section - Heat Map */}
                <div className="flex-1 bg-gray-800 rounded-lg border border-gray-600 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4"></h3>
                  
                  {/* Functional Heat Map with Session Data */}
                  <div className="border border-gray-600 rounded-lg bg-gray-700 relative">
                    <label className="absolute top-0 left-0 text-xs font-medium text-gray-300 pl-0.5"></label>
                    <div className="p-2 pt-3">
                      <div className="flex gap-1">
                        {/* Hour labels column */}
                        <div className="w-8">
                          <div className="text-[10px] text-gray-400 text-center mb-1 h-4"></div>
                          <div style={{height: '200px'}} className="flex flex-col justify-between py-1">
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
                            <div className="bg-gray-800 rounded p-0.5" style={{height: '200px', position: 'relative'}}>
                              <div className="flex flex-col h-full">
                                {renderDayColumn(day)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Heat Map Legend - Online/Offline */}
                      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
                        <span>Player Status:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gray-800 rounded border border-gray-600"></div>
                          <span>Offline</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-white opacity-80 rounded border border-gray-600"></div>
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Player Reports */}
                  <div className="mt-4 bg-gray-700 rounded-lg p-3 flex-1 flex flex-col">
                    <h4 className="text-white font-medium mb-2">Player Reports</h4>
                    <PlayerReportsContent playerName={selectedPlayer} />
                  </div>


                </div>
              </div>
            ) : (
              <>
                {/* Search Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by player name..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      data-testid="input-player-name-search"
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by sessions..."
                      value={baseNumberSearch}
                      onChange={(e) => setBaseNumberSearch(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      data-testid="input-base-number-search"
                    />
                  </div>
                </div>

                {/* Player List */}
                <div className="h-[550px] overflow-y-auto bg-gray-800 rounded-lg border border-gray-600">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="text-gray-400">Loading players...</div>
                    </div>
                  ) : players.length === 0 && premiumPlayers.length === 0 ? (
                    <div className="flex justify-center py-8">
                      <div className="text-gray-400">No players found. External API may be temporarily unavailable.</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {/* Premium Players */}
                      {filteredPremiumPlayers.map((player: any) => (
                        <div
                          key={`premium-${player.id}`}
                          className="p-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                          data-testid={`premium-player-item-${player.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="font-medium text-orange-400">
                                {player.playerName}
                              </span>
                              <span className="text-sm text-orange-600">
                                Premium
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-orange-400">
                              Premium User
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Regular Players */}
                      {filteredPlayers.map((player, index) => {
                        const isOnlineReal = player.isOnlineBM || player.isOnline;
                        const statusColor = isTeammate(player.playerName)
                          ? (isOnlineReal ? 'text-green-400' : 'text-gray-500')
                          : isOnlineReal 
                            ? (isEnemyPlayer(player.playerName) ? 'text-red-400' : 'text-yellow-400')
                            : 'text-gray-400';
                        
                        return (
                          <div
                            key={`${player.playerName}-${index}`}
                            className="p-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                            data-testid={`player-item-${index}`}
                          >
                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedPlayer(player.playerName)}>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      isTeammate(player.playerName)
                                        ? (isOnlineReal ? 'bg-green-500' : 'bg-gray-600')
                                        : isOnlineReal 
                                          ? (isEnemyPlayer(player.playerName) ? 'bg-red-500' : 'bg-yellow-500')
                                          : 'bg-gray-500'
                                    }`}
                                    data-testid={`status-indicator-${index}`}
                                  />
                                  {player.isOnlineBM && (
                                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full border border-gray-800" title="Live BattleMetrics data" />
                                  )}
                                </div>
                                <span
                                  className={`font-medium ${statusColor}`}
                                  data-testid={`player-name-${index}`}
                                >
                                  {player.playerName}
                                </span>
                                {isTeammate(player.playerName) && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded-full border border-green-600/30">
                                    TEAMMATE
                                  </span>
                                )}
                                {player.battlemetricsId && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-600/30">
                                    LIVE
                                  </span>
                                )}
                                <span
                                  className={`text-sm ${statusColor}`}
                                  data-testid={`player-status-${index}`}
                                >
                                  {isOnlineReal ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm ${statusColor}`} data-testid={`online-status-${index}`}>
                                {isOnlineReal ? (
                                  <span className="flex items-center gap-1">
                                    {player.isOnlineBM ? 'Live on Server' : 'Currently Online'}
                                    {player.isOnlineBM && <Monitor className="w-3 h-3" />}
                                  </span>
                                ) : 'Offline'}
                              </div>
                              {player.lastSeenBM && !isOnlineReal && (
                                <div className="text-xs text-gray-500">
                                  Last seen: {new Date(player.lastSeenBM).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Results Summary */}
                {!isLoading && (
                  <div className="text-sm text-gray-400 text-center space-y-1">
                    <div>
                      Showing {filteredPlayers.length + filteredPremiumPlayers.length} players 
                      ({filteredPlayers.length} regular, {filteredPremiumPlayers.length} premium)
                    </div>
                    {activeServer && (
                      <div className="text-xs text-blue-400">
                        Live data from: {activeServer.name} ({battlemetricsPlayers.filter(p => p.isOnline).length} online)
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Premium Player Creation Dialog */}
      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400" />
              Create Premium Player Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Player Name
              </label>
              <Input
                value={premiumPlayerName}
                onChange={(e) => setPremiumPlayerName(e.target.value)}
                placeholder="Enter premium player name..."
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && createPremiumPlayer()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowPremiumDialog(false)}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={createPremiumPlayer}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!premiumPlayerName.trim()}
              >
                Create Premium Player
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}