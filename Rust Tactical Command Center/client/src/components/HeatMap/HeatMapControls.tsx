import React from 'react'
import { HeatMapConfig } from './types'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { Eye, EyeOff, Settings } from 'lucide-react'

interface HeatMapControlsProps {
  config: HeatMapConfig
  onConfigChange: (config: HeatMapConfig) => void
  isExpanded?: boolean
  onToggleExpanded?: () => void
}

export const HeatMapControls: React.FC<HeatMapControlsProps> = ({
  config,
  onConfigChange,
  isExpanded = false,
  onToggleExpanded
}) => {
  const colorOptions = [
    { value: 'red', label: 'Red', color: '#ff0000' },
    { value: 'blue', label: 'Blue', color: '#0066ff' },
    { value: 'green', label: 'Green', color: '#00ff00' },
    { value: 'orange', label: 'Orange', color: '#ffa500' }
  ] as const

  return (
    <div className="bg-gray-800 border border-orange-600/50 rounded-lg p-3 space-y-3">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <span className="text-orange-200 font-mono text-sm font-bold">
          [HEAT MAP]
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConfigChange({ ...config, enabled: !config.enabled })}
            className="text-orange-400 hover:text-orange-200 hover:bg-orange-900/20"
            data-testid="toggle-heatmap"
          >
            {config.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          {onToggleExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="text-orange-400 hover:text-orange-200 hover:bg-orange-900/20"
              data-testid="toggle-heatmap-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && config.enabled && (
        <>
          {/* Color Scheme */}
          <div>
            <label className="block text-xs text-orange-200 mb-2 font-mono">
              COLOR SCHEME
            </label>
            <div className="grid grid-cols-2 gap-2">
              {colorOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onConfigChange({ ...config, colorScheme: option.value })}
                  className={`
                    px-2 py-1 rounded text-xs font-mono transition-colors
                    ${config.colorScheme === option.value 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-orange-200 hover:bg-gray-600'
                    }
                  `}
                  data-testid={`color-scheme-${option.value}`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border border-gray-400"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Radius Control */}
          <div>
            <label className="block text-xs text-orange-200 mb-2 font-mono">
              RADIUS: {config.radius}px
            </label>
            <Slider
              value={[config.radius]}
              onValueChange={([value]) => onConfigChange({ ...config, radius: value })}
              min={20}
              max={100}
              step={5}
              className="w-full"
              data-testid="radius-slider"
            />
          </div>

          {/* Opacity Control */}
          <div>
            <label className="block text-xs text-orange-200 mb-2 font-mono">
              OPACITY: {Math.round(config.opacity * 100)}%
            </label>
            <Slider
              value={[config.opacity * 100]}
              onValueChange={([value]) => onConfigChange({ ...config, opacity: value / 100 })}
              min={10}
              max={100}
              step={5}
              className="w-full"
              data-testid="opacity-slider"
            />
          </div>

          {/* Max Intensity Control */}
          <div>
            <label className="block text-xs text-orange-200 mb-2 font-mono">
              INTENSITY: {config.maxIntensity}
            </label>
            <Slider
              value={[config.maxIntensity]}
              onValueChange={([value]) => onConfigChange({ ...config, maxIntensity: value })}
              min={1}
              max={20}
              step={1}
              className="w-full"
              data-testid="intensity-slider"
            />
          </div>
        </>
      )}
    </div>
  )
}

export default HeatMapControls