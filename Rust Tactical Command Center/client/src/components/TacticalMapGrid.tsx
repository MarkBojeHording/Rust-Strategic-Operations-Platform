import { memo } from 'react'

interface TacticalMapGridProps {
  mapDimensions: { width: number; height: number }
}

const TacticalMapGrid = memo(({ mapDimensions }: TacticalMapGridProps) => {
  const { width, height } = mapDimensions
  
  // Generate grid lines once
  const verticalLines = Array.from({ length: 27 }, (_, i) => (
    <line 
      key={`v-${i}`} 
      x1={i * (width / 26)} 
      y1="0" 
      x2={i * (width / 26)} 
      y2={height} 
      stroke="rgba(0, 0, 0, 0.4)" 
      strokeWidth="0.75"
    />
  ))

  const horizontalLines = Array.from({ length: 27 }, (_, i) => (
    <line 
      key={`h-${i}`} 
      x1="0" 
      y1={i * (height / 26)} 
      x2={width} 
      y2={i * (height / 26)} 
      stroke="rgba(0, 0, 0, 0.4)" 
      strokeWidth="0.75"
    />
  ))

  // Generate grid labels once
  const gridLabels = Array.from({ length: 26 }, (_, col) => 
    Array.from({ length: 26 }, (_, row) => {
      const letter = col < 26 ? String.fromCharCode(65 + col) : `A${String.fromCharCode(65 + col - 26)}`
      return (
        <text 
          key={`label-${col}-${row}`} 
          x={col * (width / 26) + 1} 
          y={row * (height / 26) + 7} 
          fill="black" 
          fontSize="7" 
          fontWeight="600" 
          textAnchor="start"
        >
          {letter}{row}
        </text>
      )
    })
  ).flat()

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
        {verticalLines}
        {horizontalLines}
        {gridLabels}
      </svg>
    </div>
  )
})

TacticalMapGrid.displayName = 'TacticalMapGrid'

export default TacticalMapGrid