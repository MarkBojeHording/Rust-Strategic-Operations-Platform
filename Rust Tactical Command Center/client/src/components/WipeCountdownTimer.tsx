import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// Types
interface UpkeepEntry {
  id: string
  name: string
  stoneUpkeep: number
  metalUpkeep: number
  hqmUpkeep: number
  goodForWipe: boolean
}

interface CustomItem {
  id: string
  name: string
  stoneCost: number
  stoneUpkeep: number
  metalCost: number
  metalUpkeep: number
  hqmCost: number
  hqmUpkeep: number
  image: string | null
}

interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds?: number
}

interface TCType {
  cost: number
  upkeep: number
  color: string
  stackLimit: number
}

interface TCCapacity {
  maxTCs: number
  totalWood: number
  totalMaterial: number
  woodSlots: number
  materialSlots: number
  woodAmounts: number[]
  materialAmounts: number[]
  woodNeeded: number
  materialNeeded: number
  totalSlots: number
}

// Constants
const TC_TYPES = {
  stone: { cost: 1125, upkeep: 113, color: 'gray', stackLimit: 1000 },
  metal: { cost: 750, upkeep: 75, color: 'gray', stackLimit: 1000 },
  hqm: { cost: 95, upkeep: 10, color: 'blue', stackLimit: 100 }
}
const WOOD_PER_TC = 188
const WOOD_STACK = 1000
const SLOTS = { base: 22, backpack: 30 }

// Utility functions
const formatNumber = (num: number): string => num.toLocaleString()

const getNextFirstThursday = () => {
  const now = new Date()
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1)
  d.setHours(14, 0, 0, 0)
  
  if (d <= now) {
    d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
  }
  
  return d
}

// Components
const TCGrid = ({ type, showBackpack, capacity }: { 
  type: keyof typeof TC_TYPES, 
  showBackpack: boolean, 
  capacity: TCCapacity 
}) => {
  const { color } = TC_TYPES[type]
  const totalSlots = showBackpack ? SLOTS.base + SLOTS.backpack : SLOTS.base
  
  const getSlotInfo = (index: number, offset = 0) => {
    const adjIndex = index + offset - 2
    if (index === 0 && offset === 0) return { type: 'ammo', content: 'Ammo', color: 'red' }
    if (index === 1 && offset === 0) return { type: 'split', content: 'RW', amount: '1000' }
    
    if (adjIndex < capacity.woodSlots) {
      return { type: 'wood', content: 'W', amount: capacity.woodAmounts[adjIndex], color: 'yellow' }
    }
    if (adjIndex < capacity.woodSlots + capacity.materialSlots) {
      const matIndex = adjIndex - capacity.woodSlots
      return { 
        type, 
        content: type === 'hqm' ? 'HQM' : type[0].toUpperCase(), 
        amount: capacity.materialAmounts[matIndex],
        color
      }
    }
    if (adjIndex < capacity.totalSlots) {
      return { type: 'tc', content: 'TC', color: 'green' }
    }
    return { type: 'empty' }
  }
  
  return (
    <div className="flex gap-2">
      <div className="grid grid-cols-6 gap-0">
        {Array.from({ length: 24 }).map((_, i) => {
          const slot = getSlotInfo(i)
          return (
            <div key={i} className={`w-10 h-10 border flex flex-col items-center justify-center text-xs font-bold
              ${slot.type === 'empty' ? 'bg-gray-50 border-gray-300' : 
                slot.color === 'red' ? 'bg-red-500 border-red-600 text-white' :
                slot.color === 'yellow' ? 'bg-yellow-600 border-yellow-700 text-white' :
                slot.color === 'green' ? 'bg-green-600 border-green-700 text-white' :
                slot.color === 'blue' ? 'bg-blue-600 border-blue-700 text-white' :
                'bg-gray-600 border-gray-700 text-white'}`}>
              {slot.type === 'split' ? (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}/>
                  <div className="absolute inset-0 bg-yellow-600" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}/>
                  <div className="relative z-10 text-white text-[10px] flex items-center justify-center h-full">
                    {slot.content}<br/>{slot.amount}
                  </div>
                </div>
              ) : (
                <>
                  <span className="leading-none">{slot.content}</span>
                  {slot.amount && <span className="text-[10px]">{slot.amount}</span>}
                </>
              )}
            </div>
          )
        })}
      </div>
      
      {showBackpack && (
        <div className="grid grid-cols-6 gap-0 border-l-2 border-gray-400 pl-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const slot = getSlotInfo(i, 22)
            return (
              <div key={`bp-${i}`} className={`w-10 h-10 border flex flex-col items-center justify-center text-xs font-bold
                ${slot.type === 'empty' ? 'bg-purple-50 border-purple-300' : 
                  slot.color === 'yellow' ? 'bg-yellow-600 border-yellow-700 text-white' :
                  slot.color === 'green' ? 'bg-green-600 border-green-700 text-white' :
                  slot.color === 'blue' ? 'bg-blue-600 border-blue-700 text-white' :
                  'bg-gray-600 border-gray-700 text-white'}`}>
                <span className="leading-none text-[10px]">{slot.content}</span>
                {slot.amount && <span className="text-[10px]">{slot.amount}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TCBox = ({ type, countdown, showGrid, setShowGrid, showBackpack, setShowBackpack }: {
  type: keyof typeof TC_TYPES,
  countdown: Countdown,
  showGrid: boolean,
  setShowGrid: (show: boolean) => void,
  showBackpack: boolean,
  setShowBackpack: (show: boolean) => void
}) => {
  const tc = TC_TYPES[type]
  const capacity = useMemo(() => calculateTCCapacity(type, countdown, showBackpack), [type, countdown, showBackpack])
  
  return (
    <div className="flex items-center space-x-2 relative">
      <div 
        className="flex flex-col items-center relative"
        onMouseEnter={() => setShowGrid(true)}
        onMouseLeave={() => setShowGrid(false)}
      >
        <span className="text-xs text-orange-300 mb-0.5 font-mono">{type} tc</span>
        <div className={`w-14 h-8 border rounded ${
          type === 'stone' ? 'bg-gray-600 border-gray-400' :
          type === 'metal' ? 'bg-gray-500 border-gray-600' :
          'bg-blue-600 border-blue-700'
        }`}>
          {showGrid && (
            <div className="absolute top-full left-0 -mt-1 -ml-32 bg-gray-900 border-2 border-orange-600 rounded-lg shadow-2xl p-1 z-50"
              style={{ width: showBackpack ? '480px' : '240px' }}>
              <TCGrid type={type} showBackpack={showBackpack} capacity={capacity} />
              <div className="mt-2 text-xs text-orange-300 border-t border-orange-600/50 pt-2">
                <div className="flex justify-between mb-1">
                  <div className="font-bold">Max {capacity.maxTCs} {type.toUpperCase()} TCs:</div>
                  <button
                    onClick={() => setShowBackpack(!showBackpack)}
                    className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Backpack
                  </button>
                </div>
                <div>Wood: <span className="font-semibold">{formatNumber(capacity.woodNeeded)}</span></div>
                <div>{type === 'hqm' ? 'HQM' : type.charAt(0).toUpperCase() + type.slice(1)}: <span className="font-semibold">{formatNumber(capacity.materialNeeded)}</span></div>
                <div>Slots: <span className="font-semibold">{capacity.totalSlots}/{showBackpack ? '52' : '22'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
      <TCInfo type={type} countdown={countdown} capacity={capacity} />
    </div>
  )
}

const Modal = ({ show, onClose, title, children }: {
  show: boolean,
  onClose: () => void,
  title: string,
  children: React.ReactNode
}) => {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-gray-900 border-2 border-orange-600 rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto text-orange-300" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 font-mono">[{title.toUpperCase()}]</h3>
        {children}
      </div>
    </div>
  )
}

const TCInfo = ({ type, countdown, capacity }: {
  type: keyof typeof TC_TYPES,
  countdown: Countdown,
  capacity: TCCapacity
}) => {
  const tc = TC_TYPES[type]
  const fractionalDays = countdown.days + (countdown.hours / 24)
  const endOfWipe = Math.ceil(tc.upkeep * fractionalDays)
  const total = Math.ceil(tc.cost + tc.upkeep * fractionalDays)
  
  return (
    <div className="text-xs text-orange-300">
      <div>Cost: <span className="font-semibold">{formatNumber(tc.cost)}</span></div>
      <div>Upkeep: <span className="font-semibold">{formatNumber(tc.upkeep)}</span></div>
      <div>EOW: <span className="font-bold text-red-400">{formatNumber(endOfWipe)}</span></div>
      <div>Total: <span className="font-bold text-red-400">{formatNumber(total)}</span></div>
      <div className="mt-1 pt-1 border-t border-orange-600/50">Max TCs: <span className="font-bold text-green-400">{capacity.maxTCs}</span></div>
    </div>
  )
}

// Helper functions
function calculateTCCapacity(
  tcType: keyof typeof TC_TYPES, 
  countdown: Countdown, 
  includeBackpack: boolean
): TCCapacity {
  const tc = TC_TYPES[tcType]
  const fractionalDays = countdown.days + (countdown.hours / 24)
  const materialPerTC = Math.ceil(tc.cost + tc.upkeep * fractionalDays)
  const availableSlots = includeBackpack ? SLOTS.base + SLOTS.backpack : SLOTS.base
  
  let maxTCs = 0
  for (let i = 1; i <= availableSlots; i++) {
    const woodNeeded = i * WOOD_PER_TC
    const materialNeeded = i * materialPerTC
    const woodSlots = Math.ceil(woodNeeded / WOOD_STACK)
    const materialSlots = Math.ceil(materialNeeded / tc.stackLimit)
    if (woodSlots + materialSlots + i <= availableSlots) maxTCs = i
    else break
  }
  
  const totalWood = maxTCs * WOOD_PER_TC
  const totalMaterial = maxTCs * materialPerTC
  const woodSlots = Math.ceil(totalWood / WOOD_STACK)
  const materialSlots = Math.ceil(totalMaterial / tc.stackLimit)
  
  const woodAmounts = Array.from({ length: woodSlots }, (_, i) => 
    Math.min(WOOD_STACK, totalWood - i * WOOD_STACK)
  )
  const materialAmounts = Array.from({ length: materialSlots }, (_, i) => 
    Math.min(tc.stackLimit, totalMaterial - i * tc.stackLimit)
  )
  
  return {
    maxTCs,
    totalWood,
    totalMaterial,
    woodNeeded: totalWood,
    materialNeeded: totalMaterial,
    woodSlots,
    materialSlots,
    woodAmounts,
    materialAmounts,
    totalSlots: woodSlots + materialSlots + maxTCs
  }
}

// Main Component
interface WipeCountdownTimerProps {
  onCountdownChange?: (countdown: Countdown & { fractionalDays: number }) => void
}

export default function WipeCountdownTimer({ onCountdownChange }: WipeCountdownTimerProps = {}) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 })
  const [showMainBox, setShowMainBox] = useState(false)
  const [showModals, setShowModals] = useState({ item: false, upkeep: false })
  const [showGrids, setShowGrids] = useState({ stone: false, metal: false, hqm: false })
  const [showBackpacks, setShowBackpacks] = useState({ stone: false, metal: false, hqm: false })
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [upkeepEntries, setUpkeepEntries] = useState<UpkeepEntry[]>([])
  const [editingUpkeepId, setEditingUpkeepId] = useState<string | null>(null)
  
  const [newUpkeepEntry, setNewUpkeepEntry] = useState({
    name: '', stoneUpkeep: 0, metalUpkeep: 0, hqmUpkeep: 0, goodForWipe: false
  })
  
  const [newItem, setNewItem] = useState({
    name: '', stoneCost: 0, stoneUpkeep: 0, metalCost: 0, 
    metalUpkeep: 0, hqmCost: 0, hqmUpkeep: 0, image: null as string | null
  })
  
  // Update countdown
  useEffect(() => {
    const updateCountdown = () => {
      const target = getNextFirstThursday()
      const diff = target.getTime() - Date.now()
      if (diff > 0) {
        const newCountdown = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        }
        setCountdown(newCountdown)
        
        // Calculate fractional days for TC calculations
        const fractionalDays = newCountdown.days + newCountdown.hours / 24 + newCountdown.minutes / (24 * 60)
        
        // Notify parent component of countdown changes
        if (onCountdownChange) {
          onCountdownChange({
            ...newCountdown,
            fractionalDays
          })
        }
      }
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [onCountdownChange])
  
  // Keyboard handlers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModals.item || showModals.upkeep) {
          setShowModals({ item: false, upkeep: false })
        } else if (showMainBox) {
          setShowMainBox(false)
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMainBox, showModals])
  
  const totalUpkeep = useMemo(() => 
    upkeepEntries
      .filter(entry => !entry.goodForWipe)
      .reduce((acc, entry) => ({
        stone: acc.stone + entry.stoneUpkeep,
        metal: acc.metal + entry.metalUpkeep,
        hqm: acc.hqm + entry.hqmUpkeep
      }), { stone: 0, metal: 0, hqm: 0 })
  , [upkeepEntries])
  
  const handleAddUpkeep = useCallback(() => {
    if (!newUpkeepEntry.name.trim()) return
    
    if (editingUpkeepId) {
      setUpkeepEntries(entries => entries.map(e => 
        e.id === editingUpkeepId ? { ...e, ...newUpkeepEntry } : e
      ))
      setEditingUpkeepId(null)
    } else {
      setUpkeepEntries(entries => [...entries, { id: Date.now().toString(), ...newUpkeepEntry }])
    }
    
    setNewUpkeepEntry({ name: '', stoneUpkeep: 0, metalUpkeep: 0, hqmUpkeep: 0, goodForWipe: false })
    setShowModals(m => ({ ...m, upkeep: false }))
  }, [newUpkeepEntry, editingUpkeepId])
  
  const handleAddItem = useCallback(() => {
    if (!newItem.name.trim()) return
    setCustomItems(items => [...items, { id: Date.now().toString(), ...newItem }])
    setNewItem({ name: '', stoneCost: 0, stoneUpkeep: 0, metalCost: 0, metalUpkeep: 0, hqmCost: 0, hqmUpkeep: 0, image: null })
    setShowModals(m => ({ ...m, item: false }))
  }, [newItem])
  
  return (
    <div className="relative">
      {/* Main countdown display */}
      <div 
        className="cursor-pointer relative px-8 py-4 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 hover:from-gray-200 hover:via-gray-300 hover:to-gray-400 text-gray-800 font-bold rounded-lg shadow-lg border-2 border-gray-500 transition-all duration-200 hover:shadow-xl tracking-wider font-mono text-lg min-w-fit"
        style={{
          background: 'linear-gradient(145deg, #e6e6e6, #b8b8b8)',
          boxShadow: 'inset 8px 8px 16px #a0a0a0, inset -8px -8px 16px #ffffff, 4px 4px 12px rgba(0,0,0,0.3)',
          border: '2px solid #999'
        }}
        onClick={() => setShowMainBox(!showMainBox)}
      >
        {/* Metal studs/rivets in corners */}
        <div className="absolute top-1 left-2 w-2 h-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full shadow-inner"></div>
        <div className="absolute top-1 right-2 w-2 h-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full shadow-inner"></div>
        <div className="absolute bottom-1 left-2 w-2 h-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full shadow-inner"></div>
        <div className="absolute bottom-1 right-2 w-2 h-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full shadow-inner"></div>
        
        {/* Diamond plate texture pattern */}
        <div className="absolute inset-0 opacity-10 rounded-lg" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px),
                           repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)`
        }}></div>
        
        [WIPE: {countdown.days}D {countdown.hours}H {countdown.minutes}M]
      </div>
      
      {/* Modals */}
      <Modal 
        show={showModals.upkeep} 
        onClose={() => setShowModals(m => ({ ...m, upkeep: false }))}
        title={editingUpkeepId ? 'Edit Upkeep' : 'Add Upkeep'}
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={newUpkeepEntry.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUpkeepEntry({ ...newUpkeepEntry, name: e.target.value })}
            className="w-full border border-orange-600/50 rounded px-3 py-2 bg-gray-800 text-orange-300"
          />
          {(['stone', 'metal', 'hqm'] as const).map(type => (
            <div key={type}>
              <label className="block text-sm mb-1 text-orange-300 font-mono">{type.toUpperCase()} Upkeep (per day)</label>
              <input
                type="number"
                value={newUpkeepEntry[`${type}Upkeep` as keyof typeof newUpkeepEntry]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUpkeepEntry({ ...newUpkeepEntry, [`${type}Upkeep`]: Number(e.target.value) })}
                className="w-full border border-orange-600/50 rounded px-3 py-2 bg-gray-800 text-orange-300"
                min="0"
              />
            </div>
          ))}
          <div className="flex justify-end space-x-2">
            <button onClick={() => setShowModals(m => ({ ...m, upkeep: false }))} className="px-4 py-2 border border-orange-600/50 rounded bg-gray-800 text-orange-300">Cancel</button>
            <button onClick={handleAddUpkeep} className="px-4 py-2 bg-orange-600 text-white rounded">Save</button>
          </div>
        </div>
      </Modal>
      
      <Modal 
        show={showModals.item} 
        onClose={() => setShowModals(m => ({ ...m, item: false }))}
        title="Add Custom Item"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-orange-300 font-mono">ITEM NAME</label>
            <input
              type="text"
              placeholder="Enter item name"
              value={newItem.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full border border-orange-600/50 rounded px-3 py-2 bg-gray-800 text-orange-300"
            />
          </div>
          
          <div>
            <label className="block text-xs mb-1 text-orange-300 font-mono">ITEM IMAGE</label>
            <div 
              className="w-full h-48 border-2 border-dashed border-orange-600/50 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-600"
              onClick={() => document.getElementById('itemImageInput')?.click()}
            >
              {newItem.image ? (
                <img src={newItem.image} alt="Item" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-sm text-orange-400 font-mono">Click to upload image</span>
              )}
            </div>
            <input
              id="itemImageInput"
              type="file"
              accept="image/*"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onloadend = () => setNewItem({ ...newItem, image: reader.result as string })
                  reader.readAsDataURL(file)
                }
              }}
              className="hidden"
            />
          </div>
          
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 items-center">
              <label className="text-xs text-orange-300 font-mono">RESOURCES</label>
              <label className="text-xs text-orange-400 font-mono text-center">BUILD COST</label>
              <label className="text-xs text-orange-400 font-mono text-center">DAILY UPKEEP</label>
              <div></div>
            </div>
            {(['stone', 'metal', 'hqm'] as const).map(type => (
              <div key={type} className="grid grid-cols-4 gap-2 items-center">
                <label className="text-xs text-orange-400 font-mono">{type.toUpperCase()}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newItem[`${type}Cost` as keyof typeof newItem] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({ ...newItem, [`${type}Cost`]: Number(e.target.value) })}
                  className="border border-orange-600/50 rounded px-2 py-1 bg-gray-800 text-orange-300 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="0"
                  value={newItem[`${type}Upkeep` as keyof typeof newItem] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({ ...newItem, [`${type}Upkeep`]: Number(e.target.value) })}
                  className="border border-orange-600/50 rounded px-2 py-1 bg-gray-800 text-orange-300 text-sm"
                  min="0"
                />
                <div></div>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setShowModals(m => ({ ...m, item: false }))} className="px-4 py-2 border border-orange-600/50 rounded bg-gray-800 text-orange-300">Cancel</button>
            <button onClick={handleAddItem} className="px-4 py-2 bg-orange-600 text-white rounded">Save</button>
          </div>
        </div>
      </Modal>

      {/* Detailed view */}
      {showMainBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-[60]" onClick={() => setShowMainBox(false)}>
          <div className="bg-gray-900 border-2 border-orange-600 rounded-lg shadow-2xl p-4 mt-2" style={{ width: '870px' }} onClick={e => e.stopPropagation()}>
          <div className="flex space-x-4">
            {/* Left side */}
            <div className="flex flex-col space-y-1" style={{ width: '490px' }}>
              <div className="w-full">
                {/* Upkeep Summary */}
                <div className="bg-gray-800 border border-orange-600/50 rounded p-2 w-full text-xs text-orange-300">
                  <div className="flex space-x-4">
                    {/* Daily Upkeep */}
                    <div className="flex-1">
                      <div className="font-medium mb-1 font-mono">[DAILY UPKEEP]</div>
                      {Object.entries(totalUpkeep).map(([type, value]) => (
                        <div key={type} className="font-mono">{type}: <span className="font-bold text-red-400">{formatNumber(value)}</span></div>
                      ))}
                    </div>
                    
                    {/* Until Wipe */}
                    <div className="flex-1 pl-2 border-l border-orange-600/50">
                      <div className="font-medium mb-1 font-mono">[UNTIL WIPE]</div>
                      {Object.entries(totalUpkeep).map(([type, value]) => {
                        const total = Math.ceil(value * (countdown.days + countdown.hours / 24))
                        const boxSize = type === 'hqm' ? 4800 : 48000
                        const boxes = Math.ceil(total / boxSize)
                        return (
                          <div key={type} className="font-mono">
                            {type}: <span className="font-bold text-red-400">{formatNumber(total)}</span>
                            {total > 0 && <span className="text-orange-500 ml-1 text-[11px]">({boxes} {boxes === 1 ? 'box' : 'boxes'})</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Upkeep List */}
              <div className="border border-orange-600/50 rounded max-h-24 overflow-y-auto overflow-x-hidden bg-gray-800">
                <div className="flex justify-between items-center px-2 py-1 border-b border-orange-600/50 text-xs font-medium text-orange-300 font-mono">
                  <div className="flex">
                    <span className="w-20">[GOOD FOR WIPE]</span>
                    <span className="border-l border-orange-600/50 pl-2 w-32">[NAME]</span>
                  </div>
                  <div className="flex items-center space-x-8">
                    <span className="w-40 text-center">[UPKEEP PER DAY]</span>
                    <div className="flex items-center space-x-1">
                      <span>[EDITS]</span>
                      <button
                        onClick={() => setShowModals(m => ({ ...m, upkeep: true }))}
                        className="w-4 h-4 bg-orange-600 text-white rounded-full text-xs hover:bg-orange-700 flex-shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {upkeepEntries.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-orange-500 text-center font-mono">No upkeep entries added</div>
                ) : (
                  upkeepEntries.map(entry => (
                    <div key={entry.id} className={`flex justify-between text-xs px-2 py-1 border-b border-orange-600/30 last:border-b-0 text-orange-300 ${entry.goodForWipe ? 'bg-green-800/30' : ''}`}>
                      <div className="flex">
                        <div className="w-20 flex space-x-1">
                          <button
                            onClick={() => setUpkeepEntries(entries => entries.map(e => 
                              e.id === entry.id ? { ...e, goodForWipe: false } : e
                            ))}
                            className={`text-xs px-1 rounded font-mono ${!entry.goodForWipe ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-600 hover:text-white'}`}
                          >
                            NO
                          </button>
                          <button
                            onClick={() => setUpkeepEntries(entries => entries.map(e => 
                              e.id === entry.id ? { ...e, goodForWipe: true } : e
                            ))}
                            className={`text-xs px-1 rounded font-mono ${entry.goodForWipe ? 'bg-green-600 text-white' : 'text-green-400 hover:bg-green-600 hover:text-white'}`}
                          >
                            YES
                          </button>
                        </div>
                        <span className="border-l border-orange-600/30 pl-2 w-32 truncate font-mono">{entry.name}</span>
                      </div>
                      <div className="flex items-center space-x-8">
                        <div className="flex space-x-2 w-40 justify-center font-mono">
                          {entry.stoneUpkeep > 0 && <span>S:{entry.stoneUpkeep}</span>}
                          {entry.metalUpkeep > 0 && <span>M:{entry.metalUpkeep}</span>}
                          {entry.hqmUpkeep > 0 && <span>H:{entry.hqmUpkeep}</span>}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setNewUpkeepEntry(entry)
                              setEditingUpkeepId(entry.id)
                              setShowModals(m => ({ ...m, upkeep: true }))
                            }}
                            className="text-blue-400 flex-shrink-0"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setUpkeepEntries(entries => entries.filter(e => e.id !== entry.id))}
                            className="text-red-400 flex-shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Middle - TC Boxes */}
            <div className="flex flex-col space-y-2">
              {(Object.keys(TC_TYPES) as Array<keyof typeof TC_TYPES>).map(type => (
                <TCBox 
                  key={type}
                  type={type}
                  countdown={countdown}
                  showGrid={showGrids[type]}
                  setShowGrid={(show: boolean) => setShowGrids(g => ({ ...g, [type]: show }))}
                  showBackpack={showBackpacks[type]}
                  setShowBackpack={(show: boolean) => setShowBackpacks(b => ({ ...b, [type]: show }))}
                />
              ))}
              
              {/* Custom Items */}
              {customItems.map(item => {
                const fractionalDays = countdown.days + (countdown.hours / 24)
                return (
                  <div key={item.id} className="border-t border-orange-600/50 pt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-orange-300 font-mono">{item.name}</span>
                      <button
                        onClick={() => setCustomItems(items => items.filter(i => i.id !== item.id))}
                        className="text-red-400 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="text-xs text-orange-400 font-mono">
                      <div>Cost: {item.stoneCost > 0 && `S:${item.stoneCost} `}{item.metalCost > 0 && `M:${item.metalCost} `}{item.hqmCost > 0 && `H:${item.hqmCost}`}</div>
                      <div>Upkeep: {item.stoneUpkeep > 0 && `S:${item.stoneUpkeep} `}{item.metalUpkeep > 0 && `M:${item.metalUpkeep} `}{item.hqmUpkeep > 0 && `H:${item.hqmUpkeep}`}</div>
                      <div>Total: {Math.ceil(item.stoneCost + item.stoneUpkeep * fractionalDays) > 0 && `S:${Math.ceil(item.stoneCost + item.stoneUpkeep * fractionalDays)} `}{Math.ceil(item.metalCost + item.metalUpkeep * fractionalDays) > 0 && `M:${Math.ceil(item.metalCost + item.metalUpkeep * fractionalDays)} `}{Math.ceil(item.hqmCost + item.hqmUpkeep * fractionalDays) > 0 && `H:${Math.ceil(item.hqmCost + item.hqmUpkeep * fractionalDays)}`}</div>
                    </div>
                  </div>
                )
              })}
              
              {/* Add Custom Item Button */}
              <button
                onClick={() => setShowModals(m => ({ ...m, item: true }))}
                className="text-xs bg-orange-600 text-white rounded px-2 py-1 hover:bg-orange-700 font-mono"
              >
                [ADD CUSTOM ITEM]
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}