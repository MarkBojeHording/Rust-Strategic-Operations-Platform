/**
 * Centralized icon registry for consistent icon usage across the application
 * This file contains all icons used in the tactical map and reporting system
 * Supports both emoji icons and PNG image assets for enhanced visual quality
 */

// PNG Asset Imports
import rifleBoltPng from '@assets/icons/rifle.bolt.png'
import oreteaPurePng from '@assets/icons/oretea.pure.png'
import syringeMedicalPng from '@assets/icons/syringe.medical.png'
import hazmatsuitPng from '@assets/icons/hazmatsuit.png'
import metalFacemaskPng from '@assets/icons/metal.facemask.png'

// Task Report Icons - Used on map overlay for active tasks
export const TASK_ICONS = {
  // Resource-related tasks
  ORE_PICKUP: '🪨',      // Stone/ore pickup tasks
  LOOT_PICKUP: '📦',     // Loot/package pickup tasks
  RESOURCE_REQUEST: '📋', // General resource requests

  // Kit and supply tasks
  KIT_REQUEST: '🎒',     // Kit/supply requests (backpack icon for gear)
  MEDICAL_SUPPLY: '🩹',  // Medical supply requests

  // Base maintenance tasks
  REPAIR: '🔧',          // Repair tasks
  UPGRADE: '🚧',         // Upgrade/construction tasks

  // Timing and scheduling
  DECAY_TIMER: '⏰',     // Decay timing tasks
  SCHEDULE: '📅',        // Scheduled tasks

  // Status indicators
  URGENT: '🚨',          // High priority tasks
  COMPLETED: '✅',       // Completed tasks
  FAILED: '❌',          // Failed tasks
  PENDING: '⏳',         // Pending tasks
} as const

// Base Type Icons - Used in base management
export const BASE_ICONS = {
  FRIENDLY: '🏠',        // Friendly bases
  ENEMY: '🏴',           // Enemy bases
  NEUTRAL: '🏘️',        // Neutral/unknown bases
  OUTPOST: '🏭',         // Outpost bases
  COMPOUND: '🏰',        // Large compound bases
} as const

// Player Status Icons - Used in player management
export const PLAYER_ICONS = {
  ONLINE: '🟢',          // Online players
  OFFLINE: '🔴',         // Offline players
  AWAY: '🟡',            // Away/idle players
  PREMIUM: '⭐',         // Premium players
  ADMIN: '👑',           // Admin players
} as const

// UI Action Icons - Used for buttons and actions
export const ACTION_ICONS = {
  ADD: '➕',
  EDIT: '✏️',
  DELETE: '🗑️',
  SAVE: '💾',
  CANCEL: '❌',
  SEARCH: '🔍',
  FILTER: '🔽',
  REFRESH: '🔄',
  SETTINGS: '⚙️',
  INFO: 'ℹ️',
  WARNING: '⚠️',
  SUCCESS: '✅',
  ERROR: '❌',
} as const

// Resource Icons - Used for resource displays
export const RESOURCE_ICONS = {
  WOOD: '🪵',
  STONE: '🪨',
  METAL: '⚙️',
  HQM: '💎',
  SCRAP: '🔩',
  CLOTH: '🧵',
  LEATHER: '🦌',
} as const

// PNG Asset Registry - Maps asset keys to imported PNG files
export const PNG_ASSETS = {
  RIFLE_BOLT: rifleBoltPng,
  ORETEA_PURE: oreteaPurePng,
  SYRINGE_MEDICAL: syringeMedicalPng,
  HAZMATSUIT: hazmatsuitPng,
  METAL_FACEMASK: metalFacemaskPng,
} as const

// Icon Definition Structure - supports both emoji and PNG assets
export interface IconDefinition {
  emoji: string
  png?: string
  alt: string
}

// Weapon/Kit Icons - Used for kit management (enhanced with PNG support)
export const KIT_ICONS = {
  HAZZY: {
    emoji: '🦺',
    png: PNG_ASSETS.HAZMATSUIT,
    alt: 'Hazmat suit'
  },
  FULLKIT: {
    emoji: '🛡️',
    alt: 'Full kit with armor',
    png: PNG_ASSETS.METAL_FACEMASK
  },
  MEDS: {
    emoji: '💊',
    png: PNG_ASSETS.SYRINGE_MEDICAL,
    alt: 'Medical supplies'
  },
  BOLTY: {
    emoji: '🔫',
    png: PNG_ASSETS.RIFLE_BOLT,
    alt: 'Bolt action rifle'
  },
  TEAS: {
    emoji: '🍵',
    png: PNG_ASSETS.ORETEA_PURE,
    alt: 'Teas/consumables'
  },
  ROADSIGN: {
    emoji: '🛡️',
    alt: 'Road sign armor'
  },
  COFFEE: {
    emoji: '☕',
    png: PNG_ASSETS.METAL_FACEMASK,
    alt: 'Coffee can helmet'
  },
} as const

// Map Icons - Used for tactical map features
export const MAP_ICONS = {
  MONUMENT: '🏛️',       // Monuments
  ROAD: '🛣️',           // Roads
  WATER: '🌊',           // Water bodies
  FOREST: '🌲',          // Forest areas
  DESERT: '🏜️',         // Desert areas
  SNOW: '❄️',            // Snow biome
} as const

// Get icon by category and key
export function getIcon(category: keyof typeof ICON_REGISTRY, key: string): string {
  const categoryIcons = ICON_REGISTRY[category]
  if (!categoryIcons || !(key.toUpperCase() in categoryIcons)) {
    console.warn(`Icon not found: ${category}.${key}`)
    return '❓' // Default fallback icon
  }
  return categoryIcons[key.toUpperCase() as keyof typeof categoryIcons]
}

// Complete icon registry
export const ICON_REGISTRY = {
  TASK: TASK_ICONS,
  BASE: BASE_ICONS,
  PLAYER: PLAYER_ICONS,
  ACTION: ACTION_ICONS,
  RESOURCE: RESOURCE_ICONS,
  KIT: KIT_ICONS,
  MAP: MAP_ICONS,
} as const

// Helper function to get task icon based on task type
export function getTaskIcon(taskType: string, subType?: string): string {
  switch (taskType) {
    case 'needs_pickup':
      return subType === 'ore' ? TASK_ICONS.ORE_PICKUP : TASK_ICONS.LOOT_PICKUP
    case 'request_resources':
      return TASK_ICONS.RESOURCE_REQUEST
    case 'stock_kits':
      return TASK_ICONS.KIT_REQUEST
    case 'repair_upgrade':
      return subType === 'repair' ? TASK_ICONS.REPAIR : TASK_ICONS.UPGRADE
    default:
      return TASK_ICONS.PENDING
  }
}

// Helper function to get active kit data for dynamic display
export function getActiveKits(kitResources: any): Array<{ kitType: string; amount: string; iconData: any }> {
  if (!kitResources) return []

  // Define the display order: fullkit (metal), hazzy, meds, bolty, teas
  const displayOrder = ['fullkit', 'hazzy', 'meds', 'bolty', 'teas']

  const activeKits = Object.entries(kitResources)
    .filter(([_, amount]) => amount && parseInt(amount as string) > 0)
    .map(([kitType, amount]) => ({
      kitType,
      amount: amount as string,
      iconData: getKitIconData(kitType)
    }))

  // Sort by display order
  return activeKits.sort((a, b) => {
    const orderA = displayOrder.indexOf(a.kitType)
    const orderB = displayOrder.indexOf(b.kitType)
    // Put unknown types at the end
    if (orderA === -1) return 1
    if (orderB === -1) return -1
    return orderA - orderB
  })
}

// Helper function to get status icon
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return TASK_ICONS.COMPLETED
    case 'failed':
      return TASK_ICONS.FAILED
    case 'pending':
      return TASK_ICONS.PENDING
    case 'urgent':
      return TASK_ICONS.URGENT
    default:
      return TASK_ICONS.PENDING
  }
}

// Helper function to get kit icon (returns emoji by default)
export function getKitIcon(kitType: string): string {
  const iconKey = kitType.toUpperCase() as keyof typeof KIT_ICONS
  const iconDef = KIT_ICONS[iconKey]
  if (iconDef && typeof iconDef === 'object') {
    return iconDef.emoji
  }
  return iconDef || ACTION_ICONS.INFO
}

// Helper function to get kit icon PNG asset
export function getKitIconPng(kitType: string): string | undefined {
  const iconKey = kitType.toUpperCase() as keyof typeof KIT_ICONS
  const iconDef = KIT_ICONS[iconKey]
  if (iconDef && typeof iconDef === 'object' && 'png' in iconDef) {
    return iconDef.png
  }
  return undefined
}

// Enhanced icon component helper - returns both emoji and PNG for flexible rendering
export function getKitIconData(kitType: string): { emoji: string; png?: string; alt: string } {
  const iconKey = kitType.toUpperCase() as keyof typeof KIT_ICONS
  const iconDef = KIT_ICONS[iconKey]
  if (iconDef && typeof iconDef === 'object') {
    return iconDef
  }
  return { emoji: ACTION_ICONS.INFO, alt: 'Unknown kit type' }
}

export default ICON_REGISTRY