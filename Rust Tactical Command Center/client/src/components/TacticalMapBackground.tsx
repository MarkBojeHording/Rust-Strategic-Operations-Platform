import { memo } from 'react'
import rustMapImage from '@assets/map_raw_normalized (2)_1755133962532.png'

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
        </defs>
        <image 
          href={rustMapImage} 
          width="100%" 
          height="100%" 
          preserveAspectRatio="xMinYMin slice" 
          style={{filter: 'brightness(0.9) contrast(1.1)'}}
        />
      </svg>
    </div>
  )
})

TacticalMapBackground.displayName = 'TacticalMapBackground'

export default TacticalMapBackground