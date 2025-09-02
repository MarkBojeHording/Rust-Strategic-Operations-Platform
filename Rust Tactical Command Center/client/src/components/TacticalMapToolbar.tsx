import { memo, useState, useEffect } from 'react'
import WipeCountdownTimer from './WipeCountdownTimer'

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
                  {['Logs', 'Progression', 'Teams', 'Players'].map((btn) => (
                    btn === 'Progression' ? (
                      <div key={btn} className="relative">
                        <button 
                          onClick={() => handleButtonClick('Progression')}
                          data-testid="button-open-progression-modal"
                          className="px-4 py-2 bg-gradient-to-b from-orange-800/60 to-orange-900 hover:from-orange-700/80 hover:to-orange-800 text-orange-100 font-bold rounded shadow-lg border-2 border-orange-600/50 transition-all duration-200 hover:shadow-xl hover:shadow-orange-900/50 tracking-wide"
                        >
                          [PROGRESSION]
                        </button>
                        {/* Progression Display Container */}
                        {progressionDisplay.enabled && (
                          <div className="absolute top-full left-0 mt-1 bg-gray-900/95 border border-orange-600/50 rounded px-2 py-1 text-orange-100 font-mono text-xs leading-none whitespace-nowrap z-[60]">
                            <div className="text-orange-400">Recommended kit level:</div>
                            <div>In a group: <span className="text-orange-200">{progressionDisplay.inGroupWeapon}</span></div>
                            <div>When alone: <span className="text-orange-200">{progressionDisplay.aloneWeapon}</span></div>
                            <div>Countering: <span className="text-orange-200">{progressionDisplay.counteringWeapon}</span></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        key={btn} 
                        onClick={() => handleButtonClick(btn)}
                        data-testid={btn === 'Players' ? 'button-open-player-modal' : btn === 'Logs' ? 'button-open-logs-modal' : undefined} 
                        className="px-4 py-2 bg-gradient-to-b from-orange-800/60 to-orange-900 hover:from-orange-700/80 hover:to-orange-800 text-orange-100 font-bold rounded shadow-lg border-2 border-orange-600/50 transition-all duration-200 hover:shadow-xl hover:shadow-orange-900/50 tracking-wide"
                      >
                        [{btn.toUpperCase()}]
                      </button>
                    )
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
                              handleMenuOptionClick(option)
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
    </div>
  )
})

TacticalMapToolbar.displayName = 'TacticalMapToolbar'

export default TacticalMapToolbar