import { memo, useMemo } from 'react'
import { MapPin, Home, Shield, Wheat, Castle, Tent } from 'lucide-react'

const ICON_MAP = {
  'friendly-main': Castle,
  'friendly-flank': Shield,
  'friendly-farm': Wheat,
  'enemy-small': Tent,
  'enemy-medium': Home,
  'enemy-large': Castle,
  'enemy-flank': Shield,
  'enemy-farm': Wheat
}

interface TacticalMapLocationProps {
  location: any
  isSelected: boolean
  onlinePlayerCount: number
  premiumPlayerCount: number
  offlinePlayerCount: number
  groupColor: string | null
  onClick: (location: any) => void
  onContextMenu: (e: React.MouseEvent, location: any) => void
}

const DecayingIcon = memo(() => (
  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 21h18v-2H3v2zm0-4h2v-4h2v4h2v-4h2v4h2v-4h2v4h2v-4h2v4h2v-4h2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v12zm4-12h2v2H7V5zm4 0h2v2h-2V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9z" opacity="0.7"/>
    <path d="M8 17l-2 2v2h3v-4zm8 0v4h3v-2l-2-2zm-4-8l-1 2h2l-1-2z" />
    <path d="M6 13l-1.5 1.5M18 13l1.5 1.5M9 16l-1 1M15 16l1 1" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
  </svg>
))

const TowerIcon = memo(() => (
  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 2v2h1v2H6v2h1v12h10V8h1V6h-3V4h1V2h-8zm7 16H9V8h6v10zm-3-8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
  </svg>
))

const getIcon = (type: string) => {
  if (type === 'enemy-decaying') return <DecayingIcon />
  if (type === 'enemy-tower') return <TowerIcon />
  const Icon = ICON_MAP[type] || MapPin
  return <Icon className="h-8 w-8" />
}

const getColor = (type: string, location = null) => {
  if (location?.abandoned) return 'text-gray-400'
  if (type.startsWith('report')) return 'text-purple-600'
  return type.startsWith('friendly') ? 'text-green-600' : 'text-red-600'
}

const LocationName = memo(({ name, className = '' }: { name: string; className?: string }) => {
  const match = name.match(/^([A-Z]+\d+)(\(\d+\))?/)
  if (match) {
    const [, base, duplicate] = match
    return (
      <>
        <span className={className}>{base}</span>
        {duplicate && (
          <span className="text-white/90 align-super" style={{fontSize: '0.65em', marginLeft: '2px'}}>
            {duplicate}
          </span>
        )}
      </>
    )
  }
  return <span className={className}>{name}</span>
})

const TacticalMapLocation = memo(({ 
  location, 
  isSelected, 
  onlinePlayerCount, 
  premiumPlayerCount, 
  offlinePlayerCount,
  groupColor,
  onClick,
  onContextMenu
}: TacticalMapLocationProps) => {
  const locationStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${location.x}%`,
    top: `${location.y}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: location.type.startsWith('report') ? 2 : 3,
    cursor: 'pointer'
  }), [location.x, location.y, location.type])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(location)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    onContextMenu(e, location)
  }

  return (
    <div 
      style={locationStyle}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="group"
    >
      {/* Group color ring */}
      {groupColor && (
        <div 
          className="absolute rounded-full"
          style={{
            width: '20px',
            height: '20px',
            border: `2px solid ${groupColor}`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: -1,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Online player count display - green circle */}
      {location.type.startsWith("enemy") && onlinePlayerCount > 0 && (
        <div 
          className="absolute text-xs font-bold text-green-400 bg-black/80 rounded-full flex items-center justify-center border border-green-400/50"
          style={{
            width: "6px",
            height: "6px",
            left: "-6px",
            top: "-6px",
            transform: "translateY(-50%)",
            zIndex: 1,
            fontSize: "5px"
          }}
        >
          {onlinePlayerCount}
        </div>
      )}

      {/* Premium player count display - gold circle */}
      {location.type.startsWith("enemy") && premiumPlayerCount > 0 && (
        <div 
          className="absolute text-xs font-bold text-yellow-400 bg-black/80 rounded-full flex items-center justify-center border border-yellow-400/50"
          style={{
            width: "6px",
            height: "6px",
            left: "6px",
            top: "-6px",
            transform: "translateY(-50%)",
            zIndex: 1,
            fontSize: "5px"
          }}
        >
          {premiumPlayerCount}
        </div>
      )}

      {/* Offline player count display - grey circle */}
      {location.type.startsWith("enemy") && offlinePlayerCount > 0 && (
        <div 
          className="absolute text-xs font-bold text-gray-400 bg-black/80 rounded-full flex items-center justify-center border border-gray-400/50"
          style={{
            width: "6px",
            height: "6px",
            left: "-6px",
            top: "6px",
            transform: "translateY(-50%)",
            zIndex: 1,
            fontSize: "5px"
          }}
        >
          {offlinePlayerCount}
        </div>
      )}
      
      <div className={`bg-gray-700 rounded-full shadow-md border border-gray-600 flex items-center justify-center ${location.abandoned ? 'opacity-40' : ''} ${
        location.type.startsWith('report') ? 'p-0.5 scale-[0.375]' : 'p-0.5 scale-75'
      }`}>
        <div className={`${getColor(location.type, location)} flex items-center justify-center`}>
          {getIcon(location.type)}
        </div>
      </div>
      
      {/* Selection ring */}
      {isSelected && (
        <div className="absolute pointer-events-none" style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: location.type.startsWith('report') ? '10px' : '20px',
          height: location.type.startsWith('report') ? '10px' : '20px',
          zIndex: 5
        }}>
          <div className="selection-ring" style={{ width: '100%', height: '100%' }}>
            <svg width={location.type.startsWith('report') ? "10" : "20"} height={location.type.startsWith('report') ? "10" : "20"} viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`greyGradient-${location.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D8D8D8"/>
                  <stop offset="50%" stopColor="#C0C0C0"/>
                  <stop offset="100%" stopColor="#B0B0B0"/>
                </linearGradient>
                <linearGradient id={`diamondGradient-${location.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#606060"/>
                  <stop offset="50%" stopColor="#303030"/>
                  <stop offset="100%" stopColor="#101010"/>
                </linearGradient>
              </defs>
              <path d="M 150,30 A 120,120 0 1,0 150,270 A 120,120 0 1,0 150,30 Z M 150,47 A 103,103 0 1,1 150,253 A 103,103 0 1,1 150,47 Z" fill={`url(#greyGradient-${location.id})`} fillRule="evenodd"/>
              <circle cx="150" cy="150" r="120" fill="none" stroke="#000000" strokeWidth="5"/>
              <circle cx="150" cy="150" r="103" fill="none" stroke="#000000" strokeWidth="5"/>
              <g transform="translate(150, 30)">
                <path d="M 0,-18 L 21,0 L 0,36 L -21,0 Z" fill={`url(#diamondGradient-${location.id})`} stroke="#000000" strokeWidth="5"/>
                <path d="M 0,-14 L 12,-2 L 0,8 L -12,-2 Z" fill="#FFFFFF" opacity="0.15"/>
              </g>
              <g transform="translate(270, 150) rotate(90)">
                <path d="M 0,-18 L 21,0 L 0,36 L -21,0 Z" fill={`url(#diamondGradient-${location.id})`} stroke="#000000" strokeWidth="5"/>
                <path d="M 0,-14 L 12,-2 L 0,8 L -12,-2 Z" fill="#FFFFFF" opacity="0.15"/>
              </g>
              <g transform="translate(150, 270) rotate(180)">
                <path d="M 0,-18 L 21,0 L 0,36 L -21,0 Z" fill={`url(#diamondGradient-${location.id})`} stroke="#000000" strokeWidth="5"/>
                <path d="M 0,-14 L 12,-2 L 0,8 L -12,-2 Z" fill="#FFFFFF" opacity="0.15"/>
              </g>
              <g transform="translate(30, 150) rotate(270)">
                <path d="M 0,-18 L 21,0 L 0,36 L -21,0 Z" fill={`url(#diamondGradient-${location.id})`} stroke="#000000" strokeWidth="5"/>
                <path d="M 0,-14 L 12,-2 L 0,8 L -12,-2 Z" fill="#FFFFFF" opacity="0.15"/>
              </g>
            </svg>
          </div>
        </div>
      )}
      
      {/* Report outcome badges */}
      {location.type.startsWith('report') && location.outcome && location.outcome !== 'neutral' && (
        <div className="absolute -top-1 -right-1" style={{ zIndex: 10 }}>
          {location.outcome === 'won' ? (
            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-white" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
              </svg>
            </div>
          ) : (
            <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-white" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.28 3.22a.75.75 0 00-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 101.06 1.06L8 9.06l3.72 3.72a.75.75 0 101.06-1.06L9.06 8l3.72-3.72a.75.75 0 00-1.06-1.06L8 6.94 4.28 3.22z"/>
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Roof camper badge */}
      {location.roofCamper && (
        <div className="absolute -top-1 -left-1" style={{ zIndex: 10 }}>
          <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center" title="Roof Camper">
            <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>
      )}
      
      {/* Label on hover/selection */}
      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1 py-0.5 bg-black/80 text-white text-xs rounded whitespace-nowrap transition-opacity duration-200 pointer-events-none ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <LocationName name={location.name} />
      </div>
    </div>
  )
})

TacticalMapLocation.displayName = 'TacticalMapLocation'

export default TacticalMapLocation