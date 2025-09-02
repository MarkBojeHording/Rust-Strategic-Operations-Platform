import { memo } from 'react'
// TODO: Add the main map asset file - map_raw_normalized (2)_1755133962532.png
// Using a placeholder until the asset is available
const rustMapImage = null

interface TacticalMapBackgroundProps {
  mapDimensions: { width: number; height: number }
}

const TacticalMapBackground = memo(({ mapDimensions }: TacticalMapBackgroundProps) => {
  const { width, height } = mapDimensions

  return (
    <div className="absolute inset-0">
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern id="waves" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M0,10 Q10,0 20,10 T40,10" stroke="#0f766e" strokeWidth="2" fill="none" opacity="0.4"/>
          </pattern>
          <pattern id="mapPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="#2a4a3a"/>
            <rect x="20" y="20" width="60" height="60" fill="#1a3a2a" opacity="0.7"/>
            <circle cx="50" cy="50" r="15" fill="#4a6741" opacity="0.5"/>
            <text x="50" y="55" textAnchor="middle" fill="#6b8a63" fontSize="12">MAP</text>
          </pattern>
        </defs>
        {rustMapImage ? (
          <image 
            href={rustMapImage} 
            width="100%" 
            height="100%" 
            preserveAspectRatio="xMinYMin slice" 
            style={{filter: 'brightness(0.9) contrast(1.1)'}}
          />
        ) : (
          <rect 
            width="100%" 
            height="100%" 
            fill="#2a4a3a" 
            stroke="#4a6741" 
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  )
})

TacticalMapBackground.displayName = 'TacticalMapBackground'

export default TacticalMapBackground