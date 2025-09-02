import { memo, useState, useEffect } from 'react'
import WipeCountdownTimer from './WipeCountdownTimer'
import { Calculator, Users, FileText, TrendingUp, Settings, Bot, Target, Wifi, WifiOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { TeamManagementModal } from './TeamManagementModal'
import { PlayerModal } from './PlayerModal'
import AdminModal from './AdminModal'

interface TacticalMapToolbarProps {
  onButtonClick: (buttonType: string) => void
  onMenuOptionClick?: (option: string) => void
  progressionDisplay: {
    enabled: boolean
    inGroupWeapon: string
    aloneWeapon: string
    counteringWeapon: string
  }
  onWipeCountdownChange?: (countdown: any) => void
}

const TacticalMapToolbar = memo(({ onButtonClick, onMenuOptionClick, progressionDisplay, onWipeCountdownChange }: TacticalMapToolbarProps) => {
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [teamManagementModalOpen, setTeamManagementModalOpen] = useState(false)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [adminModalOpen, setAdminModalOpen] = useState(false)

  // Fetch active server status for BattleMetrics integration
  const { data: activeServer } = useQuery({
    queryKey: ['/api/battlemetrics/servers/active'],
    refetchInterval: 60000 // Check every minute
  })


  // Close menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showMenuDropdown && !target?.closest('.menu-dropdown-container')) {
        setShowMenuDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenuDropdown])

  const handleButtonClick = (buttonType: string) => {
    onButtonClick(buttonType)
  }

  const handleMenuOptionClick = (option: string) => {
    if (onMenuOptionClick) {
      onMenuOptionClick(option)
    }
    // Close dropdown after a small delay to ensure the click event processes
    setTimeout(() => {
      setShowMenuDropdown(false)
    }, 10)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-0 m-0" style={{top: 0, left: 0, right: 0, position: 'fixed'}}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-lg shadow-2xl border-2 border-orange-600/50">
          <div className="bg-gradient-to-r from-orange-900/30 via-gray-800 to-orange-900/30 p-1">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {/* BattleMetrics Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-gray-800/60 to-gray-900 rounded shadow-lg border-2 border-gray-600/50">
                    {activeServer ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">
                          {activeServer.name?.substring(0, 20)}...
                        </span>
                        <span className="text-green-300 text-xs">
                          ({activeServer.players || 0}/{activeServer.maxPlayers || 0})
                        </span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500 text-sm">No Server</span>
                      </>
                    )}
                  </div>

                  {['Logs', 'Progression', 'Players', 'Teams'].map((btn) => (
                    <button 
                      key={btn} 
                      onClick={() => handleButtonClick(btn)}
                      data-testid={btn === 'Players' ? 'button-open-player-modal' : btn === 'Logs' ? 'button-open-logs-modal' : undefined} 
                      className="px-4 py-2 bg-gradient-to-b from-orange-800/60 to-orange-900 hover:from-orange-700/80 hover:to-orange-800 text-orange-100 font-bold rounded shadow-lg border-2 border-orange-600/50 transition-all duration-200 hover:shadow-xl hover:shadow-orange-900/50 tracking-wide"
                    >
                      [{btn.toUpperCase()}]
                    </button>
                  ))}
                </div>
                <div className="flex items-center">
                  <WipeCountdownTimer onCountdownChange={onWipeCountdownChange} />
                </div>
                <div className="flex gap-2">
                  {['Gene Calculator', 'Turret Control'].map((btn) => (
                    <button 
                      key={btn} 
                      onClick={() => handleButtonClick(btn)}
                      className="px-4 py-2 bg-gradient-to-b from-orange-800/60 to-orange-900 hover:from-orange-700/80 hover:to-orange-800 text-orange-100 font-bold rounded shadow-lg border-2 border-orange-600/50 transition-all duration-200 hover:shadow-xl hover:shadow-orange-900/50 tracking-wide"
                    >
                      [{btn.toUpperCase()}]
                    </button>
                  ))}
                  <div className="relative menu-dropdown-container">
                    <button 
                      onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                      className="px-4 py-2 bg-gradient-to-b from-orange-800/60 to-orange-900 hover:from-orange-700/80 hover:to-orange-800 text-orange-100 font-bold rounded shadow-lg border-2 border-orange-600/50 transition-all duration-200 hover:shadow-xl hover:shadow-orange-900/50 tracking-wide"
                      data-testid="button-menu-dropdown"
                    >
                      [MENU]
                    </button>
                    {/* Menu Dropdown */}
                    {showMenuDropdown && (
                      <div className="absolute top-full right-0 mt-1 bg-gray-900/95 border border-orange-600/50 rounded shadow-xl z-[60] min-w-40">
                        {['Settings', 'Team management', 'Bot control', 'Admin control'].map((option) => (
                          <button
                            key={option}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (option === 'Admin control') {
                                setAdminModalOpen(true)
                              } else {
                                handleMenuOptionClick(option)
                              }
                            }}
                            className="block w-full text-left px-3 py-2 text-orange-100 hover:bg-orange-800/50 transition-colors duration-150 first:rounded-t last:rounded-b"
                            data-testid={`menu-option-${option.toLowerCase().replace(' ', '-')}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-70"></div>
        </div>
      </div>
      <PlayerModal 
        isOpen={playerModalOpen} 
        onClose={() => setPlayerModalOpen(false)} 
      />

      <AdminModal 
        isOpen={adminModalOpen} 
        onClose={() => setAdminModalOpen(false)} 
      />
    </div>
  )
})

TacticalMapToolbar.displayName = 'TacticalMapToolbar'

export default TacticalMapToolbar