import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface BaseRadialMenuProps {
  onOpenTaskReport?: (baseData: { baseId: string; baseName: string; baseCoords: string }) => void;
  onCreateExpressTaskReport?: (baseData: { baseId: string; baseName: string; baseCoords: string; requestedResources: any }) => void;
  onOpenBaseReport?: (location: { id: string; name: string; coordinates: string; type: string }) => void;
  onAddTimer?: (locationId: string, timer: { id: number; type: string; remaining: number }) => void;
  locationId?: string;
  baseId?: string;
  baseName?: string;
  baseCoords?: string;
  reports?: any[];
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

const RadialMenu = ({ onOpenTaskReport, onCreateExpressTaskReport, onOpenBaseReport, onAddTimer, locationId, baseId, baseName, baseCoords, reports = [], tcData, wipeCountdown }: BaseRadialMenuProps) => {
  const queryClient = useQueryClient();
  const [selectedInner, setSelectedInner] = useState(null);
  const [selectedOuter, setSelectedOuter] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [segment1A1Value, setSegment1A1Value] = useState('00');
  const [segment1A2Value, setSegment1A2Value] = useState('00');
  const [segmentCoreValue, setSegmentCoreValue] = useState('00');
  const [isExpanded, setIsExpanded] = useState(false);
  const [stoneValue, setStoneValue] = useState('0');
  const [metalValue, setMetalValue] = useState('0');
  const [hqmValue, setHqmValue] = useState('0')
  
  // Kit resources state for NEEDS KITS (segment 0)
  const [kitValues, setKitValues] = useState({
    hazzy: '0',
    fullkit: '0', 
    meds: '0',
    bolty: '0',
    teas: '0'
  });
  
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
    
    // If timer is running and we have remaining time data
    if (tcData.trackRemainingTime && tcData.timerDays && tcData.timerHours && tcData.timerMinutes) {
      const timerDays = parseInt(tcData.timerDays) || 0;
      const timerHours = parseInt(tcData.timerHours) || 0;
      const timerMinutes = parseInt(tcData.timerMinutes) || 0;
      
      if (timerDays > 0 || timerHours > 0 || timerMinutes > 0) {
        const totalMinutesRemaining = (timerDays * 24 * 60) + (timerHours * 60) + timerMinutes;
        const remainingDays = totalMinutesRemaining / (24 * 60);
        
        // Calculate "goodForWipe" - what we need to make it to wipe
        const result = {};
        Object.keys(daily).forEach(type => {
          if (daily[type] > 0) {
            const currentInTC = daily[type] * remainingDays;
            const maxInTC = totalMaterials[type];
            result[type] = Math.max(0, maxInTC - currentInTC);
          } else {
            result[type] = 0;
          }
        });
        
        return result;
      }
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

  // Handle decay resource changes
  const handleDecayResourceChange = (resourceType, increment) => {
    const maxValues = {
      stone: 500,
      metal: 1000,
      hqm: 2000
    };
    
    const currentValues = {
      stone: parseInt(stoneValue) || 0,
      metal: parseInt(metalValue) || 0,
      hqm: parseInt(hqmValue) || 0
    };
    
    let newValue;
    if (increment) {
      newValue = Math.min(currentValues[resourceType] + 50, maxValues[resourceType]);
    } else {
      newValue = Math.max(currentValues[resourceType] - 50, 0);
    }
    
    switch(resourceType) {
      case 'stone':
        setStoneValue(newValue.toString());
        break;
      case 'metal':
        setMetalValue(newValue.toString());
        break;
      case 'hqm':
        setHqmValue(newValue.toString());
        break;
    }
  };

  // Calculate decay time based on authentic Rust game mechanics
  const calculateDecayTime = (resourceType, currentHealth) => {
    if (currentHealth <= 0) return 0;
    
    // Authentic Rust decay rates (percentage per hour)
    const decayRates = {
      stone: 20,    // Stone loses 20% health per hour (5 hours total)
      metal: 12.5,  // Metal loses 12.5% health per hour (8 hours total)
      hqm: 8.33     // HQM loses 8.33% health per hour (12 hours total)
    };
    
    // Calculate max health based on resource type
    const maxHealth = {
      stone: 500,
      metal: 1000,
      hqm: 2000
    };
    
    // Calculate current health percentage
    const healthPercentage = (currentHealth / maxHealth[resourceType]) * 100;
    
    // Calculate hours remaining based on percentage decay
    const hoursRemaining = healthPercentage / decayRates[resourceType];
    
    return Math.round(hoursRemaining * 3600); // Convert to seconds
  };

  // Create decay timers for resources with health > 0
  const createDecayTimers = () => {
    if (!onAddTimer || !locationId) return;
    
    const decayResources = {
      stone: { current: parseInt(stoneValue) || 0, max: 500 },
      metal: { current: parseInt(metalValue) || 0, max: 1000 },
      hqm: { current: parseInt(hqmValue) || 0, max: 2000 }
    };
    
    Object.entries(decayResources).forEach(([resourceType, resource]) => {
      if (resource.current > 0) {
        const timeInSeconds = calculateDecayTime(resourceType, resource.current);
        if (timeInSeconds > 0) {
          onAddTimer(locationId, {
            id: Date.now() + Math.random(),
            type: resourceType,
            remaining: timeInSeconds
          });
        }
      }
    });
    
    // Reset decay resources after creating timers
    setStoneValue('0');
    setMetalValue('0');
    setHqmValue('0');
    setSelectedInner(null);
  };
  
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
  
  // Resource configuration
  const RESOURCES = [
    { name: 'Stone', color: 'white', offset: 15 },
    { name: 'Metal', color: '#E57373', offset: 25 },
    { name: 'Hqm', color: 'hsl(200, 25%, 75%)', offset: 35, glow: true },
    { name: 'Wood', color: 'hsl(30, 60%, 45%)', offset: 45 }
  ];
  
  // Gap text configuration
  const GAP_TEXTS = [
    'NEEDS KITS',
    'NEEDS PICKUP',
    'REPAIR/UPGRADE',
    'NEEDS RESOURCES',
    'DECAYING OUT',
    'MAKE REPORT'
  ];
  
  // Inner segment labels
  const INNER_LABELS = [
    { index: 0, subSegments: [
      { label: '1A1', icon: null },
      { label: '1A2', icon: null }
    ]},
    { index: 1, subSegments: [
      { label: 'Rock', icon: '🪨' },
      { label: 'Package', icon: '📦💎' }
    ]},
    { index: 2, subSegments: [
      { label: 'Wrench', icon: '🔧' },
      { label: 'Window/Brick', icon: '🪟🧱' }
    ]},
    { index: 3, label: 'Resources', icon: null },
    { index: 4, label: 'DECAY TIMER', icon: null, fontSize: 10 },
    { index: 5, label: 'Folder', icon: '📁' }
  ];
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        const hasActiveOverlay = selectedInner || 
                               (segmentCoreValue !== '00') || 
                               (segment1A1Value !== '00') || 
                               (segment1A2Value !== '00');
        
        if (hasActiveOverlay) {
          setSelectedInner(null);
          setSegmentCoreValue('00');
          setSegment1A1Value('00');
          setSegment1A2Value('00');
          setStoneValue('0');
          setMetalValue('0');
          setHqmValue('0');
        } else if (isExpanded) {
          setIsExpanded(false);
          setSelectedInner(null);
          setSelectedOuter(null);
          setHoveredSegment(null);
          setSegment1A1Value('00');
          setSegment1A2Value('00');
          setSegmentCoreValue('00');
          setStoneValue('0');
          setMetalValue('0');
          setHqmValue('0');
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedInner, isExpanded, segmentCoreValue, segment1A1Value, segment1A2Value]);
  
  // Create SVG path
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
  
  // Create curved path for text
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
  
  // Get color for segments
  const getColor = (index, isOuter, subSegment = null) => {
    const segmentId = isOuter ? `outer-${index}` : 
                     subSegment !== null ? `inner-${index}-${subSegment}` : `inner-${index}`;
    const isHovered = hoveredSegment === segmentId;
    
    if (isOuter) {
      if (index === 4 || index === 5) {
        return `hsl(0, 0%, ${isHovered ? 55 : 45}%)`;
      }
      return `hsl(0, 70%, ${isHovered ? 55 : 45}%)`;
    }
    
    // Special colors for inner segments
    if (index === 0 && subSegment === 0) return `hsl(50, 85%, ${isHovered ? 70 : 60}%)`;
    if (index === 0 && subSegment === 1) return "url(#metallicGradient)";
    if (index === 1) return `hsl(0, 0%, ${isHovered ? 55 : 45}%)`;
    if (index === 3) return `hsl(200, 70%, ${isHovered ? 65 : 55}%)`;
    if (index === 4) return `hsl(30, 50%, ${isHovered ? 35 : 25}%)`;
    if (index === 5) return `hsl(30, 45%, ${isHovered ? 70 : 60}%)`;
    
    const hue = (index * 360) / segments;
    return `hsl(${hue}, 60%, ${isHovered ? 65 : 55}%)`;
  };
  
  // Get label position
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
  
  // Get arrow positions
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
  
  // Handle number changes
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
    
    switch(field) {
      case 'core':
        setSegmentCoreValue(updateCoreValue(segmentCoreValue));
        break;
      case '1a1':
        setSegment1A1Value(updateValue(segment1A1Value));
        break;
      case '1a2':
        setSegment1A2Value(updateValue(segment1A2Value));
        break;
    }
  };
  
  // Handle resource value changes
  const handleResourceChange = (resource, value) => {
    const maxValues = {
      stone: 500,
      metal: 1000,
      hqm: 2000
    };
    
    // Ensure value is a number and within bounds
    let numValue = parseInt(value) || 0;
    numValue = Math.max(0, Math.min(numValue, maxValues[resource]));
    
    switch(resource) {
      case 'stone':
        setStoneValue(numValue.toString());
        break;
      case 'metal':
        setMetalValue(numValue.toString());
        break;
      case 'hqm':
        setHqmValue(numValue.toString());
        break;
    }
  };
  // Handle kit value changes
  const handleKitChange = (kitType, value) => {
    const maxKitValue = 99;
    
    // Ensure value is a number and within bounds
    let numValue = parseInt(value) || 0;
    numValue = Math.max(0, Math.min(numValue, maxKitValue));
    
    const newKitValues = {
      ...kitValues,
      [kitType]: numValue.toString()
    };
    
    setKitValues(newKitValues);
    console.log('Kit values updated:', newKitValues, 'selectedInner:', selectedInner);
  };
  
  // Handle clicks
  const handleClick = (type, index, subSegment = null) => {
    if (type === 'inner') {
      const id = subSegment !== null ? `${index}-${subSegment}` : index;
      setSelectedInner(id);
      
      // Handle make report functionality for segment 5 (folder icon)
      if (index === 5 && onOpenBaseReport && baseId && baseName && baseCoords) {
        onOpenBaseReport({ 
          id: baseId, 
          name: baseName, 
          coordinates: baseCoords, 
          type: 'friendly' 
        });
      }
    } else {
      setSelectedOuter(index);
      
      // Handle "NEEDS KITS" Advanced button click (index 0)
      if (index === 0 && onOpenTaskReport && baseId && baseName && baseCoords) {
        // Open task report modal with stock_kits dropdown pre-selected
        onOpenTaskReport({ baseId, baseName, baseCoords, taskType: 'stock_kits' });
      }
      
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
    }
  };
  
  // Render arrow controls
  const renderArrowControls = (field, arrowData) => (
    <>
      <g
        transform={`translate(${arrowData.upX}, ${arrowData.upY}) rotate(${arrowData.rotation})`}
        onClick={(e) => {
          e.stopPropagation();
          handleNumberChange(field, true);
        }}
        className="cursor-pointer"
      >
        <circle r="15" fill="transparent" />
        <path
          d="M -6.75 4.05 L 0 -4.05 L 6.75 4.05 Z"
          fill="rgba(255, 255, 255, 0.8)"
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="1"
          className="transition-all duration-200 hover:fill-white hover:scale-110"
          style={{ transformOrigin: 'center' }}
        />
      </g>
      <g
        transform={`translate(${arrowData.downX}, ${arrowData.downY}) rotate(${arrowData.rotation})`}
        onClick={(e) => {
          e.stopPropagation();
          handleNumberChange(field, false);
        }}
        className="cursor-pointer"
      >
        <circle r="12" fill="transparent" />
        <path
          d="M -6.75 -4.05 L 0 4.05 L 6.75 -4.05 Z"
          fill="rgba(255, 255, 255, 0.8)"
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="1"
          className="transition-all duration-200 hover:fill-white hover:scale-110"
          style={{ transformOrigin: 'center' }}
        />
      </g>
    </>
  );
  
  // Render pulsating overlay
  const renderPulsatingOverlay = (segmentIndex, condition, overlayText, extraContent) => {
    if (!condition) return null;
    
    const segmentCenterAngle = startAngle + (segmentIndex * segmentAngle) + (segmentAngle / 2);
    const segmentCenterRadius = (middleRadius + 20 + outerRadius) / 2;
    const angleRad = (segmentCenterAngle * Math.PI) / 180;
    const transformX = centerX + segmentCenterRadius * Math.cos(angleRad);
    const transformY = centerY + segmentCenterRadius * Math.sin(angleRad);
    
    return (
      <>
        <g style={{
          transformOrigin: `${transformX}px ${transformY}px`,
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <path
            d={createPath(middleRadius + 10, outerRadius + 10, segmentIndex)}
            fill="hsl(120, 70%, 50%)"
            fillOpacity="1"
            stroke="hsl(120, 80%, 40%)"
            strokeWidth="3"
            className="cursor-pointer hover:brightness-110"
            filter="url(#greenGlow)"
            onClick={(e) => {
              e.stopPropagation();
              
              // Handle express pickup request for segment 1
              if (segmentIndex === 1) {
                // Create express task report for pickup
                if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                  const pickupType = selectedInner === '1-0' ? 'ore' : 'loot';
                  console.log(`Pickup ${pickupType} selected`);
                  onCreateExpressTaskReport({
                    baseId,
                    baseName, 
                    baseCoords,
                    pickupType
                  });
                }
              }
              
              // Handle express repair/upgrade request for segment 2
              if (segmentIndex === 2) {
                // Create express task report for repair/upgrade
                if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                  const repairType = selectedInner === '2-0' ? 'repair' : 'upgrade';
                  console.log(`Repair/Upgrade ${repairType} selected`);
                  onCreateExpressTaskReport({
                    baseId,
                    baseName, 
                    baseCoords,
                    repairUpgradeType: repairType
                  });
                }
              }
              
              // Handle express resource request for segment 3
              if (segmentIndex === 3) {
                // Create express task report with current TC values
                if (onCreateExpressTaskReport && baseId && baseName && baseCoords) {
                  console.log('Resources 📋 selected');
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
              }
              
              // Handle express kit request for segment 0
              if (segmentIndex === 0) {
                // Only create task report if kit values are greater than 0
                const hasKitValues = (parseInt(segment1A1Value) > 0 || parseInt(segment1A2Value) > 0 || parseInt(segmentCoreValue) > 0);
                
                if (baseId && baseName && baseCoords && hasKitValues) {
                  console.log('Kits selected');
                  
                  // Check if a stock_kits task report already exists for this base
                  const existingStockKitsReport = reports.find(report => 
                    report.type === 'task' &&
                    report.taskType === 'stock_kits' &&
                    report.status === 'pending' &&
                    report.baseTags && 
                    report.baseTags.includes(baseId)
                  );

                  const kitResources = {
                    hazzy: segment1A1Value,
                    fullkit: segment1A2Value,
                    meds: segmentCoreValue,
                    bolty: '0',
                    teas: '0'
                  };

                  // Handle the kit request asynchronously
                  (async () => {
                    try {
                      if (existingStockKitsReport) {
                        // Update existing report by adding new kit values to existing ones
                        const currentKitResources = existingStockKitsReport.taskData?.kitResources || {};
                        const updatedKitResources = { ...currentKitResources };
                        
                        // Add new values to existing values for each kit type
                        Object.keys(kitResources).forEach(kitType => {
                          const newValue = parseInt(kitResources[kitType]) || 0;
                          const currentValue = parseInt(currentKitResources[kitType]) || 0;
                          if (newValue > 0) {
                            updatedKitResources[kitType] = (currentValue + newValue).toString();
                          }
                        });

                        // Update the existing report
                        await apiRequest('PUT', `/api/reports/${existingStockKitsReport.id}`, {
                          ...existingStockKitsReport,
                          taskData: {
                            ...existingStockKitsReport.taskData,
                            kitResources: updatedKitResources
                          }
                        });
                        
                        console.log('Updated existing stock kits report');
                      } else {
                        // Create new stock kits task report
                        const taskReport = {
                          type: 'task',
                          notes: '',
                          outcome: 'neutral',
                          enemyPlayers: '',
                          friendlyPlayers: '',
                          baseTags: [baseId],
                          screenshots: [],
                          location: { gridX: 0, gridY: 0 },
                          taskType: 'stock_kits',
                          taskData: {
                            kitResources,
                            details: `Express kit request for ${baseName}`,
                            urgency: 'medium'
                          },
                          status: 'pending'
                        };
                        
                        await apiRequest('POST', '/api/reports', taskReport);
                        console.log('Created new stock kits report');
                      }

                      // Invalidate reports query to refresh the list and map icons
                      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
                    } catch (error) {
                      console.error('Failed to handle kit request:', error);
                    }
                  })();
                }
              }
              
              setSelectedInner(null);
              if (segmentIndex === 0) {
                setSegmentCoreValue('00');
                setSegment1A1Value('00');
                setSegment1A2Value('00');
              }
              if (segmentIndex === 4) {
                createDecayTimers();
                setStoneValue('0');
                setMetalValue('0');
                setHqmValue('0');
              }
            }}
          />
          <text 
            fill="white" 
            fontSize="14" 
            fontWeight="bold" 
            className="pointer-events-none select-none" 
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
          >
            <textPath href={`#advancedTextPath-${segmentIndex}`} startOffset="50%" textAnchor="middle">
              {overlayText}
            </textPath>
          </text>
        </g>
        {extraContent}
      </>
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
          @keyframes deployFromCenter {
            0% { opacity: 0; transform: scale(0); }
            100% { opacity: 1; transform: scale(1); }
          }
          .pulse-animation {
            animation: pulse 2s ease-in-out infinite;
            transform-origin: ${centerX}px ${centerY}px;
          }
          .subtle-pulse {
            animation: subtlePulse 4s ease-in-out infinite;
            transform-origin: ${centerX}px ${centerY}px;
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
            
            {/* Metallic gradient */}
            <radialGradient id="metallicGradient" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="hsl(210, 10%, 90%)" />
              <stop offset="20%" stopColor="hsl(210, 10%, 75%)" />
              <stop offset="40%" stopColor="hsl(210, 10%, 65%)" />
              <stop offset="60%" stopColor="hsl(210, 10%, 70%)" />
              <stop offset="80%" stopColor="hsl(210, 10%, 60%)" />
              <stop offset="100%" stopColor="hsl(210, 10%, 68%)" />
            </radialGradient>
            
            {/* Text paths */}
            {/* Gap text paths */}
            {Array.from({ length: segments }).map((_, i) => (
              <path
                key={`gapPath-${i}`}
                id={`gapTextPath-${i}`}
                d={createTextPath(middleRadius + 8, i)}
              />
            ))}
            
            {/* Advanced text paths */}
            {Array.from({ length: segments }).map((_, i) => (
              <path
                key={`advancedPath-${i}`}
                id={`advancedTextPath-${i}`}
                d={createTextPath((middleRadius + 20 + outerRadius) / 2 - 4, i)}
              />
            ))}
            
            {/* Special text paths */}
            <path id="segment1A1Path" d={createTextPath(innerRadius + ((middleRadius - innerRadius) * 0.4) + ((middleRadius - innerRadius) * 0.6 * 0.25) - 3, 0, 0, segmentAngle / 2)} />
            <path id="segment1A2Path" d={createTextPath(innerRadius + ((middleRadius - innerRadius) * 0.4) + ((middleRadius - innerRadius) * 0.6 * 0.25) - 3, 0, segmentAngle / 2, 0)} />
            <path id="segmentCorePath" d={createTextPath(innerRadius + ((innerRadius + ((middleRadius - innerRadius) * 0.4) - innerRadius) * 0.25) - 3, 0)} />
            <path id="hazzyTextPath" d={createTextPath(middleRadius - 8, 0, 2, segmentAngle / 2 - 2)} />
            <path id="fullKitTextPath" d={createTextPath(middleRadius - 8, 0, segmentAngle / 2 + 2, 2)} />
            <path id="medsTextPath" d={createTextPath(innerRadius + ((innerRadius + ((middleRadius - innerRadius) * 0.4) - innerRadius) * 0.65) + 2, 0, 5, 5)} />
            
            {/* Resource text paths */}
            {RESOURCES.map((resource, idx) => (
              <path
                key={`${resource.name}Path`}
                id={`${resource.name.toLowerCase()}TextPath`}
                d={createTextPath(middleRadius - resource.offset, 3)}
              />
            ))}
          </defs>
          
          {/* Render segments */}
          {isExpanded && (
            <g className="deploy-animation">
              {/* Green merged inner segment for MEDS */}
              <g>
                <path
                  d={createPath(innerRadius, innerRadius + ((middleRadius - innerRadius) * 0.4), null, null, { start: startAngle, end: startAngle + segmentAngle })}
                  fill="hsl(120, 70%, 65%)"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="2"
                  className="transition duration-300"
                  onMouseEnter={() => setHoveredSegment('inner-merged')}
                  onMouseLeave={() => setHoveredSegment(null)}
                  style={{
                    filter: selectedInner === 'merged' ? 'brightness(1.3)' : hoveredSegment === 'inner-merged' ? 'brightness(1.1)' : 'none'
                  }}
                />
                <text fill="white" fontSize="12" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <textPath href="#medsTextPath" startOffset="50%" textAnchor="middle">MEDS</textPath>
                </text>
                <g style={{ pointerEvents: 'none' }}>
                  <text fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    <textPath href="#segmentCorePath" startOffset="50%" textAnchor="middle">{segmentCoreValue || '00'}</textPath>
                  </text>
                </g>
                {renderArrowControls('core', getArrowData(innerRadius + ((innerRadius + ((middleRadius - innerRadius) * 0.4) - innerRadius) * 0.25) - 3, 0, null, true))}
              </g>
              
              {/* Render all segments */}
              {Array.from({ length: segments }).map((_, index) => {
                const innerRadiusRange = middleRadius - innerRadius;
                const cutoffRadius = innerRadius + (innerRadiusRange * 0.4);
                const segmentConfig = INNER_LABELS[index];
                
                return (
                  <g key={index}>
                    {/* Inner segments */}
                    {index === 0 ? (
                      // Segment 0 - special handling for 1A1 and 1A2
                      <>
                        {[0, 1].map((subIdx) => (
                          <g key={`inner-${index}-${subIdx}`}>
                            <path
                              d={createPath(cutoffRadius, middleRadius, index, subIdx)}
                              fill={getColor(index, false, subIdx)}
                              stroke={subIdx === 1 ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.2)"}
                              strokeWidth={subIdx === 1 ? "2.5" : "2"}
                              className="cursor-pointer transition duration-300"
                              onMouseEnter={() => setHoveredSegment(`inner-${index}-${subIdx}`)}
                              onMouseLeave={() => setHoveredSegment(null)}
                              onClick={() => handleClick('inner', index, subIdx)}
                              style={{
                                filter: selectedInner === `${index}-${subIdx}` ? 'brightness(1.3)' : hoveredSegment === `inner-${index}-${subIdx}` ? 'brightness(1.1)' : 'none'
                              }}
                            />
                            {subIdx === 0 ? (
                              <>
                                <text fill="rgba(0,0,0,0.8)" fontSize="11" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.9), 0px 0px 6px rgba(255,255,255,0.6)' }}>
                                  <textPath href="#hazzyTextPath" startOffset="50%" textAnchor="middle">HAZZY</textPath>
                                </text>
                                <g style={{ pointerEvents: 'none' }}>
                                  <text fill="white" fontSize="14" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                    <textPath href="#segment1A1Path" startOffset="50%" textAnchor="middle">{segment1A1Value || '00'}</textPath>
                                  </text>
                                </g>
                                {renderArrowControls('1a1', getArrowData(cutoffRadius + ((middleRadius - cutoffRadius) * 0.25) - 3, index, subIdx))}
                              </>
                            ) : (
                              <>
                                <text fill="rgba(10,10,10,0.95)" fontSize="11" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '0px 0px 4px rgba(255,255,255,1), 1px 1px 3px rgba(255,255,255,0.8), -1px -1px 2px rgba(0,0,0,0.4)' }}>
                                  <textPath href="#fullKitTextPath" startOffset="50%" textAnchor="middle">FULL KIT</textPath>
                                </text>
                                <g style={{ pointerEvents: 'none' }}>
                                  <text fill="white" fontSize="14" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                    <textPath href="#segment1A2Path" startOffset="50%" textAnchor="middle">{segment1A2Value || '00'}</textPath>
                                  </text>
                                </g>
                                {renderArrowControls('1a2', getArrowData(cutoffRadius + ((middleRadius - cutoffRadius) * 0.25) - 3, index, subIdx))}
                              </>
                            )}
                          </g>
                        ))}
                      </>
                    ) : segmentConfig.subSegments ? (
                      // Segments with sub-segments
                      <>
                        {segmentConfig.subSegments.map((sub, subIdx) => (
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
                            {sub.icon === '📦💎' ? (
                              <g>
                                <text {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="30" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>📦</text>
                                <text {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }} dy="-7">💎</text>
                              </g>
                            ) : sub.icon === '🪟🧱' ? (
                              <g transform={`translate(${getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx).x}, ${getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx).y}) rotate(${startAngle + (index * segmentAngle) + (3 * segmentAngle / 4) + 90})`}>
                                <text x="0" y="-18" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)', filter: 'grayscale(100%)' }}>🪟</text>
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="hsl(120, 70%, 45%)" fontSize="25" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>↑</text>
                                <text x="0" y="18" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>🧱</text>
                              </g>
                            ) : (
                              <text {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index, subIdx)} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="25" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{sub.icon}</text>
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
                        {index === 3 ? (
                          // Resources segment
                          <>
                            {RESOURCES.map((resource) => (
                              <text
                                key={resource.name}
                                fill={resource.color}
                                fontSize="12"
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                                style={{ 
                                  textShadow: resource.glow ? '1px 1px 2px rgba(0,0,0,0.8), 0px 0px 3px rgba(255,255,255,0.3)' : '1px 1px 2px rgba(0,0,0,0.8)' 
                                }}
                              >
                                <textPath href={`#${resource.name.toLowerCase()}TextPath`} startOffset="0%" textAnchor="start">
                                  {resource.name}:{formatResourceValue(calculateTCResources()[resource.name.toLowerCase()])}
                                </textPath>
                              </text>
                            ))}
                          </>
                        ) : (
                          <text
                            {...getLabelPosition(innerRadius + (middleRadius - innerRadius) / 2, index)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={segmentConfig.fontSize || (segmentConfig.icon ? 25 : 14)}
                            fontWeight="bold"
                            className="pointer-events-none select-none"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                          >
                            {segmentConfig.icon || segmentConfig.label}
                          </text>
                        )}
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
              {GAP_TEXTS.map((text, index) => (
                <text key={`gap-text-${index}`} fill="rgba(255,255,255,0.7)" fontSize={text.length > 12 ? "10" : "11"} fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <textPath href={`#gapTextPath-${index}`} startOffset="50%" textAnchor="middle">{text}</textPath>
                </text>
              ))}
              
              {/* "ADVANCED" text for all outer segments */}
              {Array.from({ length: segments }).map((_, index) => (
                <text key={`advanced-text-${index}`} fill="white" fontSize="14" fontWeight="bold" className="pointer-events-none select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <textPath href={`#advancedTextPath-${index}`} startOffset="50%" textAnchor="middle">ADVANCED</textPath>
                </text>
              ))}
              
              {/* Pulsating overlays */}
              {/* NEEDS KITS overlay */}
              {renderPulsatingOverlay(0, 
                (parseInt(segment1A1Value) > 0 || parseInt(segment1A2Value) > 0 || parseInt(segmentCoreValue) > 0),
 

                'REQUEST SUPPLIES',
                (selectedInner === '0-0' || selectedInner === '0-1') && (
                  <g className="deploy-animation">
                    <line
                      x1={centerX + (outerRadius + 5) * Math.cos((startAngle + (0 * segmentAngle) + (segmentAngle / 2)) * Math.PI / 180)}
                      y1={centerY + (outerRadius + 5) * Math.sin((startAngle + (0 * segmentAngle) + (segmentAngle / 2)) * Math.PI / 180)}
                      x2={centerX + outerRadius + 10}
                      y2={centerY - 80}
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    {[
                      { name: 'Hazzy', value: kitValues.hazzy, kitType: 'hazzy', fillColor: 'hsl(60, 50%, 45%)', borderColor: 'hsl(60, 60%, 60%)' },
                      { name: 'FullKit', value: kitValues.fullkit, kitType: 'fullkit', fillColor: 'hsl(120, 50%, 35%)', borderColor: 'hsl(120, 60%, 50%)' },
                      { name: 'Meds', value: kitValues.meds, kitType: 'meds', fillColor: 'hsl(0, 50%, 45%)', borderColor: 'hsl(0, 60%, 60%)' },
                      { name: 'Bolty', value: kitValues.bolty, kitType: 'bolty', fillColor: 'hsl(30, 50%, 35%)', borderColor: 'hsl(30, 60%, 50%)' },
                      { name: 'Teas', value: kitValues.teas, kitType: 'teas', fillColor: 'hsl(180, 50%, 35%)', borderColor: 'hsl(180, 60%, 50%)' }
                    ].map((kit, idx) => (
                      <g key={`kit-${idx}`} style={{ 
                        animation: `deployFromCenter 0.3s ease-out ${0.1 + idx * 0.05}s both`,
                        transformOrigin: `${centerX + outerRadius + 85}px ${centerY - 100 + (idx * 35) + 15}px`
                      }}>
                        <rect
                          x={centerX + outerRadius + 15}
                          y={centerY - 100 + (idx * 35)}
                          width="140"
                          height="30"
                          rx="4"
                          fill={kit.fillColor}
                          stroke={kit.borderColor}
                          strokeWidth="2"
                          className="transition-all duration-200 hover:brightness-110"
                          opacity="0.95"
                        />
                        <text
                          x={centerX + outerRadius + 25}
                          y={centerY - 100 + (idx * 35) + 19}
                          textAnchor="start"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                          className="pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                        >
                          {kit.name}:
                        </text>
                        <foreignObject
                          x={centerX + outerRadius + 75}
                          y={centerY - 100 + (idx * 35) + 4}
                          width="50"
                          height="22"
                        >
                          <input
                            type="text"
                            value={kit.value}
                            onChange={(e) => handleKitChange(kit.kitType, e.target.value)}
                            onBlur={(e) => handleKitChange(kit.kitType, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '4px',
                              color: 'white',
                              textAlign: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              padding: '0',
                              outline: 'none',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              if (e.target !== document.activeElement) {
                                e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                              }
                            }}
                            data-testid={`input-kit-${kit.kitType}`}
                          />
                        </foreignObject>
                      </g>
                    ))}
                  </g>
                )
              )}
              
              {/* NEEDS PICKUP overlay */}
              {renderPulsatingOverlay(1, 
                selectedInner === '1-0' || selectedInner === '1-1',
                'NEEDS PICKUP',
                null
              )}
              
              {/* REPAIR/UPGRADE overlay */}
              {renderPulsatingOverlay(2, 
                selectedInner === '2-0' || selectedInner === '2-1',
                selectedInner === '2-0' ? 'REQUEST REPAIR' : 'REQUEST UPGRADE',
                null
              )}
              
              {/* RESOURCES overlay */}
              {renderPulsatingOverlay(3, 
                selectedInner === 3,
                'REQUEST RESOURCES',
                null
              )}
              
              {/* DECAY overlay with resource containers */}
              {renderPulsatingOverlay(4, 
                selectedInner === 4,
                'SCHEDULE',
                selectedInner === 4 && (
                  <g className="deploy-animation">
                    <line
                      x1={centerX + (outerRadius + 5) * Math.cos((startAngle + (4 * segmentAngle) + (segmentAngle / 2)) * Math.PI / 180)}
                      y1={centerY + (outerRadius + 5) * Math.sin((startAngle + (4 * segmentAngle) + (segmentAngle / 2)) * Math.PI / 180)}
                      x2={centerX + outerRadius + 10}
                      y2={centerY + 22}
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    {[
                      { 
                        name: 'Stone', 
                        value: stoneValue, 
                        max: 500, 
                        fillColor: 'hsl(0, 0%, 60%)', 
                        borderColor: 'hsl(0, 0%, 75%)' 
                      },
                      { 
                        name: 'Metal', 
                        value: metalValue, 
                        max: 1000, 
                        fillColor: 'hsl(0, 0%, 35%)', 
                        borderColor: 'hsl(0, 0%, 50%)' 
                      },
                      { 
                        name: 'HQM', 
                        value: hqmValue, 
                        max: 2000, 
                        fillColor: 'hsl(200, 50%, 35%)', 
                        borderColor: 'hsl(200, 60%, 50%)' 
                      }
                    ].map((resource, idx) => (
                      <g key={`resource-${idx}`} style={{ 
                        animation: `deployFromCenter 0.3s ease-out ${0.1 + idx * 0.05}s both`,
                        transformOrigin: `${centerX + outerRadius + 85}px ${centerY - 10 + (idx * 35) + 15}px`
                      }}>
                        <rect
                          x={centerX + outerRadius + 15}
                          y={centerY - 10 + (idx * 35)}
                          width="140"
                          height="30"
                          rx="4"
                          fill={resource.fillColor}
                          stroke={resource.borderColor}
                          strokeWidth="2"
                          className="transition-all duration-200 hover:brightness-110"
                          opacity="0.95"
                        />
                        <text
                          x={centerX + outerRadius + 25}
                          y={centerY - 10 + (idx * 35) + 19}
                          textAnchor="start"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                          className="pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                        >
                          {resource.name}:
                        </text>
                        <foreignObject
                          x={centerX + outerRadius + 65}
                          y={centerY - 10 + (idx * 35) + 4}
                          width="50"
                          height="22"
                        >
                          <input
                            type="text"
                            value={resource.value}
                            onChange={(e) => handleResourceChange(resource.name.toLowerCase(), e.target.value)}
                            onBlur={(e) => handleResourceChange(resource.name.toLowerCase(), e.target.value)}
                            onFocus={(e) => e.target.select()}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '3px',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              textAlign: 'right',
                              outline: 'none',
                              padding: '0 4px',
                              lineHeight: '20px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              if (document.activeElement !== e.target) {
                                e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </foreignObject>
                        <text
                          x={centerX + outerRadius + 116}
                          y={centerY - 10 + (idx * 35) + 19}
                          textAnchor="start"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                          className="pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                        >
                          /{resource.max}
                        </text>
                      </g>
                    ))}
                  </g>
                )
              )}
            </g>
          )}
          
          {/* Center Action button */}
          <g 
            className={`transition-transform duration-200 cursor-pointer ${!isExpanded ? 'hover:scale-110 subtle-pulse' : ''}`}
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            onClick={async () => {
              if (isExpanded) {
                setSelectedInner(null);
                setSelectedOuter(null);
                setHoveredSegment(null);
                setSegment1A1Value('00');
                setSegment1A2Value('00');
                setSegmentCoreValue('00');
                setStoneValue('0');
                setMetalValue('0');
                setHqmValue('0');
              }
              setIsExpanded(!isExpanded);
            }}
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

export default RadialMenu;