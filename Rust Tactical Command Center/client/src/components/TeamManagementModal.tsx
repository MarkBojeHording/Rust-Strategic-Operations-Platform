import { useState, useRef } from 'react'
import { X, Plus, ChevronLeft, ChevronRight, Search, Monitor, CheckCircle, AlertCircle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'

interface Squad {
  id: string
  name: string
  slots: PlayerSlot[]
}

interface PlayerSlot {
  id: string
  userName?: string
  inGameName?: string
  permission: 'member' | 'raider' | 'admin'
  isEmpty: boolean
}

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TeamManagementModal({ isOpen, onClose }: TeamManagementModalProps) {
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedMapOption, setSelectedMapOption] = useState('')
  const [serverSearch, setServerSearch] = useState('')
  const [showServerSearch, setShowServerSearch] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [squads, setSquads] = useState<Squad[]>([
    {
      id: '1',
      name: 'Squad 1',
      slots: Array.from({ length: 8 }, (_, i) => ({
        id: `squad-1-${i}`,
        isEmpty: true,
        permission: 'member' as const
      }))
    }
  ])

  // Fetch tracked servers
  const { data: trackedServers = [] } = useQuery({
    queryKey: ['/api/battlemetrics/servers'],
    enabled: isOpen
  })

  // Fetch active server info
  const { data: activeServer } = useQuery({
    queryKey: ['/api/battlemetrics/servers/active'],
    enabled: isOpen
  })

  // Search servers mutation
  const searchServersMutation = useMutation({
    mutationFn: async (query: string) => {
      return apiRequest('GET', `/api/battlemetrics/search?query=${encodeURIComponent(query)}`)
    }
  })

  // Add server mutation
  const addServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      return apiRequest('POST', '/api/battlemetrics/servers', { serverId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/battlemetrics/servers'] })
      setShowServerSearch(false)
      setServerSearch('')
    }
  })

  // Select server mutation
  const selectServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      return apiRequest('POST', `/api/battlemetrics/servers/${serverId}/select`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/battlemetrics/servers/active'] })
    }
  })

  if (!isOpen) return null

  const addSquad = () => {
    const newSquad: Squad = {
      id: `squad-${Date.now()}`,
      name: `Squad ${squads.length + 1}`,
      slots: Array.from({ length: 8 }, (_, i) => ({
        id: `squad-${Date.now()}-slot-${i}`,
        isEmpty: true,
        permission: 'member' as const
      }))
    }
    setSquads([...squads, newSquad])
  }

  const removeSquad = (squadId: string) => {
    setSquads(squads.filter(squad => squad.id !== squadId))
  }

  const updateSlot = (squadId: string, slotId: string, updates: Partial<PlayerSlot>) => {
    setSquads(squads.map(squad => 
      squad.id === squadId 
        ? {
            ...squad,
            slots: squad.slots.map(slot => 
              slot.id === slotId ? { ...slot, ...updates } : slot
            )
          }
        : squad
    ))
  }

  const addPlayerToSlot = (squadId: string, slotId: string, userName: string, inGameName: string) => {
    updateSlot(squadId, slotId, {
      userName,
      inGameName,
      isEmpty: false
    })
  }

  const removePlayerFromSlot = (squadId: string, slotId: string) => {
    updateSlot(squadId, slotId, {
      userName: undefined,
      inGameName: undefined,
      isEmpty: true,
      permission: 'member'
    })
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'text-red-400'
      case 'raider': return 'text-blue-400'
      case 'member': return 'text-green-400'
      default: return 'text-green-400'
    }
  }

  // Toggle server info visibility when server is selected
  const toggleServerInfo = (serverValue: string) => {
    setSelectedServer(serverValue)
  }

  // Handle map option selection with visual active state
  const selectMapOption = (optionId: string) => {
    setSelectedMapOption(selectedMapOption === optionId ? '' : optionId)
  }

  // Handle slot actions (invite/remove functionality)
  const toggleSlot = (squadId: string, slotId: string) => {
    const squad = squads.find(s => s.id === squadId)
    const slot = squad?.slots.find(s => s.id === slotId)
    
    if (slot?.isEmpty) {
      // Invite functionality - could open a player selection modal in the future
      console.log('Invite player to slot:', squadId, slotId)
      // TODO: Implement player selection/invitation system
    } else {
      // Remove player
      removePlayerFromSlot(squadId, slotId)
    }
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      })
    }
  }

  const handleEraseTeamData = () => {
    // Handle erasing all team data
    console.log('Erasing all team data...')
  }

  const handleEraseImages = () => {
    // Handle erasing all images
    console.log('Erasing all images...')
  }

  const handleEraseGeneticData = async () => {
    try {
      const response = await fetch('/api/genetic-data', { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log('All genetic data has been successfully erased')
        // Optional: Show success notification here if you have a toast system
      } else {
        console.error('Failed to erase genetic data')
      }
    } catch (error) {
      console.error('Error erasing genetic data:', error)
    }
  }

  const handleRemoveMap = () => {
    // Handle removing map
    console.log('Removing map...')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div 
        className="bg-gray-900 border border-orange-600/50 shadow-2xl"
        style={{ width: '840px', height: '540px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-orange-600/30 bg-black/30">
          <h2 className="text-lg font-bold text-orange-400 font-mono">[TEAM MANAGEMENT]</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            data-testid="button-close-team-management"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col h-full">
          {/* Top Section - 50% */}
          <div className="flex h-1/2">
            {/* Server Information Section - Fixed Width */}
            <div className="w-[235px] flex-shrink-0 bg-gray-800 border-r border-gray-600 flex flex-col">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide p-2 bg-black/30 border-b border-gray-600">
                Server Information
              </h3>
              
              <div className="p-3 space-y-3">
                {/* Active Server Display */}
                {activeServer ? (
                  <div className="bg-gray-900 border border-green-600/50 rounded p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-xs font-semibold">Active Server</span>
                    </div>
                    <div className="text-gray-200 text-xs font-medium mb-1">{activeServer.name}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Players:</span>
                        <span className="text-green-400">{activeServer.players || 0}/{activeServer.maxPlayers || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Status:</span>
                        <span className={activeServer.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                          {activeServer.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-orange-600/50 rounded p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-400" />
                      <span className="text-orange-400 text-xs font-semibold">No Active Server</span>
                    </div>
                    <div className="text-gray-400 text-xs">Select a server to track player activity</div>
                  </div>
                )}

                {/* Server Management */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-400 text-xs">Tracked Servers</label>
                    <button
                      onClick={() => setShowServerSearch(!showServerSearch)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  
                  {/* Server Search */}
                  {showServerSearch && (
                    <div className="mb-2 space-y-2">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Search BattleMetrics servers..."
                          value={serverSearch}
                          onChange={(e) => setServerSearch(e.target.value)}
                          className="flex-1 bg-gray-900 border border-gray-600 text-gray-200 p-1 text-xs rounded"
                        />
                        <button
                          onClick={() => searchServersMutation.mutate(serverSearch)}
                          disabled={!serverSearch.trim() || searchServersMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs px-2 py-1 rounded transition-colors"
                        >
                          <Search className="h-3 w-3" />
                        </button>
                      </div>
                      
                      {/* Search Results */}
                      {searchServersMutation.data && (
                        <div className="max-h-32 overflow-y-auto bg-gray-800 border border-gray-600 rounded">
                          {searchServersMutation.data.data?.map((server: any) => (
                            <div key={server.id} className="p-1 hover:bg-gray-700 text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-gray-200 font-medium">{server.attributes.name}</div>
                                  <div className="text-gray-400">{server.attributes.players}/{server.attributes.maxPlayers} players</div>
                                </div>
                                <button
                                  onClick={() => addServerMutation.mutate(server.id)}
                                  disabled={addServerMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-1 py-0.5 rounded"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tracked Servers List */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {trackedServers.map((server: any) => (
                      <div key={server.id} className="bg-gray-900 border border-gray-600 rounded p-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-200 text-xs font-medium truncate">{server.name}</div>
                            <div className="text-gray-400 text-xs">
                              {server.players || 0}/{server.maxPlayers || 0} players
                            </div>
                          </div>
                          <button
                            onClick={() => selectServerMutation.mutate(server.battlemetricsId)}
                            disabled={selectServerMutation.isPending || activeServer?.battlemetricsId === server.battlemetricsId}
                            className={`text-xs px-1 py-0.5 rounded transition-colors ${
                              activeServer?.battlemetricsId === server.battlemetricsId
                                ? 'bg-green-600 text-green-200'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {activeServer?.battlemetricsId === server.battlemetricsId ? 'Active' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {trackedServers.length === 0 && (
                      <div className="text-gray-400 text-xs text-center py-2">
                        No servers tracked. Search and add servers above.
                      </div>
                    )}
                  </div>
                </div>

                {activeServer && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Player Count:</span>
                        <span className="text-green-400">{activeServer.players || 0}/{activeServer.maxPlayers || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Server Status:</span>
                        <span className={activeServer.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                          {activeServer.status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-gray-400 text-xs font-semibold mb-2">Map Display</div>
                      
                      <div className="space-y-2">
                        <div 
                          className={`p-2 rounded flex items-center gap-2 cursor-pointer transition-all ${
                            selectedMapOption === 'fetch-server' 
                              ? 'bg-green-400/10 border border-green-400' 
                              : 'bg-gray-900 border border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => selectMapOption('fetch-server')}
                        >
                          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                            No Map
                          </div>
                          <div className="flex-1">
                            <div className="text-gray-200 text-xs">Fetch from Server</div>
                            <div className={`text-xs ${selectedMapOption === 'fetch-server' ? 'text-green-400' : 'text-gray-500'}`}>
                              {selectedMapOption === 'fetch-server' ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                          <button 
                            className={`px-2 py-1 border rounded text-xs transition-all ${
                              selectedMapOption === 'fetch-server'
                                ? 'bg-green-400 border-green-400 text-black hover:bg-green-300'
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Fetch
                          </button>
                        </div>
                        
                        <div 
                          className={`p-2 rounded flex items-center gap-2 cursor-pointer transition-all ${
                            selectedMapOption === 'upload-image' 
                              ? 'bg-green-400/10 border border-green-400' 
                              : 'bg-gray-900 border border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => selectMapOption('upload-image')}
                        >
                          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                            No Map
                          </div>
                          <div className="flex-1">
                            <div className="text-gray-200 text-xs">Upload Image</div>
                            <div className={`text-xs ${selectedMapOption === 'upload-image' ? 'text-green-400' : 'text-gray-500'}`}>
                              {selectedMapOption === 'upload-image' ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                          <button 
                            className={`px-2 py-1 border rounded text-xs transition-all ${
                              selectedMapOption === 'upload-image'
                                ? 'bg-green-400 border-green-400 text-black hover:bg-green-300'
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Upload
                          </button>
                        </div>
                        
                        <div 
                          className={`p-2 rounded flex items-center gap-2 cursor-pointer transition-all ${
                            selectedMapOption === 'fetch-bot' 
                              ? 'bg-green-400/10 border border-green-400' 
                              : 'bg-gray-900 border border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => selectMapOption('fetch-bot')}
                        >
                          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                            No Map
                          </div>
                          <div className="flex-1">
                            <div className="text-gray-200 text-xs">Fetch from Bot</div>
                            <div className={`text-xs ${selectedMapOption === 'fetch-bot' ? 'text-green-400' : 'text-gray-500'}`}>
                              {selectedMapOption === 'fetch-bot' ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                          <button 
                            className={`px-2 py-1 border rounded text-xs transition-all ${
                              selectedMapOption === 'fetch-bot'
                                ? 'bg-green-400 border-green-400 text-black hover:bg-green-300'
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Fetch
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Teammate Section - Remaining Space */}
            <div className="flex-1 bg-gray-900 flex flex-col relative min-w-0">
              <div className="flex items-center justify-between p-2 bg-black/30 border-b border-gray-600">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Squad Management
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={scrollLeft}
                    className="text-gray-400 hover:text-gray-200 transition-colors p-1"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={scrollRight}
                    className="text-gray-400 hover:text-gray-200 transition-colors p-1"
                    title="Scroll Right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Squads Container */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden p-1 scroll-smooth"
                style={{ maxWidth: 'calc(840px - 235px - 20px)' }}
              >
                <div className="flex h-full">
                  {/* Squad Cards */}
                  {squads.map((squad) => (
                    <div key={squad.id} className="min-w-[168px] w-[168px] bg-gray-800 border-r border-gray-600 flex flex-col flex-shrink-0">
                    {/* Squad Header */}
                    <div className="bg-black/30 p-1.5 border-b border-gray-600 flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-semibold">{squad.name}</span>
                      <button
                        onClick={() => removeSquad(squad.id)}
                        className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Squad Slots */}
                    <div className="flex-1 flex flex-col">
                      {/* Regular Squad Slots */}
                      {squad.slots.map((slot, index) => {
                        
                        return (
                          <div key={slot.id} data-slot-id={slot.id} className="border-b border-gray-600 flex items-center p-0.5 min-h-[28px]">
                            <div className="flex-1 flex items-center gap-0.5">
                              {slot.isEmpty ? (
                                <>
                                  <div className="flex-1 flex gap-0.5">
                                    <div className="flex-1 bg-gray-900 border border-gray-600 rounded px-1 py-0.5">
                                      <input
                                        type="text"
                                        placeholder="Username"
                                        className="w-full bg-transparent text-gray-200 text-xs placeholder-gray-500 border-none outline-none"
                                        onChange={(e) => {
                                          const slotElement = e.target.closest('[data-slot-id]') as HTMLElement
                                          if (slotElement) {
                                            slotElement.setAttribute('data-username', e.target.value)
                                          }
                                        }}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            const target = e.target as HTMLInputElement
                                            const nextInput = target.parentElement?.parentElement?.querySelector('input[placeholder="In-Game Name"]') as HTMLInputElement
                                            nextInput?.focus()
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 bg-gray-900 border border-gray-600 rounded px-1 py-0.5">
                                      <input
                                        type="text"
                                        placeholder="In-Game Name"
                                        className="w-full bg-transparent text-gray-200 text-xs placeholder-gray-500 border-none outline-none"
                                        onChange={(e) => {
                                          const slotElement = e.target.closest('[data-slot-id]') as HTMLElement
                                          if (slotElement) {
                                            slotElement.setAttribute('data-ingame-name', e.target.value)
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <select
                                    value={slot.permission}
                                    onChange={(e) => updateSlot(squad.id, slot.id, { permission: e.target.value as 'member' | 'raider' | 'admin' })}
                                    className={`bg-gray-900 border border-gray-600 text-xs p-1 rounded cursor-pointer w-20 ${getPermissionColor(slot.permission)}`}
                                  >
                                    <option value="member">Member</option>
                                    <option value="raider">Raider</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      const slotElement = document.querySelector(`[data-slot-id="${slot.id}"]`) as HTMLElement
                                      const username = slotElement?.getAttribute('data-username') || ''
                                      const ingameName = slotElement?.getAttribute('data-ingame-name') || ''
                                      if (username.trim() || ingameName.trim()) {
                                        addPlayerToSlot(squad.id, slot.id, username.trim(), ingameName.trim())
                                      }
                                    }}
                                    className="bg-gray-700 border border-gray-600 text-gray-400 text-xs px-1.5 py-0.5 rounded hover:bg-gray-600 hover:text-gray-200"
                                  >
                                    Add
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 flex gap-0.5">
                                    <div className="flex-1 bg-gray-900 border border-gray-600 rounded px-1 py-0.5">
                                      <div className="text-gray-200 text-xs font-medium">{slot.userName || 'No Username'}</div>
                                    </div>
                                    <div className="flex-1 bg-gray-900 border border-gray-600 rounded px-1 py-0.5">
                                      <div className="text-gray-200 text-xs font-medium">{slot.inGameName || 'No In-Game Name'}</div>
                                    </div>
                                  </div>
                                  <select
                                    value={slot.permission}
                                    onChange={(e) => updateSlot(squad.id, slot.id, { permission: e.target.value as 'member' | 'raider' | 'admin' })}
                                    className={`bg-gray-900 border border-gray-600 text-xs p-1 rounded cursor-pointer w-20 ${getPermissionColor(slot.permission)}`}
                                  >
                                    <option value="member">Member</option>
                                    <option value="raider">Raider</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <button
                                    onClick={() => removePlayerFromSlot(squad.id, slot.id)}
                                    className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-700"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                  {/* Add Squad Button */}
                  <div className="min-w-[60px] w-[60px] bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <button
                      onClick={addSquad}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="Add Squad"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Options Section - 50% */}
          <div className="h-1/2 bg-gray-800 border-t border-gray-600 flex flex-col relative">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide p-2 bg-black/30 border-b border-gray-600">
              Team Options
            </h3>
            
            {/* Team Data Management Options */}
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-8">
                <span className="text-gray-200 text-xs w-32">Erase all team data</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-0.5 rounded transition-colors">
                      Erase
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-orange-600/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-orange-400">Confirm Team Data Erasure</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to erase all team data? This action cannot be undone and will permanently delete all team information, squads, and player assignments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEraseTeamData} className="bg-red-600 hover:bg-red-700 text-white">
                        Erase Team Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex items-center gap-8">
                <span className="text-gray-200 text-xs w-32">Erase all images</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-0.5 rounded transition-colors">
                      Erase
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-orange-600/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-orange-400">Confirm Image Erasure</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to erase all images? This will permanently delete all player profile images, base screenshots, and other uploaded images.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEraseImages} className="bg-red-600 hover:bg-red-700 text-white">
                        Erase All Images
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex items-center gap-8">
                <span className="text-gray-200 text-xs w-32">Erase all genetic data</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-0.5 rounded transition-colors">
                      Erase
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-orange-600/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-orange-400">Confirm Genetic Data Erasure</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to erase all genetic data? This will permanently delete all player genetic information, breeding records, and genetic analysis data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEraseGeneticData} className="bg-red-600 hover:bg-red-700 text-white">
                        Erase Genetic Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex items-center gap-8">
                <span className="text-gray-200 text-xs w-32">Remove map</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-0.5 rounded transition-colors">
                      Erase
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-orange-600/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-orange-400">Confirm Map Removal</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to remove the map? This will permanently delete all base locations, markers, and map-related data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveMap} className="bg-red-600 hover:bg-red-700 text-white">
                        Remove Map
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Permission Legend */}
            <div className="absolute bottom-4 right-2 bg-black/80 border border-gray-600 rounded p-2 text-xs text-gray-400 max-w-xs z-10">
              <div className="mb-1">
                <span className="text-green-400 font-semibold">Member</span> - Can make or view report and bases but not edit or delete them
              </div>
              <div className="mb-1">
                <span className="text-blue-400 font-semibold">Raiders</span> - Can make, view, edit or delete reports and bases
              </div>
              <div>
                <span className="text-red-400 font-semibold">Admin</span> - Can make changes to Team wide settings and delete all data. Avoid giving admin roll
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}