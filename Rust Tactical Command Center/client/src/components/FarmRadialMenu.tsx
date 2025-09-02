import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTimerDisplay, plantTypeMapping } from '@/lib/geneticTimingUtils';

interface FarmRadialMenuProps {
  onOpenTaskReport?: (baseData: { baseId: string; baseName: string; baseCoords: string }) => void;
  onCreateExpressTaskReport?: (baseData: { baseId: string; baseName: string; baseCoords: string; pickupType: string }) => void;
  onOpenBaseReport?: (location: { id: string; name: string; coordinates: string; type: string }) => void;
  onAddTimer?: (locationId: string, timer: { id: number; type: string; remaining: number; activity?: string; plantEmoji?: string; plantName?: string }) => void;
  locationId?: string;
  baseId?: string;
  baseName?: string;
  baseCoords?: string;
  tcData?: {
    mainTC?: { wood?: string; stone?: string; metal?: string; hqm?: string };
    trackRemainingTime?: boolean;
    timerDays?: string;
    timerHours?: string;
    timerMinutes?: string;
  };
  wipeCountdown?: {
    days: number;
    hours: number;
    fractionalDays: number;
  };
}

const RadialMenu = ({ onOpenTaskReport, onCreateExpressTaskReport, onOpenBaseReport, onAddTimer, locationId, baseId, baseName, baseCoords, tcData, wipeCountdown }: FarmRadialMenuProps) => {
  // Fetch genetic data
  const { data: geneticData = [] } = useQuery({
    queryKey: ['/api/genetic-data'],
    refetchInterval: 2000,
    staleTime: 1000
  });
  const [selectedInner, setSelectedInner] = useState(null);
  const [selectedOuter, setSelectedOuter] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [segment1A1Value, setSegment1A1Value] = useState('00');
  const [segment1A2Value, setSegment1A2Value] = useState('00');
  const [segmentCoreValue, setSegmentCoreValue] = useState('00');
  const [isExpanded, setIsExpanded] = useState(false);

  
  // Resource values in raw numbers (will be divided by 1000 for display)
  const [resources, setResources] = useState({
    stone: 0,
    metal: 0,
    hqm: 0,
    wood: 0
  });
  
  // Decay schedule values
  const [decayResources, setDecayResources] = useState({
    stone: { current: 0, max: 500 },
    metal: { current: 0, max: 1000 },
    hqm: { current: 0, max: 2000 }
  });
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        const hasActiveOverlay = selectedInner !== null;
        
        if (hasActiveOverlay) {
          setSelectedInner(null);
        } else if (isExpanded) {
          setIsExpanded(false);
          setSelectedInner(null);
          setSelectedOuter(null);
          setHoveredSegment(null);
          setSegment1A1Value('00');
          setSegment1A2Value('00');
          setSegmentCoreValue('00');
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedInner, isExpanded]);
  
  // Configuration
  const centerX = 220;
  const centerY = 250;
  const innerRadius = 40;
  const middleRadius = 150;
  const outerRadius = 190;
  const startAngle = 180;
  const segments = 6;
  const totalAngle = 270;
  const segmentAngle = totalAngle / segments;
  
  // Gap texts for each section
  const gapTexts = [
    'HARVEST TIMER',   // Red section (index 0)
    'NEEDS PICKUP',    // Yellow section (index 1)
    'REPAIR/UPGRADE',  // Green section (index 2)
    'NEEDS RESOURCES', // Light blue section (index 3)
    'DECAYING OUT',    // Blue section (index 4)
    'MAKE REPORT'      // Purple section (index 5)
  ];

  // Resource configuration
  const resourceConfig = [
    { name: 'Stone', key: 'stone', color: 'white', radius: 18 },
    { name: 'Metal', key: 'metal', color: 'white', radius: 30 },
    { name: 'HQM', key: 'hqm', color: 'white', radius: 42, 
      style: { textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0px 0px 3px rgba(255,255,255,0.3)' } },
    { name: 'Wood', key: 'wood', color: 'white', radius: 54 }
  ];

  // Plant emojis configuration
  const plantEmojis = {
    '0-green': { emoji: '🌿', name: 'Hemp' },
    '0-0-bottom': { emoji: '🍋', name: 'Yellow Berries' },
    '0-0-top': { emoji: '🎃', name: 'Pumpkin' },
    '0-1-bottom': { emoji: '🍓', name: 'Red Berries' },
    '0-1-top': { emoji: '🫐', name: 'Blueberries' }
  };
  
  // Handle Action button click
  const handleActionClick = () => {
    if (isExpanded) {
      setSelectedInner(null);
      setSelectedOuter(null);
      setHoveredSegment(null);
      setSegment1A1Value('00');
      setSegment1A2Value('00');
      setSegmentCoreValue('00');
    }
    setIsExpanded(!isExpanded);
  };
  


  // Function to update resource values
  const updateResources = (updates) => {
    setResources(prev => ({ ...prev, ...updates }));
  };
  
  // Calculate TC resource values using same logic as TC Advanced modal
  const calculateTCResources = () => {
    if (!tcData || !tcData.mainTC || !wipeCountdown?.fractionalDays) {
      return { wood: 0, stone: 0, metal: 0, hqm: 0 };
    }

    const getNumericValue = (val) => {
      if (!val || val === "") return 0;
      const num = parseInt(val);
      return isNaN(num) ? 0 : num;
    };

    const daily = {
      wood: getNumericValue(tcData.mainTC.wood),
      stone: getNumericValue(tcData.mainTC.stone),
      metal: getNumericValue(tcData.mainTC.metal),
      hqm: getNumericValue(tcData.mainTC.hqm)
    };
    
    const SLOTS = 24;
    const STACK_LIMITS = { wood: 1000, stone: 1000, metal: 1000, hqm: 100 };
    
    // Skip if no upkeep
    const totalDaily = daily.wood + daily.stone + daily.metal + daily.hqm;
    if (totalDaily === 0) {
      return { wood: 0, stone: 0, metal: 0, hqm: 0 };
    }
    
    // Initialize slot allocation
    let slotAllocation = { wood: 0, stone: 0, metal: 0, hqm: 0 };
    let remainingSlots = SLOTS;
    
    // Allocate slots to maximize minimum days
    while (remainingSlots > 0) {
      let worstType = null;
      let worstDays = Infinity;
      
      Object.keys(daily).forEach(type => {
        if (daily[type] > 0) {
          const currentCapacity = slotAllocation[type] * STACK_LIMITS[type];
          const days = currentCapacity / daily[type];
          if (days < worstDays) {
            worstDays = days;
            worstType = type;
          }
        }
      });
      
      if (worstType) {
        slotAllocation[worstType]++;
        remainingSlots--;
      } else {
        break;
      }
    }
    
    // Calculate actual max days
    let maxDays = Infinity;
    Object.keys(daily).forEach(type => {
      if (daily[type] > 0) {
        const capacity = slotAllocation[type] * STACK_LIMITS[type];
        const days = capacity / daily[type];
        maxDays = Math.min(maxDays, days);
      }
    });
    
    // Cap max days at wipe time
    const daysUntilWipe = wipeCountdown.fractionalDays;
    const effectiveMaxDays = Math.min(maxDays, daysUntilWipe);
    
    // Calculate total materials (Max Upkeep in TC)
    const totalMaterials = {};
    Object.keys(daily).forEach(type => {
      if (daily[type] > 0) {
        const totalNeeded = Math.min(
          slotAllocation[type] * STACK_LIMITS[type],
          Math.floor(daily[type] * effectiveMaxDays)
        );
        totalMaterials[type] = totalNeeded;
      } else {
        totalMaterials[type] = 0;
      }
    });

    // If timer is set, calculate "Max Upkeep in TC" - "Currently in TC"
    if (tcData.trackRemainingTime && (parseInt(tcData.timerDays) > 0 || parseInt(tcData.timerHours) > 0 || parseInt(tcData.timerMinutes) > 0)) {
      const timerDays = parseInt(tcData.timerDays) || 0;
      const timerHours = parseInt(tcData.timerHours) || 0; 
      const timerMinutes = parseInt(tcData.timerMinutes) || 0;
      const currentTimeInDays = timerDays + (timerHours / 24) + (timerMinutes / (24 * 60));
      
      const result = {};
      Object.keys(daily).forEach(type => {
        if (daily[type] > 0) {
          const currentInTC = Math.floor(daily[type] * currentTimeInDays);
          const maxInTC = totalMaterials[type] || 0;
          result[type] = Math.max(0, maxInTC - currentInTC);
        } else {
          result[type] = 0;
        }
      });
      
      return result;
    }

    // No timer: show full "Max Upkeep in TC"
    return totalMaterials;
  };

  // Format resource value with K suffix
  const formatResourceValue = (value) => {
    if (!value || value === 0) return '';
    return value >= 1000 
      ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K` 
      : value.toString();

  };
  
  // Generate path for a segment
  const createPath = (startRadius, endRadius, segmentIndex, subSegment = null, customAngles = null) => {
    let startSegmentAngle, endSegmentAngle;
    
    if (customAngles) {
      startSegmentAngle = customAngles.start;
      endSegmentAngle = customAngles.end;
    } else {
      startSegmentAngle = startAngle + (segmentIndex * segmentAngle);
      endSegmentAngle = startSegmentAngle + segmentAngle;
      
      if (subSegment !== null) {
        const halfSegment = segmentAngle / 2;
        if (subSegment === 0) {
          endSegmentAngle = startSegmentAngle + halfSegment;
        } else {
          startSegmentAngle = startSegmentAngle + halfSegment;
        }
      }
    }
    
    const startAngleRad = (startSegmentAngle * Math.PI) / 180;
    const endAngleRad = (endSegmentAngle * Math.PI) / 180;
    
    const x1 = centerX + startRadius * Math.cos(startAngleRad);
    const y1 = centerY + startRadius * Math.sin(startAngleRad);
    const x2 = centerX + endRadius * Math.cos(startAngleRad);
    const y2 = centerY + endRadius * Math.sin(startAngleRad);
    const x3 = centerX + endRadius * Math.cos(endAngleRad);
    const y3 = centerY + endRadius * Math.sin(endAngleRad);
    const x4 = centerX + startRadius * Math.cos(endAngleRad);
    const y4 = centerY + startRadius * Math.sin(endAngleRad);
    
    const largeArcFlag = (endSegmentAngle - startSegmentAngle) > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${endRadius} ${endRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${startRadius} ${startRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
    `;
  };
  
  // Generate gradient colors
  const getColor = (index, isOuter, subSegment = null) => {
    if (isOuter) {
      const segmentId = `outer-${index}`;
      const isGrey = index === 4 || index === 5;
      const baseColor = isGrey ? 'hsl(0, 0%,' : 'hsl(0, 70%,';
      const lightness = hoveredSegment === segmentId ? 55 : 45;
      return `${baseColor} ${lightness}%)`;
    }
    
    // Special cases for specific segments
    if (index === 0 && subSegment === 0) {
      const segmentId = `inner-${index}-${subSegment}`;
      const lightness = hoveredSegment === segmentId ? 70 : 60;
      return `hsl(50, 85%, ${lightness}%)`;
    }
    
    if (index === 3) {
      const segmentId = `inner-${index}`;
      const lightness = hoveredSegment === segmentId ? 65 : 55;
      return `hsl(200, 70%, ${lightness}%)`;
    }
    
    if (index === 4) {
      const segmentId = `inner-${index}`;
      const lightness = hoveredSegment === segmentId ? 35 : 25;
      return `hsl(30, 50%, ${lightness}%)`;
    }
    
    if (index === 5) {
      const segmentId = `inner-${index}`;
      const lightness = hoveredSegment === segmentId ? 70 : 60;
      return `hsl(30, 45%, ${lightness}%)`;
    }
    
    if (index === 1) {
      const segmentId = subSegment !== null ? `inner-${index}-${subSegment}` : `inner-${index}`;
      const baseLightness = subSegment === 0 ? 40 : 50;
      const lightness = hoveredSegment === segmentId ? baseLightness + 10 : baseLightness;
      return `hsl(0, 0%, ${lightness}%)`;
    }
    
    const hue = (index * 360) / segments;
    const saturation = 60;
    let lightness = subSegment === 0 ? 50 : 60;
    const segmentId = subSegment !== null ? `inner-${index}-${subSegment}` : `inner-${index}`;
    
    if (hoveredSegment === segmentId) {
      lightness += 10;
    }
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  
  // Handle clicks
  const handleClick = (type, index, subSegment = null) => {
    if (type === 'inner') {
      const id = subSegment !== null ? `${index}-${subSegment}` : index;
      setSelectedInner(id);
      const plant = plantEmojis[id];
      const label = plant ? `${plant.name} ${plant.emoji}` :
                    id === '1-0' ? 'Rock 🪨' : 
                    id === '1-1' ? 'Package 📦💎' :
                    id === '2-0' ? 'Wrench 🔧' :
                    id === '2-1' ? 'Window/Brick 🪟🧱' :
                    id === 3 ? 'Resources 📋' :
                    id === 4 ? 'DECAY' :
                    id === 5 ? 'Folder 📁' :
                    `${index + 1}A${subSegment ? subSegment + 1 : ''}`;
      console.log(`Inner segment ${label} selected`);
      
      // Handle "MAKE REPORT" section click (index 5)
      if (id === 5 && onOpenBaseReport && baseId && baseName && baseCoords) {
        onOpenBaseReport({ 
          id: baseId, 
          name: baseName, 
          coordinates: baseCoords, 
          type: 'friendly-farm' 
        });
      }
      
      // Just set selection for NEEDS PICKUP section, don't create report yet
    } else {
      setSelectedOuter(index);
      console.log(`Outer segment ADVANCED (position ${index + 1}) selected`);
      
      // Handle "NEEDS PICKUP" Advanced button click (index 1)
      if (index === 1 && onOpenTaskReport && baseId && baseName && baseCoords) {
        // Open full task report modal (pulsating overlay handles express reports)
        onOpenTaskReport({ baseId, baseName, baseCoords });
      }
      
      // Handle "REPAIR/UPGRADE" Advanced button click (index 2)
      if (index === 2 && onOpenTaskReport && baseId && baseName && baseCoords) {
        // Open task report modal with repair_upgrade dropdown pre-selected
        onOpenTaskReport({ baseId, baseName, baseCoords, taskType: 'repair_upgrade' });
      }
      
      // Handle "NEEDS RESOURCES" Advanced button click (index 3)
      if (index === 3 && onOpenTaskReport && baseId && baseName && baseCoords) {
        // Open task report modal with request_resources dropdown pre-selected
        onOpenTaskReport({ baseId, baseName, baseCoords, taskType: 'request_resources' });
      }
    }
  };
  
  // Generate label position
  const getLabelPosition = (radius, segmentIndex, subSegment = null) => {
    let midAngle = startAngle + (segmentIndex * segmentAngle) + (segmentAngle / 2);
    
    if (subSegment !== null) {
      const quarterSegment = segmentAngle / 4;
      midAngle = startAngle + (segmentIndex * segmentAngle) + 
                 (subSegment === 0 ? quarterSegment : quarterSegment * 3);
    }
    
    const angleRad = (midAngle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return { x, y };
  };
  
  // Generate arrow positions
  const getArrowData = (baseRadius, segmentIndex, subSegment = null, isCore = false) => {
    let midAngle;
    
    if (isCore) {
      midAngle = startAngle + (segmentAngle / 2);
    } else if (subSegment !== null) {
      const quarterSegment = segmentAngle / 4;
      midAngle = startAngle + (segmentIndex * segmentAngle) + 
                 (subSegment === 0 ? quarterSegment : quarterSegment * 3);
    } else {
      midAngle = startAngle + (segmentIndex * segmentAngle) + (segmentAngle / 2);
    }
    
    const angleRad = (midAngle * Math.PI) / 180;
    const upRadius = baseRadius + 15;
    const downRadius = baseRadius - 5;
    
    const upX = centerX + upRadius * Math.cos(angleRad);
    const upY = centerY + upRadius * Math.sin(angleRad);
    const downX = centerX + downRadius * Math.cos(angleRad);
    const downY = centerY + downRadius * Math.sin(angleRad);
    const rotation = (midAngle + 90) % 360;
    
    return { upX, upY, downX, downY, rotation };
  };
  
  // Handle number increment/decrement
  const handleNumberChange = (field, increment) => {
    const updateValue = (currentValue) => {
      let num = parseInt(currentValue || '0');
      if (increment) {
        num = (num + 1) % 100;
      } else {
        num = num === 0 ? 99 : num - 1;
      }
      return num.toString().padStart(2, '0');
    };
    
    const updateCoreValue = (currentValue) => {
      let num = parseInt(currentValue || '0');
      if (increment) {
        num = num === 90 ? 0 : num + 10;
      } else {
        num = num === 0 ? 90 : num - 10;
      }
      return num.toString().padStart(2, '0');
    };
    
    if (field === 'core') {
      setSegmentCoreValue(updateCoreValue(segmentCoreValue));
    } else if (field === '1a1') {
      setSegment1A1Value(updateValue(segment1A1Value));
    } else if (field === '1a2') {
      setSegment1A2Value(updateValue(segment1A2Value));
    }
  };

  // Handle decay resource changes
  const handleDecayResourceChange = (resourceType, increment) => {
    setDecayResources(prev => {
      const current = prev[resourceType].current;
      const max = prev[resourceType].max;
      let newValue;
      
      if (increment) {
        newValue = Math.min(current + 50, max);
      } else {
        newValue = Math.max(current - 50, 0);
      }
      
      return {
        ...prev,
        [resourceType]: { ...prev[resourceType], current: newValue }
      };
    });
  };


  // Calculate decay time in seconds based on current health
  const calculateDecayTime = (resourceType, currentHealth) => {
    if (currentHealth <= 0) return 0;
    
    // Decay rates per hour based on Rust game mechanics
    const decayRates = {
      stone: 10,  // Stone loses 10 HP per hour
      metal: 8,   // Metal loses 8 HP per hour  
      hqm: 2      // HQM loses 2 HP per hour
    };
    
    const hoursRemaining = currentHealth / decayRates[resourceType];
    return Math.round(hoursRemaining * 3600); // Convert to seconds
  };

  // Create decay timers for resources with health > 0
  const createDecayTimers = () => {
    if (!onAddTimer || !locationId) return;
    
    Object.entries(decayResources).forEach(([resourceType, resource]) => {
      if (resource.current > 0) {
        const timeInSeconds = calculateDecayTime(resourceType, resource.current);
        if (timeInSeconds > 0) {
          onAddTimer(locationId, {
            id: Date.now() + Math.random(),
            type: `${resourceType}_decay`,
            remaining: timeInSeconds
          });
        }
      }
    });
    
    // Reset decay resources after creating timers
    setDecayResources({
      stone: { current: 0, max: 500 },
      metal: { current: 0, max: 1000 },
      hqm: { current: 0, max: 2000 }
    });
    
    setSelectedInner(null);
  };
  // Create text path helper
  const createTextPath = (radius, segmentIndex, startOffset = 3, endOffset = 3) => {
    const startSegmentAngle = startAngle + (segmentIndex * segmentAngle) + startOffset;
    const endSegmentAngle = startAngle + ((segmentIndex + 1) * segmentAngle) - endOffset;
    
    const startAngleRad = (startSegmentAngle * Math.PI) / 180;
    const endAngleRad = (endSegmentAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  // Render pulsating overlay helper
  const renderPulsatingOverlay = (index, leftText, rightText, onLeftClick, onRightClick, showTimers = false, isSplit = false, selectedPlant = null) => {
    const segmentCenterAngle = startAngle + (index * segmentAngle) + (segmentAngle / 2);
    const segmentCenterRadius = (middleRadius + 20 + outerRadius) / 2;
    const angleRad = (segmentCenterAngle * Math.PI) / 180;
    const transformX = centerX + segmentCenterRadius * Math.cos(angleRad);
    const transformY = centerY + segmentCenterRadius * Math.sin(angleRad);
    
    return (
      <g style={{
        transformOrigin: `${transformX}px ${transformY}px`,
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        {isSplit ? (
          <>
            {/* Left half */}
            <path
              d={createPath(middleRadius + 10, outerRadius + 10, null, null, { 
                start: startAngle + (index * segmentAngle), 
                end: startAngle + (index * segmentAngle) + (segmentAngle / 2) 
              })}
              fill="hsl(120, 70%, 50%)"
              fillOpacity="1"
              stroke="hsl(120, 80%, 40%)"
              strokeWidth="3"
              className="cursor-pointer hover:brightness-110"
              filter="url(#greenGlow)"
              onClick={onLeftClick}
            />
            {/* Right half */}
            <path
              d={createPath(middleRadius + 10, outerRadius + 10, null, null, { 
                start: startAngle + (index * segmentAngle) + (segmentAngle / 2), 
                end: startAngle + (index * segmentAngle) + segmentAngle 
              })}
              fill="hsl(120, 70%, 50%)"
              fillOpacity="1"
              stroke="hsl(120, 80%, 40%)"
              strokeWidth="3"
              className="cursor-pointer hover:brightness-110"
              filter="url(#greenGlow)"
              onClick={onRightClick}
            />
            {/* Dividing line */}
            <line
              x1={centerX + (middleRadius + 10) * Math.cos((startAngle + index * segmentAngle + segmentAngle / 2) * Math.PI / 180)}
              y1={centerY + (middleRadius + 10) * Math.sin((startAngle + index * segmentAngle + segmentAngle / 2) * Math.PI / 180)}
              x2={centerX + (outerRadius + 10) * Math.cos((startAngle + index * segmentAngle + segmentAngle / 2) * Math.PI / 180)}
              y2={centerY + (outerRadius + 10) * Math.sin((startAngle + index * segmentAngle + segmentAngle / 2) * Math.PI / 180)}
              stroke="hsl(120, 80%, 35%)"
              strokeWidth="2"
              className="pointer-events-none"
            />
          </>
        ) : (
          /* Full segment overlay */
          <path
            d={createPath(middleRadius + 10, outerRadius + 10, index)}
            fill="hsl(120, 70%, 50%)"
            fillOpacity="1"
            stroke="hsl(120, 80%, 40%)"
            strokeWidth="3"
            className="cursor-pointer hover:brightness-110"
            filter="url(#greenGlow)"
            onClick={onLeftClick}
          />
        )}
        {/* Text labels */}
        {isSplit ? (
          [
            { text: leftText, angle: segmentAngle / 4, timer: showTimers && selectedPlant ? formatTimerDisplay(selectedPlant, geneticData).harvest : (showTimers ? '2:30' : null) },
            { text: rightText, angle: 3 * segmentAngle / 4, timer: showTimers && selectedPlant ? formatTimerDisplay(selectedPlant, geneticData).clone : (showTimers ? '13m' : null) }
          ].map((item, idx) => {
            const textRadius = (middleRadius + 20 + outerRadius) / 2 - 4;
            const textAngle = startAngle + (index * segmentAngle) + item.angle;
            const textAngleRad = (textAngle * Math.PI) / 180;
            const textX = centerX + textRadius * Math.cos(textAngleRad);
            const textY = centerY + textRadius * Math.sin(textAngleRad);
            
            return (
              <g key={idx}>
                <text 
                  x={textX}
                  y={textY}
                  transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white" 
                  fontSize="14" 
                  fontWeight="bold" 
                  className="pointer-events-none select-none" 
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
                >
                  {item.text}
                </text>
                {item.timer && (
                  <text 
                    x={centerX + (outerRadius + 25) * Math.cos(textAngleRad)}
                    y={centerY + (outerRadius + 25) * Math.sin(textAngleRad)}
                    transform={`rotate(${textAngle + 90}, ${centerX + (outerRadius + 25) * Math.cos(textAngleRad)}, ${centerY + (outerRadius + 25) * Math.sin(textAngleRad)})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white" 
                    fontSize="14" 
                    fontWeight="bold" 
                    className="pointer-events-none select-none" 
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {item.timer}
                  </text>
                )}
              </g>
            );
          })
        ) : (
          /* Single centered text */
          <text 
            fill="white" 
            fontSize="14" 
            fontWeight="bold" 
            className="pointer-events-none select-none" 
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
          >
            <textPath href={`#advancedTextPath-${index}`} startOffset="50%" textAnchor="middle">
              {leftText}
            </textPath>
          </text>
        )}
      </g>
    );
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
          transform-origin: ${centerX}px ${centerY}px;
        }
        .subtle-pulse {
          animation: subtlePulse 4s ease-in-out infinite;
          transform-origin: ${centerX}px ${centerY}px;
        }
        @keyframes deployFromCenter {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .deploy-animation {
          animation: deployFromCenter 0.3s ease-out;
          transform-origin: ${centerX}px ${centerY}px;
        }
      `}</style>
      
      <svg width="600" height="500" viewBox="0 0 600 500">
          <defs>
            {/* Filters */}
            <filter id="actionButtonShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
              <feOffset dx="0" dy="3" result="offsetblur"/>
              <feFlood floodColor="#000000" floodOpacity="0.5"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="actionButtonGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feFlood floodColor="#10B981" floodOpacity="0.4"/>
              <feComposite in2="coloredBlur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="greenGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Text paths */}
            {/* Gap text paths */}
            {Array.from({ length: segments }).map((_, index) => (
              <path
                key={`gapPath-${index}`}
                id={`gapTextPath-${index}`}
                d={createTextPath(middleRadius + 8, index)}
              />
            ))}
            
            {/* Advanced text paths */}
            {Array.from({ length: segments }).map((_, index) => (
              <path
                key={`advancedPath-${index}`}
                id={`advancedTextPath-${index}`}
                d={createTextPath((middleRadius + 20 + outerRadius) / 2 - 4, index)}
              />
            ))}
            
            {/* Resource text paths */}
            {resourceConfig.map((resource, idx) => (
              <path
                key={`resourcePath-${resource.key}`}
                id={`${resource.key}TextPath`}
                d={createTextPath(middleRadius - resource.radius, 3)}
              />
            ))}
            
            {/* Plant section text paths */}
            <path id="segment1A2Path" d={createTextPath(innerRadius + ((middleRadius - innerRadius) * 0.25) + ((middleRadius - (innerRadius + ((middleRadius - innerRadius) * 0.25))) * 0.25) - 3, 0, startAngle + segmentAngle/2, startAngle + segmentAngle)} />
            <path id="segment1A1Path" d={createTextPath(innerRadius + ((middleRadius - innerRadius) * 0.25) + ((middleRadius - (innerRadius + ((middleRadius - innerRadius) * 0.25))) * 0.25) - 3, 0, startAngle, startAngle + segmentAngle/2)} />
            <path id="segmentCorePath" d={createTextPath(innerRadius + ((innerRadius + ((middleRadius - innerRadius) * 0.25) - innerRadius) * 0.25) - 3, 0, startAngle, startAngle + segmentAngle)} />
            <path id="hazzyTextPath" d={createTextPath(middleRadius - 8, 0, startAngle + 2, startAngle + segmentAngle/2 - 2)} />
            <path id="fullKitTextPath" d={createTextPath(middleRadius - 8, 0, startAngle + segmentAngle/2 + 2, startAngle + segmentAngle - 2)} />
            <path id="medsTextPath" d={createTextPath(innerRadius + ((innerRadius + ((middleRadius - innerRadius) * 0.25) - innerRadius) * 0.65) + 2, 0, startAngle + 5, startAngle + segmentAngle - 5)} />
          </defs>
          
          {/* Render segments when expanded */}
          {isExpanded && (
            <g className="deploy-animation">
              {/* Green inner segment for HARVEST TIMER */}
              {(() => {
                const innerRadiusRange = middleRadius - innerRadius;
                const cutoffRadius = innerRadius + (innerRadiusRange * 0.25);
                
                return (
                  <g>
                    <path
                      d={createPath(innerRadius, cutoffRadius, null, null, { start: startAngle, end: startAngle + segmentAngle })}
                      fill="hsl(120, 70%, 65%)"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                      className="cursor-pointer transition duration-300 hover:brightness-110"
                      onMouseEnter={() => setHoveredSegment('inner-merged')}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => handleClick('inner', 0, 'green')}
                      style={{
                        filter: selectedInner === '0-green' ? 'brightness(1.3)' : hoveredSegment === 'inner-merged' ? 'brightness(1.1)' : 'none'
                      }}
                    />
                    {/* Hemp emoji */}
                    {(() => {
                      const hempRadius = (innerRadius + cutoffRadius) / 2;
                      const hempAngle = startAngle + (segmentAngle / 2);
                      const hempAngleRad = (hempAngle * Math.PI) / 180;
                      const hempX = centerX + hempRadius * Math.cos(hempAngleRad);
                      const hempY = centerY + hempRadius * Math.sin(hempAngleRad);
                      
                      return (
                        <text
                          x={hempX}
                          y={hempY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="16"
                          className="pointer-events-none select-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          🌿
                        </text>
                      );
                    })()}
                  </g>
                );
              })()}
              
              {/* All segments */}
              {Array.from({ length: segments }).map((_, index) => {
                const innerRadiusRange = middleRadius - innerRadius;
                const cutoffRadius = index === 0 ? innerRadius + (innerRadiusRange * 0.25) : innerRadius + (innerRadiusRange * 0.4);
                
                return (
                  <g key={index}>
                    {/* Inner segment handling */}
                    {index === 0 ? (
                      // HARVEST TIMER section - 4 sub-segments
                      <>
                        {[0, 1].map((mainSubIdx) => {
                          const segmentStart = cutoffRadius;
                          const segmentEnd = middleRadius;
                          const segmentHeight = segmentEnd - segmentStart;
                          const bottomEnd = segmentStart + (segmentHeight * 0.6);
                          
                          return (
                            <g key={`inner-${index}-${mainSubIdx}`}>
                              {/* Bottom sub-segment (60% of height) */}
                              <path
                                d={createPath(segmentStart, bottomEnd, index, mainSubIdx)}
                                fill={mainSubIdx === 1 ? "hsl(0, 60%, 50%)" : "hsl(45, 80%, 50%)"}
                                stroke="rgba(255, 255, 255, 0.2)"
                                strokeWidth="2"
                                className="cursor-pointer transition duration-300 hover:brightness-110"
                                onMouseEnter={() => setHoveredSegment(`inner-${index}-${mainSubIdx}-bottom`)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                onClick={() => handleClick('inner', index, `${mainSubIdx}-bottom`)}
                                style={{
                                  filter: selectedInner === `${index}-${mainSubIdx}-bottom` ? 'brightness(1.3)' : hoveredSegment === `inner-${index}-${mainSubIdx}-bottom` ? 'brightness(1.1)' : 'none'
                                }}
                              />
                              {/* Top sub-segment (40% of height) */}
                              <path
                                d={createPath(bottomEnd, segmentEnd, index, mainSubIdx)}
                                fill={mainSubIdx === 1 ? "hsl(220, 70%, 50%)" : "hsl(25, 85%, 55%)"}
                                stroke={mainSubIdx === 1 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.3)"}
                                strokeWidth="2"
                                className="cursor-pointer transition duration-300 hover:brightness-110"
                                onMouseEnter={() => setHoveredSegment(`inner-${index}-${mainSubIdx}-top`)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                onClick={() => handleClick('inner', index, `${mainSubIdx}-top`)}
                                style={{
                                  filter: selectedInner === `${index}-${mainSubIdx}-top` ? 'brightness(1.3)' : hoveredSegment === `inner-${index}-${mainSubIdx}-top` ? 'brightness(1.1)' : 'none'
                                }}
                              />
                              {/* Dividing line */}
                              <path
                                d={(() => {
                                  const startSegmentAngle = startAngle + (index * segmentAngle) + (mainSubIdx === 0 ? 0 : segmentAngle / 2);
                                  const endSegmentAngle = startSegmentAngle + (segmentAngle / 2);
                                  const startAngleRad = (startSegmentAngle * Math.PI) / 180;
                                  const endAngleRad = (endSegmentAngle * Math.PI) / 180;
                                  
                                  const x1 = centerX + bottomEnd * Math.cos(startAngleRad);
                                  const y1 = centerY + bottomEnd * Math.sin(startAngleRad);
                                  const x2 = centerX + bottomEnd * Math.cos(endAngleRad);
                                  const y2 = centerY + bottomEnd * Math.sin(endAngleRad);
                                  
                                  return `M ${x1} ${y1} A ${bottomEnd} ${bottomEnd} 0 0 1 ${x2} ${y2}`;
                                })()}
                                fill="none"
                                stroke="rgba(0, 0, 0, 0.3)"
                                strokeWidth="1"
                                className="pointer-events-none"
                              />
                              {/* Add emojis */}
                              {(() => {
                                const bottomRadius = segmentStart + ((bottomEnd - segmentStart) / 2);
                                const topRadius = bottomEnd + ((segmentEnd - bottomEnd) / 2);
                                const segmentMidAngle = startAngle + (segmentAngle / 4) + (mainSubIdx * segmentAngle / 2);
                                
                                const bottomAngleRad = (segmentMidAngle * Math.PI) / 180;
                                const topAngleRad = (segmentMidAngle * Math.PI) / 180;
                                
                                const bottomX = centerX + bottomRadius * Math.cos(bottomAngleRad);
                                const bottomY = centerY + bottomRadius * Math.sin(bottomAngleRad);
                                const topX = centerX + topRadius * Math.cos(topAngleRad);
                                const topY = centerY + topRadius * Math.sin(topAngleRad);
                                
                                const bottomEmoji = mainSubIdx === 0 ? '🍋' : '🍓';
                                const topEmoji = mainSubIdx === 0 ? '🎃' : '🫐';
                                
                                return (
                                  <>
                                    <text
                                      x={bottomX}
                                      y={bottomY}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fontSize="16"
                                      className="pointer-events-none select-none"
                                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {bottomEmoji}
                                    </text>
                                    <text
                                      x={topX}
                                      y={topY}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fontSize="16"
                                      className="pointer-events-none select-none"
                                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {topEmoji}
                                    </text>
                                  </>
                                );
                              })()}
                            </g>
                          );
                        })}
                      </>
                    ) : index === 1 ? (
                      // NEEDS PICKUP section
                      <>
                        {[0, 1].map((subIdx) => (
                          <g key={`inner-${index}-${subIdx}`}>
                            <path
                              d={createPath(innerRadius, middleRadius, index, subIdx)}
                              fill={getColor(index, false, subIdx)}
                              stroke="rgba(255, 255, 255, 0.2)"
                              strokeWidth="2"
                              className="cursor-pointer transition duration-300 hover:brightness-110"
                              onMouseEnter={() => setHoveredSegment(`inner-${index}-${subIdx}`)}
                              onMouseLeave={() => setHoveredSegment(null)}
                              onClick={() => handleClick('inner', index, subIdx)}
                              style={{
                                filter: selectedInner === `${index}-${subIdx}` ? 'brightness(1.3)' : 'none'
                              }}
                            />
                            <text
                              {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize={subIdx === 1 ? "30" : "25"}
                              fontWeight="bold"
                              className="pointer-events-none select-none"
                              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                            >
                              {subIdx === 1 ? '📦' : '🪨'}
                            </text>
                            {subIdx === 1 && (
                              <text
                                {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="20"
                                className="pointer-events-none select-none"
                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                dy="-7"
                              >
                                💎
                              </text>
                            )}
                          </g>
                        ))}
                      </>
                    ) : index === 2 ? (
                      // REPAIR/UPGRADE section
                      <>
                        {[0, 1].map((subIdx) => (
                          <g key={`inner-${index}-${subIdx}`}>
                            <path
                              d={createPath(innerRadius, middleRadius, index, subIdx)}
                              fill={getColor(index, false, subIdx)}
                              stroke="rgba(255, 255, 255, 0.2)"
                              strokeWidth="2"
                              className="cursor-pointer transition duration-300 hover:brightness-110"
                              onMouseEnter={() => setHoveredSegment(`inner-${index}-${subIdx}`)}
                              onMouseLeave={() => setHoveredSegment(null)}
                              onClick={() => handleClick('inner', index, subIdx)}
                              style={{
                                filter: selectedInner === `${index}-${subIdx}` ? 'brightness(1.3)' : 'none'
                              }}
                            />
                            {subIdx === 0 ? (
                              <text
                                {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="25"
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                              >
                                🔧
                              </text>
                            ) : (
                              <g transform={`translate(${getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx).x}, ${getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx).y}) rotate(${startAngle + (index * segmentAngle) + (3 * segmentAngle / 4) + 90})`}>
                                <text x="0" y="-18" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)', filter: 'grayscale(100%)' }}>
                                  🪟
                                </text>
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="hsl(120, 70%, 45%)" fontSize="25" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                  ↑
                                </text>
                                <text x="0" y="18" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                  🧱
                                </text>
                              </g>
                            )}
                          </g>
                        ))}
                      </>
                    ) : (
                      // Regular single segments
                      <>
                        <path
                          d={createPath(innerRadius, middleRadius, index)}
                          fill={getColor(index, false)}
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth="2"
                          className="cursor-pointer transition-all duration-300 hover:brightness-110"
                          onMouseEnter={() => setHoveredSegment(`inner-${index}`)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          onClick={() => handleClick('inner', index)}
                          style={{
                            filter: selectedInner === index ? 'brightness(1.3)' : 'none'
                          }}
                        />
                        <text
                          {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={index === 5 ? "25" : index === 4 ? "10" : "14"}
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {index === 5 ? '📁' : index === 4 ? 'DECAY TIMER' : index === 3 ? '' : `${index + 1}A`}
                        </text>
                        {/* Resources text */}
                        {index === 3 && resourceConfig.map((resource) => (
                          <text
                            key={resource.key}
                            fill="black"
                            fontSize="14"
                            fontWeight="bold"
                            className="pointer-events-none select-none"
                            style={{ textShadow: 'none' }}
                          >
                            <textPath href={`#${resource.key}TextPath`} startOffset="0%" textAnchor="start">
                              <tspan fill={resource.color} style={resource.style || { textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{resource.name}:</tspan><tspan fill="black">{formatResourceValue(calculateTCResources()[resource.key])}</tspan>
                            </textPath>
                          </text>
                        ))}
                      </>
                    )}
                    
                    {/* Outer segment */}
                    <path
                      d={createPath(middleRadius + 20, outerRadius, index)}
                      fill={getColor(index, true)}
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-300 hover:brightness-110"
                      onMouseEnter={() => setHoveredSegment(`outer-${index}`)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => handleClick('outer', index)}
                      style={{
                        filter: selectedOuter === index ? 'brightness(1.3)' : 'none'
                      }}
                    />
                  </g>
                );
              })}
              
              {/* Gap text */}
              {gapTexts.map((text, index) => (
                <text key={`gap-text-${index}`} fill="rgba(255,255,255,0.7)" fontSize={text.length > 12 ? "10" : "11"} fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <textPath href={`#gapTextPath-${index}`} startOffset="50%" textAnchor="middle">
                    {text}
                  </textPath>
                </text>
              ))}
              
              {/* ADVANCED text */}
              {Array.from({ length: segments }).map((_, index) => (
                <text key={`advanced-text-${index}`} fill="white" fontSize="14" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <textPath href={`#advancedTextPath-${index}`} startOffset="50%" textAnchor="middle">
                    ADVANCED
                  </textPath>
                </text>
              ))}
              
              {/* Pulsating overlays */}
              {/* HARVEST TIMER overlay */}
              {(() => {
                const hasPlantSelection = ['0-green', '0-0-bottom', '0-0-top', '0-1-bottom', '0-1-top'].includes(selectedInner);
                if (!hasPlantSelection) return null;
                
                const plant = plantEmojis[selectedInner];
                const plantName = plant ? plant.name : 'Unknown';
                
                return renderPulsatingOverlay(
                  0, 
                  'HARVEST', 
                  'CLONE',
                  (e) => {
                    e.stopPropagation();
                    // Create harvest timer
                    if (onAddTimer && locationId && plant) {
                      const plantType = plantTypeMapping[selectedInner];
                      const timingData = formatTimerDisplay(selectedInner, geneticData);
                      
                      // Convert harvest time to seconds (format is "H:MM" meaning hours:minutes)
                      let harvestSeconds = 0;
                      if (timingData.harvest.includes(':')) {
                        const parts = timingData.harvest.split(':');
                        const hours = parseInt(parts[0]);
                        const minutes = parseInt(parts[1]);
                        harvestSeconds = (hours * 60 * 60) + (minutes * 60); // Convert to total seconds
                      } else {
                        harvestSeconds = parseInt(timingData.harvest.replace('m', '')) * 60;
                      }
                      
                      const timer = {
                        id: Date.now(),
                        type: 'farm',
                        remaining: harvestSeconds,
                        activity: 'Harvest',
                        plantEmoji: plant.emoji,
                        plantName: plant.name
                      };
                      
                      onAddTimer(locationId, timer);
                      console.log(`Harvest timer created for ${plantName}: ${timingData.harvest}`);
                    }
                    setSelectedInner(null);
                  },
                  (e) => {
                    e.stopPropagation();
                    // Create clone timer
                    if (onAddTimer && locationId && plant) {
                      const plantType = plantTypeMapping[selectedInner];
                      const timingData = formatTimerDisplay(selectedInner, geneticData);
                      
                      // Convert clone time to seconds (format: "XXm")
                      const cloneSeconds = parseInt(timingData.clone.replace('m', '')) * 60;
                      
                      const timer = {
                        id: Date.now() + 1, // Ensure unique ID
                        type: 'farm',
                        remaining: cloneSeconds,
                        activity: 'Clone',
                        plantEmoji: plant.emoji,
                        plantName: plant.name
                      };
                      
                      onAddTimer(locationId, timer);
                      console.log(`Clone timer created for ${plantName}: ${timingData.clone}`);
                    }
                    setSelectedInner(null);
                  },
                  true,  // showTimers
                  true,  // isSplit
                  selectedInner  // selectedPlant
                );
              })()}
              
              {/* NEEDS PICKUP overlay */}
              {(selectedInner === '1-0' || selectedInner === '1-1') && renderPulsatingOverlay(
                1,
                'NEEDS PICKUP',
                '',
                (e) => { 
                  e.stopPropagation(); 
                  // Create express task report
                  if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                    const pickupType = selectedInner === '1-0' ? 'ore' : 'loot';
                    onCreateExpressTaskReport({
                      baseId,
                      baseName, 
                      baseCoords,
                      pickupType
                    });
                  }
                  setSelectedInner(null);
                },
                (e) => { e.stopPropagation(); setSelectedInner(null); },
                false,  // showTimers
                false   // isSplit
              )}
              
              {/* REPAIR/UPGRADE overlay */}
              {(selectedInner === '2-0' || selectedInner === '2-1') && renderPulsatingOverlay(
                2,
                selectedInner === '2-0' ? 'REQUEST REPAIR' : 'REQUEST UPGRADE',
                '',
                (e) => { 
                  e.stopPropagation(); 
                  // Create express task report for repair/upgrade
                  if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                    const repairType = selectedInner === '2-0' ? 'repair' : 'upgrade';
                    onCreateExpressTaskReport({
                      baseId,
                      baseName, 
                      baseCoords,
                      repairUpgradeType: repairType
                    });
                  }
                  setSelectedInner(null);
                },
                (e) => { e.stopPropagation(); setSelectedInner(null); },
                false,  // showTimers
                false   // isSplit
              )}
              
              {/* RESOURCES overlay */}
              {selectedInner === 3 && renderPulsatingOverlay(
                3,
                'REQUEST RESOURCES',
                '',
                (e) => { 
                  e.stopPropagation(); 
                  // Create express task report with current TC values
                  if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                    const tcResources = calculateTCResources();
                    // Convert display values to actual numbers
                    const requestedResources = {};
                    
                    // Parse the resource values back to numbers
                    Object.keys(tcResources).forEach(resource => {
                      const value = tcResources[resource];
                      if (value && value > 0) {
                        requestedResources[resource] = value.toString();
                      }
                    });
                    
                    onCreateExpressTaskReport({
                      baseId,
                      baseName, 
                      baseCoords,
                      requestedResources
                    });
                  }
                  setSelectedInner(null);
                },
                (e) => { e.stopPropagation(); setSelectedInner(null); },
                false,  // showTimers
                false   // isSplit
              )}
              
              {/* DECAY overlay with schedule rectangles */}
              {selectedInner === 4 && (() => {
                const decayIndex = 4;
                const segmentCenterAngle = startAngle + (decayIndex * segmentAngle) + (segmentAngle / 2);
                const angleRad = (segmentCenterAngle * Math.PI) / 180;
                const rectX = centerX + outerRadius + 15;
                const rectY = centerY - 10;
                
                return (
                  <>
                    {renderPulsatingOverlay(
                      4,
                      'SCHEDULE',
                      '',
                      (e) => { 
                        e.stopPropagation();
                        createDecayTimers();
                      },
                      (e) => { e.stopPropagation(); setSelectedInner(null); },
                      false,  // showTimers
                      false   // isSplit
                    )}
                    <g className="deploy-animation">
                      <line
                        x1={centerX + (outerRadius + 5) * Math.cos(angleRad)}
                        y1={centerY + (outerRadius + 5) * Math.sin(angleRad)}
                        x2={rectX - 5}
                        y2={rectY + 52}
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                      {[
                        { 
                          type: 'stone', 
                          label: 'Stone', 
                          bgColor: 'hsl(0, 0%, 60%)', 
                          borderColor: 'hsl(0, 0%, 75%)' 
                        },
                        { 
                          type: 'metal', 
                          label: 'Metal', 
                          bgColor: 'hsl(0, 0%, 35%)', 
                          borderColor: 'hsl(0, 0%, 50%)' 
                        },
                        { 
                          type: 'hqm', 
                          label: 'HQM', 
                          bgColor: 'hsl(200, 50%, 35%)', 
                          borderColor: 'hsl(200, 60%, 50%)' 
                        }
                      ].map((resource, index) => (
                        <g key={`rect-${index}`} style={{ 
                          animation: `deployFromCenter 0.3s ease-out ${0.1 + index * 0.05}s both`,
                          transformOrigin: `${rectX + 70}px ${rectY + (index * 35) + 15}px`
                        }}>
                          <rect
                            x={rectX}
                            y={rectY + (index * 35)}
                            width="140"
                            height="30"
                            rx="4"
                            fill={resource.bgColor}
                            stroke={resource.borderColor}
                            strokeWidth="2"
                            className="transition-all duration-200 hover:brightness-110"
                            opacity="0.9"
                          />
                          {/* Resource label */}
                          <text
                            x={rectX + 8}
                            y={rectY + (index * 35) + 19}
                            textAnchor="start"
                            fill="white"
                            fontSize="13"
                            fontWeight="bold"
                            className="pointer-events-none"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                          >
                            {resource.label}:
                          </text>

                          {/* HTML input field using foreignObject */}
                          <foreignObject
                            x={rectX + 50}
                            y={rectY + (index * 35) + 5}
                            width="50"
                            height="20"
                          >
                            <input
                              type="number"
                              min="0"
                              max={decayResources[resource.type].max}
                              value={decayResources[resource.type].current}
                              onChange={(e) => {
                                const value = Math.min(Number(e.target.value), decayResources[resource.type].max);
                                setDecayResources(prev => ({
                                  ...prev,
                                  [resource.type]: {
                                    ...prev[resource.type],
                                    current: value
                                  }
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: "50px",
                                height: "20px",
                                backgroundColor: "rgba(0,0,0,0.4)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                borderRadius: "3px",
                                color: "white",
                                fontSize: "12px",
                                textAlign: "center",
                                fontWeight: "bold"
                              }}
                            />
                          </foreignObject>
                          {/* Slash and Max value combined */}
                          <text
                            x={rectX + 100}
                            y={rectY + (index * 35) + 19}
                            textAnchor="start"
                            fill="white"
                            fontSize="13"
                            fontWeight="bold"
                            className="pointer-events-none"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                          >
                            /{decayResources[resource.type].max}
                          </text>
                        </g>
                      ))}
                    </g>
                  </>
                );
              })()}
            </g>
          )}
          
          {/* Center Action button */}
          <g 
            className={`transition-transform duration-200 cursor-pointer ${!isExpanded ? 'hover:scale-110 subtle-pulse' : ''}`}
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            onClick={handleActionClick}
          >
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius - 3}
              fill={isExpanded ? "hsl(120, 70%, 45%)" : "hsl(0, 70%, 45%)"}
              stroke={isExpanded ? "hsl(120, 70%, 35%)" : "hsl(0, 70%, 35%)"}
              strokeWidth="3"
              className="transition-all duration-300"
              filter={isExpanded ? "url(#actionButtonGlow)" : "url(#actionButtonShadow)"}
            />
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="16"
              fontWeight="bold"
              fill="white"
              className="select-none"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              Action
            </text>
          </g>


      </svg>
    </>
  );
};

// Create a wrapper function to pass through props
const FarmRadialMenu = ({ onOpenTaskReport, onCreateExpressTaskReport, onOpenBaseReport, onAddTimer, locationId, baseId, baseName, baseCoords, tcData, wipeCountdown }: FarmRadialMenuProps) => {
  return <RadialMenu onOpenTaskReport={onOpenTaskReport} onCreateExpressTaskReport={onCreateExpressTaskReport} onOpenBaseReport={onOpenBaseReport} onAddTimer={onAddTimer} locationId={locationId} baseId={baseId} baseName={baseName} baseCoords={baseCoords} tcData={tcData} wipeCountdown={wipeCountdown} />;
};

export default FarmRadialMenu;
