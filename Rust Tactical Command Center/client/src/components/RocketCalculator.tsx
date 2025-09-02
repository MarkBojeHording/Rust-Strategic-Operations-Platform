// RocketCalculator.js
import { useState, useMemo } from 'react'
import { Calculator, X } from 'lucide-react'

// ============= CONSTANTS =============
const SLIDER_DESCRIPTIONS = {
  75: "Will panic with doors open",
  100: "Potato",
  150: "Normal defender",
  200: "Good PVPers",
  250: "Probably cheating"
}

const RAID_MULTIPLIERS = {
  sheetMetal: 1,
  wood: 2,
  garage: 3,
  stone: 4,
  metal: 8,
  hqm: 15
}

// ============= UTILITY FUNCTIONS =============
const calculateRocketAmmo = (rocketCount: number, isPrimary: boolean, modifier = 150) => {
  if (isPrimary) {
    const adjustedRockets = rocketCount > 12 ? 6 + Math.floor((rocketCount - 12) / 8) * 3 : rocketCount
    const hv = adjustedRockets * 1
    const incin = Math.floor(rocketCount / 20)
    const explo = 10 + (rocketCount * 6)
    return { rockets: adjustedRockets, hv, incin, explo }
  } else {
    const baseRockets = Math.min(rocketCount, 4)
    const extraRockets = Math.max(0, rocketCount - 4)
    const adjustedRockets = baseRockets + Math.floor(extraRockets * (modifier / 100))
    const hv = 9 + Math.floor(adjustedRockets / 6) * 3
    const incin = Math.floor(adjustedRockets / 12)
    const explo = 10 + (rocketCount * 6)
    return { rockets: adjustedRockets, hv, incin, explo }
  }
}

// ============= SUB-COMPONENTS =============
const CalculatorModal = ({ position, onClose, onCalculate }: {
  position: { x: number; y: number };
  onClose: () => void;
  onCalculate: (value: number) => void;
}) => {
  const [values, setValues] = useState({
    sheetMetal: 0, wood: 0, garage: 0, stone: 0, metal: 0, hqm: 0
  })
  
  const handleChange = (type: string, value: string) => {
    const numValue = Math.min(99, Math.max(0, Number(value) || 0))
    const newValues = { ...values, [type]: numValue }
    setValues(newValues)
    
    let total = 0
    Object.keys(newValues).forEach(key => {
      total += newValues[key as keyof typeof newValues] * RAID_MULTIPLIERS[key as keyof typeof RAID_MULTIPLIERS]
    })
    onCalculate(total)
  }
  
  const items = [
    { key: 'sheetMetal', label: 'Sheet Metal Door' },
    { key: 'wood', label: 'Wood Wall/High Wall' },
    { key: 'garage', label: 'Garage Door/Window' },
    { key: 'stone', label: 'Stone Wall/High Wall' },
    { key: 'metal', label: 'Metal Wall' },
    { key: 'hqm', label: 'HQM Wall' }
  ]
  
  return (
    <div 
      className="fixed pointer-events-none" 
      style={{ zIndex: 99999, left: position.x + 'px', top: position.y + 'px' }}
    >
      <div className="bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-600 p-4 w-96 pointer-events-auto" style={{boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Raid Calculator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-6 gap-2">
          {items.map((item) => (
            <div key={item.key} className="text-center">
              <label className="block text-[10px] font-medium text-gray-300 mb-1 h-6 leading-tight">
                {item.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={values[item.key as keyof typeof values]}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="w-full pl-1 pr-6 py-1 bg-gray-700 border border-gray-600 rounded text-center text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
                  min="0"
                  max="99"
                  placeholder="0"
                />
                <div className="absolute right-0.5 top-0.5 bottom-0.5 flex flex-col" style={{width: '14px'}}>
                  <button
                    type="button"
                    onClick={() => handleChange(item.key, Math.min(99, (values[item.key as keyof typeof values] || 0) + 1).toString())}
                    className="flex items-center justify-center h-1/2 bg-gray-600 hover:bg-gray-500 rounded-t text-gray-300 transition-colors border-b border-gray-700"
                    style={{fontSize: '8px', lineHeight: '0'}}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange(item.key, Math.max(0, (values[item.key as keyof typeof values] || 0) - 1).toString())}
                    className="flex items-center justify-center h-1/2 bg-gray-600 hover:bg-gray-500 rounded-b text-gray-300 transition-colors"
                    style={{fontSize: '8px', lineHeight: '0'}}
                  >
                    ▼
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">×{RAID_MULTIPLIERS[item.key as keyof typeof RAID_MULTIPLIERS]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= MAIN COMPONENT =============
export const RocketCalculatorSection = ({ 
  primaryRockets, 
  onPrimaryRocketsChange,
  showCalculatorModal,
  calculatorPosition,
  onToggleCalculator,
  onCloseCalculator
}: {
  primaryRockets: number;
  onPrimaryRocketsChange: (value: number) => void;
  showCalculatorModal: boolean;
  calculatorPosition: { x: number; y: number };
  onToggleCalculator: () => void;
  onCloseCalculator: () => void;
}) => {
  const [onlineRaidModifier, setOnlineRaidModifier] = useState(150)
  const [showSliderTooltip, setShowSliderTooltip] = useState(false)
  
  const ammo = useMemo(() => calculateRocketAmmo(primaryRockets, true), [primaryRockets])
  const onlineAmmo = useMemo(() => calculateRocketAmmo(primaryRockets, false, onlineRaidModifier), [primaryRockets, onlineRaidModifier])
  
  return (
    <>
      <div className="border border-gray-600 rounded-lg p-0 bg-gray-700 mb-3 relative">
        <button 
          className={`absolute top-1 right-1 rounded p-0.5 transition-colors cursor-pointer ${
            showCalculatorModal ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-600'
          }`}
          onClick={onToggleCalculator}
          type="button"
        >
          <Calculator className={`h-5 w-5 ${showCalculatorModal ? 'text-white' : 'text-blue-500'}`} />
        </button>
        <div className="px-1">
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium text-gray-300 mr-[3px]">Primary Raid</label>
            <div className="flex gap-0.5 text-center">
              <div className="flex flex-col items-center">
                <div className="text-[9px] font-medium text-gray-400">Rocket</div>
                <input 
                  type="number" 
                  value={primaryRockets} 
                  onChange={(e) => onPrimaryRocketsChange(Math.min(999, Math.max(0, Number(e.target.value))))} 
                  className="w-full px-0 py-0 bg-gray-600 border border-gray-500 rounded text-xs font-bold text-center text-gray-200 focus:border-blue-500 focus:outline-none" 
                  min="0" 
                  max="999" 
                  style={{width: '32px', fontSize: '10px'}} 
                />
              </div>
              {['HV', 'Incin', 'Explo'].map((type, i) => (
                <div key={type} className="flex flex-col items-center">
                  <div className="text-[9px] font-medium text-gray-400">{type}</div>
                  <div className="w-full px-0.5 py-0 bg-gray-600 rounded text-xs font-bold text-center text-gray-200" style={{width: '32px', fontSize: '10px'}}>
                    {[ammo.hv, ammo.incin, ammo.explo][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 px-1 pb-0">
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium text-gray-300 mr-2">Online Raid</label>
            <div className="flex gap-0.5 text-center">
              <div className="flex flex-col items-center">
                <div className="text-[9px] font-medium text-gray-400">Rocket</div>
                <div className="w-full px-0.5 py-0 bg-gray-600 rounded text-xs font-bold text-center text-gray-200" style={{width: '32px', fontSize: '10px'}}>
                  {Math.min(primaryRockets, 4) + Math.floor(Math.max(0, primaryRockets - 4) * (onlineRaidModifier / 100))}
                </div>
              </div>
              {['HV', 'Incin', 'Explo'].map((type, i) => (
                <div key={type} className="flex flex-col items-center">
                  <div className="text-[9px] font-medium text-gray-400">{type}</div>
                  <div className="w-full px-0.5 py-0 bg-gray-600 rounded text-xs font-bold text-center text-gray-200" style={{width: '32px', fontSize: '10px'}}>
                    {[onlineAmmo.hv, onlineAmmo.incin, onlineAmmo.explo][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 px-1 pb-1 relative">
          <div className="relative h-3 mx-0.5">
            <div className="absolute inset-x-0 top-1 h-0.5 bg-gray-600 rounded-full">
              <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full transition-all duration-150"
                   style={{width: `${[75, 100, 150, 200, 250].indexOf(onlineRaidModifier) * 25}%`}} />
            </div>
            {[0, 25, 50, 75, 100].map((position, index) => (
              <div
                key={index}
                className="absolute w-1.5 h-1.5 bg-gray-500 rounded-full"
                style={{
                  left: `${position}%`,
                  top: '3px',
                  transform: 'translateX(-50%)'
                }}
              />
            ))}
            <input
              type="range"
              min="0"
              max="4"
              value={[75, 100, 150, 200, 250].indexOf(onlineRaidModifier)}
              onChange={(e) => {
                const values = [75, 100, 150, 200, 250]
                setOnlineRaidModifier(values[parseInt(e.target.value)])
              }}
              onMouseDown={() => setShowSliderTooltip(true)}
              onMouseUp={() => setShowSliderTooltip(false)}
              onMouseLeave={() => setShowSliderTooltip(false)}
              className="absolute inset-x-0 top-0 w-full h-3 opacity-0 cursor-pointer"
            />
            <div
              className={`absolute w-2.5 h-2.5 bg-blue-500 rounded-full shadow-md pointer-events-none transition-all duration-150 ${showSliderTooltip ? 'scale-125' : ''}`}
              style={{
                left: `${[75, 100, 150, 200, 250].indexOf(onlineRaidModifier) * 25}%`,
                top: '1px',
                transform: 'translateX(-50%)'
              }}
            />
            {showSliderTooltip && (
              <div className="absolute -top-8 pointer-events-none transition-opacity duration-200 z-20"
                   style={{
                     left: `${Math.max(15, Math.min(85, [75, 100, 150, 200, 250].indexOf(onlineRaidModifier) * 25))}%`,
                     transform: 'translateX(-50%)'
                   }}>
                <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                  <div className="font-bold text-center">{onlineRaidModifier}%</div>
                  <div className="text-[9px] mt-0">{SLIDER_DESCRIPTIONS[onlineRaidModifier as keyof typeof SLIDER_DESCRIPTIONS] || ""}</div>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showCalculatorModal && (
        <CalculatorModal 
          position={calculatorPosition}
          onClose={onCloseCalculator}
          onCalculate={onPrimaryRocketsChange}
        />
      )}
    </>
  )
}

// Export individual components and utilities if needed elsewhere
export { calculateRocketAmmo, CalculatorModal, RAID_MULTIPLIERS, SLIDER_DESCRIPTIONS }