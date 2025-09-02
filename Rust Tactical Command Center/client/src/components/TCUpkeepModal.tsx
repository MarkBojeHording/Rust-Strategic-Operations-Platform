import { useState, useEffect, useMemo } from 'react'

// Utility function
const formatNumber = (num) => num.toLocaleString()

export default function TCUpkeepModal({ onClose, wipeCountdown = null, tcData, onTCDataChange }) {
  // Use provided countdown or calculate fallback
  const countdown = useMemo(() => {
    if (wipeCountdown) {
      return {
        days: wipeCountdown.days,
        hours: wipeCountdown.hours,
        fractionalDays: wipeCountdown.days + (wipeCountdown.hours / 24)
      }
    }
    // Fallback calculation if no countdown provided
    const now = new Date()
    let target = new Date(now.getFullYear(), now.getMonth(), 1)
    while (target.getDay() !== 4) target.setDate(target.getDate() + 1)
    target.setHours(14, 0, 0, 0)
    if (target <= now) {
      target = new Date(target.setMonth(target.getMonth() + 1))
      target.setDate(1)
      while (target.getDay() !== 4) target.setDate(target.getDate() + 1)
      target.setHours(14, 0, 0, 0)
    }
    const diff = target.getTime() - now.getTime()
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      fractionalDays: Math.floor(diff / (1000 * 60 * 60 * 24)) + Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) / 24
    }
  }, [wipeCountdown])
  // Use props data instead of local state
  const goodForWipe = tcData?.goodForWipe || false
  const trackForTotal = tcData?.trackForTotal !== undefined ? tcData.trackForTotal : true
  const trackRemainingTime = tcData?.trackRemainingTime || false
  const timerDays = tcData?.timerDays || '00'
  const timerHours = tcData?.timerHours || '00'
  const timerMinutes = tcData?.timerMinutes || '00'
  const isTimerActive = tcData?.isTimerActive || false
  const mainTC = tcData?.mainTC || { wood: '', stone: '', metal: '', hqm: '' }
  const additionalTCs = tcData?.additionalTCs || []

  // Helper function to update TC data
  const updateTCData = (updates) => {
    if (onTCDataChange) {
      onTCDataChange({ ...tcData, ...updates })
    }
  }

  const [showTCAdvanced, setShowTCAdvanced] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [tcEntry, setTcEntry] = useState({
    name: '',
    woodUpkeep: 0,
    stoneUpkeep: 0,
    metalUpkeep: 0,
    hqmUpkeep: 0,
    remainingDays: '',
    remainingHours: '',
    remainingMinutes: ''
  })
  

  
  // Stop timer when tracking is disabled
  useEffect(() => {
    if (!trackRemainingTime) {
      updateTCData({ isTimerActive: false })
    }
  }, [trackRemainingTime])
  
  // Timer countdown - decrements the actual field values every minute
  useEffect(() => {
    if (isTimerActive && trackRemainingTime) {
      const timer = setInterval(() => {
        // Calculate current total seconds
        const days = parseInt(timerDays) || 0
        const hours = parseInt(timerHours) || 0
        const minutes = parseInt(timerMinutes) || 0
        let totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
        
        if (totalSeconds <= 60) {
          // Timer expired
          updateTCData({ 
            isTimerActive: false,
            timerDays: '00',
            timerHours: '00',
            timerMinutes: '00'
          })
        } else {
          // Decrement by 1 minute
          totalSeconds -= 60
          const newDays = Math.floor(totalSeconds / (24 * 60 * 60))
          const newHours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
          const newMinutes = Math.floor((totalSeconds % (60 * 60)) / 60)
          
          updateTCData({
            timerDays: newDays.toString().padStart(2, '0'),
            timerHours: newHours.toString().padStart(2, '0'),
            timerMinutes: newMinutes.toString().padStart(2, '0')
          })
        }
      }, 60000)  // Update every minute
      
      return () => clearInterval(timer)
    }
  }, [isTimerActive, timerDays, timerHours, timerMinutes, trackRemainingTime])
  
  const startTimer = () => {
    if (!trackRemainingTime) return
    
    const days = parseInt(timerDays) || 0
    const hours = parseInt(timerHours) || 0
    const minutes = parseInt(timerMinutes) || 0
    
    if (hours > 23 || minutes > 59) return
    
    const totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
    if (totalSeconds > 0) {
      updateTCData({ isTimerActive: true })
    }
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }
  
  const handleInputChange = (field, value, max) => {
    // Allow typing but validate max
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= max)) {
      updateTCData({ [field]: value })
    }
  }
  
  const handleBlur = () => {
    if (!isTimerActive) {
      startTimer()
    }
  }
  
  // Calculate if timer should show red (less than 10 minutes)
  const isLowTime = () => {
    const days = parseInt(timerDays) || 0
    const hours = parseInt(timerHours) || 0
    const minutes = parseInt(timerMinutes) || 0
    const totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
    return isTimerActive && totalSeconds <= 600
  }
  
  // Helper to get numeric value from mainTC (treat empty string as 0)
  const getNumericValue = (value) => {
    return value === '' ? 0 : Number(value)
  }
  
  // Calculate totals
  const totals = useMemo(() => {
    // Start with MainTC upkeep if tracking for total (convert empty strings to 0)
    let daily = trackForTotal ? {
      wood: getNumericValue(mainTC.wood),
      stone: getNumericValue(mainTC.stone),
      metal: getNumericValue(mainTC.metal),
      hqm: getNumericValue(mainTC.hqm)
    } : { wood: 0, stone: 0, metal: 0, hqm: 0 }
    
    // Add upkeep from external TCs
    additionalTCs.forEach(tc => {
      daily.wood = (daily.wood || 0) + tc.woodUpkeep
      daily.stone = (daily.stone || 0) + tc.stoneUpkeep
      daily.metal = (daily.metal || 0) + tc.metalUpkeep
      daily.hqm = (daily.hqm || 0) + tc.hqmUpkeep
    })
    
    // Calculate until wipe
    const untilWipe = {}
    Object.keys(daily).forEach(key => {
      untilWipe[key] = Math.ceil(daily[key] * countdown.fractionalDays)
    })
    
    return { daily, untilWipe }
  }, [mainTC, additionalTCs, countdown.fractionalDays, trackForTotal])
  
  // Calculate optimal TC storage distribution
  const calculateOptimalStorage = useMemo(() => {
    const daily = {
      wood: getNumericValue(mainTC.wood),
      stone: getNumericValue(mainTC.stone),
      metal: getNumericValue(mainTC.metal),
      hqm: getNumericValue(mainTC.hqm)
    }
    const SLOTS = 24
    const STACK_LIMITS = { wood: 1000, stone: 1000, metal: 1000, hqm: 100 }
    
    // Skip if no upkeep
    const totalDaily = daily.wood + daily.stone + daily.metal + daily.hqm
    if (totalDaily === 0) {
      return { slots: Array(SLOTS).fill({ type: 'empty' }), maxDays: 0, totalMaterials: {} }
    }
    
    // Initialize slot allocation
    let slotAllocation = { wood: 0, stone: 0, metal: 0, hqm: 0 }
    let remainingSlots = SLOTS
    
    // Allocate slots to maximize minimum days
    while (remainingSlots > 0) {
      let worstType = null
      let worstDays = Infinity
      
      // Find which resource runs out first (has least days)
      Object.keys(daily).forEach(type => {
        if (daily[type] > 0) {
          const currentCapacity = slotAllocation[type] * STACK_LIMITS[type]
          const days = currentCapacity / daily[type]
          if (days < worstDays) {
            worstDays = days
            worstType = type
          }
        }
      })
      
      if (worstType) {
        slotAllocation[worstType]++
        remainingSlots--
      } else {
        break
      }
    }
    
    // Calculate actual max days (limited by resource that runs out first)
    let maxDays = Infinity
    Object.keys(daily).forEach(type => {
      if (daily[type] > 0) {
        const capacity = slotAllocation[type] * STACK_LIMITS[type]
        const days = capacity / daily[type]
        maxDays = Math.min(maxDays, days)
      }
    })
    
    // Cap max days at wipe time
    const daysUntilWipe = countdown.fractionalDays
    const effectiveMaxDays = Math.min(maxDays, daysUntilWipe)
    
    // Build slot array with actual amounts (capped at wipe)
    const slots = []
    Object.keys(slotAllocation).forEach(type => {
      if (slotAllocation[type] > 0) {
        const stackLimit = STACK_LIMITS[type]
        const totalNeeded = Math.min(
          slotAllocation[type] * stackLimit,
          Math.floor(daily[type] * effectiveMaxDays)
        )
        
        for (let i = 0; i < slotAllocation[type]; i++) {
          const remaining = totalNeeded - (i * stackLimit)
          const amount = Math.min(stackLimit, Math.max(0, remaining))
          if (amount > 0) {
            slots.push({ type, amount })
          }
        }
      }
    })
    
    // Fill remaining with empty
    while (slots.length < SLOTS) {
      slots.push({ type: 'empty' })
    }
    
    // Calculate total materials needed (actual amounts in TC, capped at wipe)
    const totalMaterials = {}
    Object.keys(daily).forEach(type => {
      if (slotAllocation[type] > 0) {
        const stackLimit = STACK_LIMITS[type]
        totalMaterials[type] = Math.min(
          slotAllocation[type] * stackLimit,
          Math.floor(daily[type] * effectiveMaxDays)
        )
      }
    })
    
    return { 
      slots, 
      maxDays: maxDays === Infinity ? 0 : maxDays,
      effectiveMaxDays: effectiveMaxDays === Infinity ? 0 : effectiveMaxDays,
      totalMaterials,
      daysUntilWipe
    }
  }, [mainTC, countdown.fractionalDays])
  
  const handleSaveTC = () => {
    if (!tcEntry.name.trim()) return
    
    if (editingId) {
      const updatedTCs = additionalTCs.map(tc => 
        tc.id === editingId ? { ...tc, ...tcEntry } : tc
      )
      updateTCData({ additionalTCs: updatedTCs })
      setEditingId(null)
    } else {
      const newTCs = [...additionalTCs, {
        id: Date.now(),
        ...tcEntry
      }]
      updateTCData({ additionalTCs: newTCs })
    }
    
    setTcEntry({ name: '', woodUpkeep: 0, stoneUpkeep: 0, metalUpkeep: 0, hqmUpkeep: 0, remainingDays: '', remainingHours: '', remainingMinutes: '' })
    setShowAddModal(false)
  }
  
  const handleEditTC = (tc) => {
    setTcEntry({
      name: tc.name,
      woodUpkeep: tc.woodUpkeep || 0,
      stoneUpkeep: tc.stoneUpkeep,
      metalUpkeep: tc.metalUpkeep,
      hqmUpkeep: tc.hqmUpkeep,
      remainingDays: tc.remainingDays || '',
      remainingHours: tc.remainingHours || '',
      remainingMinutes: tc.remainingMinutes || ''
    })
    setEditingId(tc.id)
    setShowAddModal(true)
  }
  
  const handleDeleteTC = (id) => {
    const filteredTCs = additionalTCs.filter(tc => tc.id !== id)
    updateTCData({ additionalTCs: filteredTCs })
  }
  
  return (
    <div className="border border-orange-600/50 rounded-lg bg-gray-800 mb-3">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="bg-gray-800 rounded-lg text-orange-200">
        {/* Header */}
        <div className="px-3 py-1 border-b border-orange-600/30">
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-xs text-orange-200">
              <input 
                type="checkbox" 
                checked={goodForWipe}
                onChange={e => updateTCData({ goodForWipe: e.target.checked })}
                className="mr-1 text-orange-600 bg-gray-800 border-orange-600/50 rounded focus:ring-orange-500"
              />
              Good for wipe
            </label>
            <label className="flex items-center text-xs text-orange-200">
              <input 
                type="checkbox" 
                checked={trackForTotal}
                onChange={e => updateTCData({ trackForTotal: e.target.checked })}
                className="mr-1 text-orange-600 bg-gray-800 border-orange-600/50 rounded focus:ring-orange-500"
              />
              Track for total
            </label>
            <label className="flex items-center text-xs text-orange-200" title="Enable to track and countdown remaining upkeep time">
              <input 
                type="checkbox" 
                checked={trackRemainingTime}
                onChange={e => updateTCData({ trackRemainingTime: e.target.checked })}
                className="mr-1 text-orange-600 bg-gray-800 border-orange-600/50 rounded focus:ring-orange-500"
              />
              Track time
            </label>
          </div>
        </div>
        
        {/* Main TC Section */}
        <div className="px-3 py-1 border-b border-orange-600/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-orange-300 font-mono">Main TC Daily Upkeep</span>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="DD"
                value={timerDays}
                onChange={e => handleInputChange('timerDays', e.target.value, 99)}
                onKeyPress={handleKeyPress}
                onBlur={handleBlur}
                disabled={!trackRemainingTime}
                className={`w-8 border border-orange-600/40 rounded-l px-1 text-xs text-center font-mono bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none ${
                  !trackRemainingTime ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                  isLowTime() ? 'text-red-400 font-bold' : ''
                }`}
                maxLength="2"
              />
              <span className={`text-xs px-0.5 ${!trackRemainingTime ? 'text-gray-400' : ''}`}>:</span>
              <input
                type="text"
                placeholder="HH"
                value={timerHours}
                onChange={e => handleInputChange('timerHours', e.target.value, 23)}
                onKeyPress={handleKeyPress}
                onBlur={handleBlur}
                disabled={!trackRemainingTime}
                className={`w-8 border-y border-orange-600/40 px-1 text-xs text-center font-mono bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none ${
                  !trackRemainingTime ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                  isLowTime() ? 'text-red-400 font-bold' : ''
                }`}
                maxLength="2"
              />
              <span className={`text-xs px-0.5 ${!trackRemainingTime ? 'text-gray-400' : ''}`}>:</span>
              <input
                type="text"
                placeholder="MM"
                value={timerMinutes}
                onChange={e => handleInputChange('timerMinutes', e.target.value, 59)}
                onKeyPress={handleKeyPress}
                onBlur={handleBlur}
                disabled={!trackRemainingTime}
                className={`w-8 border border-orange-600/40 rounded-r px-1 text-xs text-center font-mono bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none ${
                  !trackRemainingTime ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                  isLowTime() ? 'text-red-400 font-bold' : ''
                }`}
                maxLength="2"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {['wood', 'stone', 'metal', 'hqm'].map(type => (
              <div key={type}>
                <label className="text-xs text-orange-400 block font-mono">{type.toUpperCase()}</label>
                <input
                  type="number"
                  value={mainTC[type]}
                  onChange={e => updateTCData({ mainTC: { ...mainTC, [type]: e.target.value } })}
                  className="w-full border border-orange-600/40 rounded px-1 py-0.5 text-sm bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                  min="0"
                  placeholder=""
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* External TCs Section */}
        <div className="px-3 py-1 border-b border-orange-600/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-orange-300 font-mono">External TCs</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowTCAdvanced(true)}
                className="px-2 py-1 text-xs rounded text-white font-mono bg-blue-500 hover:bg-blue-600"
                title={(() => {
                  const hasUpkeep = getNumericValue(mainTC.wood) > 0 || getNumericValue(mainTC.stone) > 0 || 
                                   getNumericValue(mainTC.metal) > 0 || getNumericValue(mainTC.hqm) > 0
                  if (!hasUpkeep) return "Set upkeep amounts first"
                  
                  if (!trackRemainingTime) return "Open TC Advanced Storage Calculator"
                  
                  const days = parseInt(timerDays) || 0
                  const hours = parseInt(timerHours) || 0
                  const minutes = parseInt(timerMinutes) || 0
                  const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes
                  const wipeMinutes = countdown.days * 24 * 60 + countdown.hours * 60
                  
                  if (totalMinutes >= wipeMinutes * 0.8) {
                    return "TC has enough resources for wipe"
                  } else {
                    return "TC needs more resources for wipe"
                  }
                })()}
              >
                TC Advanced
              </button>
            </div>
            <button
              onClick={() => {
                setTcEntry({ name: '', woodUpkeep: 0, stoneUpkeep: 0, metalUpkeep: 0, hqmUpkeep: 0, remainingDays: '', remainingHours: '', remainingMinutes: '' })
                setEditingId(null)
                setShowAddModal(true)
              }}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-mono"
            >
              + Add TC
            </button>
          </div>
          <div className="border border-orange-600/40 rounded max-h-40 overflow-y-auto overflow-x-hidden bg-gray-900">
            <div className="flex justify-between items-center py-0.5 px-2 border-b border-orange-600/30 text-xs font-medium bg-gray-800">
              <div className="flex items-center">
                <span className="w-14 text-[10px] text-orange-400 font-mono">Time</span>
                <span className="border-l border-orange-600/30 pl-2 w-24 text-orange-400 font-mono">Name:</span>
              </div>
              <div className="flex items-center space-x-6">
                <span className="w-32 text-center text-orange-400 font-mono">Upkeep per day</span>
                <div className="flex items-center space-x-1">
                  <span className="text-orange-400 font-mono">Edits</span>
                </div>
              </div>
            </div>
            
            {additionalTCs.length === 0 ? (
              <div className="py-1.5 px-3 text-xs text-orange-400/60 text-center font-mono">No external TCs added</div>
            ) : (
              additionalTCs.map(tc => (
                <div key={tc.id} className="flex justify-between items-center py-0.5 px-2 border-b border-orange-600/20 text-xs bg-gray-900">
                  <div className="flex items-center">
                    <span className="w-14 text-orange-200 font-mono text-[10px]">
                      {tc.remainingDays || tc.remainingHours || tc.remainingMinutes ? 
                        `${tc.remainingDays || '00'}:${tc.remainingHours || '00'}:${tc.remainingMinutes || '00'}` : 
                        '--:--:--'
                      }
                    </span>
                    <span className="border-l border-orange-600/30 pl-2 w-24 text-orange-200 font-mono truncate">{tc.name}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <span className="w-32 text-center text-orange-200 font-mono">
                      {(() => {
                        const materials = []
                        if (tc.woodUpkeep > 0) materials.push(`W${tc.woodUpkeep}`)
                        if (tc.stoneUpkeep > 0) materials.push(`S${tc.stoneUpkeep}`)
                        if (tc.metalUpkeep > 0) materials.push(`M${tc.metalUpkeep}`)
                        if (tc.hqmUpkeep > 0) materials.push(`H${tc.hqmUpkeep}`)
                        return materials.length > 0 ? materials.join(' ') : '--'
                      })()}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditTC(tc)}
                        className="text-orange-500 hover:text-orange-300 text-xs font-mono"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTC(tc.id)}
                        className="text-red-500 hover:text-red-300 text-xs font-mono"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Totals Section */}
        <div className="px-3 py-1 border-b border-orange-600/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-medium text-orange-300 font-mono">Daily Upkeep:</div>
              <div className="space-y-0.5">
                {Object.entries(totals.daily).map(([type, amount]) => (
                  amount > 0 && (
                    <div key={type} className="flex justify-between text-orange-200">
                      <span className="font-mono">{type.toUpperCase()}:</span>
                      <span className="font-mono">{formatNumber(amount)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium text-orange-300 font-mono">Until Wipe:</div>
              <div className="space-y-0.5">
                {Object.entries(totals.untilWipe).map(([type, amount]) => (
                  amount > 0 && (
                    <div key={type} className="flex justify-between text-orange-200">
                      <span className="font-mono">{type.toUpperCase()}:</span>
                      <span className="font-mono">{formatNumber(amount)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add TC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-orange-600/50" style={{ width: '350px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-3 py-2 border-b border-orange-600/30">
              <span className="text-sm font-semibold text-orange-300 font-mono">{editingId ? 'Edit TC' : 'Add External TC'}</span>
              <button onClick={() => setShowAddModal(false)} className="text-orange-400 hover:text-orange-200">×</button>
            </div>
            <div className="px-3 py-2 space-y-2">
              <div>
                <label className="text-xs text-orange-400 block font-mono">TC Name</label>
                <input
                  type="text"
                  value={tcEntry.name}
                  onChange={e => setTcEntry({ ...tcEntry, name: e.target.value })}
                  className="w-full border border-orange-600/40 rounded px-2 py-1 text-sm bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                  placeholder="Enter TC name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['wood', 'stone', 'metal', 'hqm'].map(type => (
                  <div key={type}>
                    <label className="text-xs text-orange-400 block font-mono">{type.toUpperCase()} Upkeep</label>
                    <input
                      type="number"
                      value={tcEntry[`${type}Upkeep`]}
                      onChange={e => setTcEntry({ ...tcEntry, [`${type}Upkeep`]: Number(e.target.value) })}
                      className="w-full border border-orange-600/40 rounded px-1 py-0.5 text-sm bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                      min="0"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-orange-400 block font-mono">Remaining Time</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={tcEntry.remainingDays}
                    onChange={e => setTcEntry({ ...tcEntry, remainingDays: e.target.value })}
                    className="w-16 border border-orange-600/40 rounded px-1 py-0.5 text-xs text-center bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                    placeholder="DD"
                    maxLength="2"
                  />
                  <span className="text-xs text-orange-400">:</span>
                  <input
                    type="text"
                    value={tcEntry.remainingHours}
                    onChange={e => setTcEntry({ ...tcEntry, remainingHours: e.target.value })}
                    className="w-16 border border-orange-600/40 rounded px-1 py-0.5 text-xs text-center bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                    placeholder="HH"
                    maxLength="2"
                  />
                  <span className="text-xs text-orange-400">:</span>
                  <input
                    type="text"
                    value={tcEntry.remainingMinutes}
                    onChange={e => setTcEntry({ ...tcEntry, remainingMinutes: e.target.value })}
                    className="w-16 border border-orange-600/40 rounded px-1 py-0.5 text-xs text-center bg-gray-900 text-orange-200 focus:border-orange-500 focus:outline-none font-mono"
                    placeholder="MM"
                    maxLength="2"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 px-3 py-2 border-t border-orange-600/30">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 text-sm text-orange-400 hover:text-orange-200 font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTC}
                className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 font-mono"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TC Advanced Modal */}
      {showTCAdvanced && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowTCAdvanced(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-orange-600/50 p-3" style={{ width: '320px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-orange-300 font-mono">TC Advanced - Maximum Upkeep</h3>
              <button onClick={() => setShowTCAdvanced(false)} className="text-orange-400 hover:text-orange-200 text-lg">×</button>
            </div>
            
            {/* 24 Slot Grid */}
            <div className="border border-orange-600/40 rounded-lg p-2 mb-3 bg-gray-900/30">
              <div className="grid grid-cols-6 gap-0">
                {calculateOptimalStorage.slots.map((slot, i) => (
                  <div 
                    key={i} 
                    className={`w-10 h-10 border flex flex-col items-center justify-center text-xs font-bold
                      ${slot.type === 'empty' ? 'bg-gray-50 border-gray-300' : 
                        slot.type === 'stone' ? 'bg-gray-600 border-gray-700 text-white' :
                        slot.type === 'metal' ? 'bg-gray-500 border-gray-600 text-white' :
                        slot.type === 'wood' ? 'bg-yellow-600 border-yellow-700 text-white' :
                        'bg-blue-600 border-blue-700 text-white'}`}
                  >
                    {slot.type !== 'empty' && (
                      <>
                        <span className="text-[10px] leading-none">
                          {slot.type === 'wood' ? 'W' : 
                           slot.type === 'stone' ? 'S' :
                           slot.type === 'metal' ? 'M' : 'HQM'}
                        </span>
                        <span className="text-[10px]">{slot.amount}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Summary */}
            <div className="text-xs space-y-2 bg-gray-900/30 rounded-lg p-3 border border-orange-600/30">
              <div className="font-semibold text-orange-200 font-mono">
                Days until wipe: 
                <span className="text-orange-400 ml-1">
                  {Math.floor(calculateOptimalStorage.daysUntilWipe)} days {Math.floor((calculateOptimalStorage.daysUntilWipe % 1) * 24)} hours
                </span>
              </div>
              
              {/* Current TC Status based on timer */}
              {(() => {
                const days = parseInt(timerDays) || 0
                const hours = parseInt(timerHours) || 0
                const minutes = parseInt(timerMinutes) || 0
                const currentTimeInDays = days + (hours / 24) + (minutes / (24 * 60))
                const daysUntilWipe = calculateOptimalStorage.daysUntilWipe
                
                if ((currentTimeInDays > 0 || isTimerActive) && calculateOptimalStorage.effectiveMaxDays > 0 && trackRemainingTime) {
                  const currentInTC = {}
                  const neededToAdd = {}
                  
                  Object.keys(mainTC).forEach(type => {
                    const numericValue = getNumericValue(mainTC[type])
                    if (numericValue > 0) {
                      currentInTC[type] = Math.floor(numericValue * currentTimeInDays)
                      const maxInTC = calculateOptimalStorage.totalMaterials[type] || 0
                      neededToAdd[type] = Math.max(0, maxInTC - currentInTC[type])
                    }
                  })
                  
                  const timeRemaining = currentTimeInDays
                  const daysRem = Math.floor(timeRemaining)
                  const hoursRem = Math.floor((timeRemaining % 1) * 24)
                  const minutesRem = Math.floor(((timeRemaining % 1) * 24 % 1) * 60)
                  
                  return (
                    <>
                      {Object.keys(currentInTC).length > 0 && (
                        <div>
                          <div className="font-semibold text-orange-200 mb-1 font-mono">Currently in TC ({daysRem}d {hoursRem}h {minutesRem}m remaining):</div>
                          <div className="grid grid-cols-1 gap-1 mb-2">
                            {Object.entries(currentInTC).map(([type, amount]) => (
                              <div key={type} className="flex justify-between">
                                <span className="text-orange-300 font-mono">{type.toUpperCase()}:</span>
                                <span className="font-bold text-orange-100 font-mono">{formatNumber(amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {calculateOptimalStorage.effectiveMaxDays > 0 && (
                        <div>
                          <div className="font-semibold text-orange-200 mb-1 font-mono">
                            Max Upkeep in TC:
                          </div>
                          <div className="grid grid-cols-1 gap-1 mb-2">
                            {Object.entries(calculateOptimalStorage.totalMaterials).map(([type, amount]) => (
                              <div key={type} className="flex justify-between">
                                <span className="text-orange-300 font-mono">{type.toUpperCase()}:</span>
                                <span className="font-bold text-orange-100 font-mono">{formatNumber(amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {Object.values(neededToAdd).some(val => val > 0) && (
                        <div>
                          <div className="font-semibold text-orange-200 mb-1 font-mono">Upkeep that can fit(+{Math.floor(daysUntilWipe - currentTimeInDays)}d {Math.floor(((daysUntilWipe - currentTimeInDays) % 1) * 24)}h):</div>
                          <div className="grid grid-cols-1 gap-1 mb-2">
                            {Object.entries(neededToAdd).map(([type, amount]) => 
                              amount > 0 && (
                                <div key={type} className="flex justify-between">
                                  <span className="text-orange-300 font-mono">{type.toUpperCase()}:</span>
                                  <span className="font-bold text-red-400 font-mono">{formatNumber(amount)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                }
                
                return calculateOptimalStorage.effectiveMaxDays > 0 && (
                  <div>
                    <div className="font-semibold text-orange-200 mb-1 font-mono">
                      Max Upkeep in TC:
                    </div>
                    <div className="grid grid-cols-1 gap-1 mb-2">
                      {Object.entries(calculateOptimalStorage.totalMaterials).map(([type, amount]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-orange-300 font-mono">{type.toUpperCase()}:</span>
                          <span className="font-bold text-orange-100 font-mono">{formatNumber(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              
              <div className="text-[10px] text-orange-400/60 border-t border-orange-600/30 pt-2 font-mono">
                Resources are optimized to last until wipe. No materials are wasted on upkeep beyond the wipe time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}