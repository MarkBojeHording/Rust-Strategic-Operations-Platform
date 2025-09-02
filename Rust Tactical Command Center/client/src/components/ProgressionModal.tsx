import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { calculateHarvestTimeReduction, calculateCloneTimeReduction } from '@/lib/geneticTimingUtils'

interface ProgressionModalProps {
  isOpen: boolean
  onClose: () => void
  onProgressionDisplayChange?: (settings: {
    enabled: boolean
    inGroupWeapon: string
    aloneWeapon: string
    counteringWeapon: string
  }) => void
}

// Check if any gene data is available from the database
const checkGeneDataAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/genetic-data')
    const data = await response.json()
    return data && data.length > 0
  } catch (e) {
    console.error('Failed to check gene data availability:', e)
    return false
  }
}


// Calculate gene quality score like the gene calculator does
const calculateGeneQuality = (gene: string): number => {
  const scoring: Record<string, number> = { 'G': 5, 'Y': 3, 'H': 1, 'W': -2, 'X': -2 }
  return gene.split('').reduce((score: number, letter: string) => score + (scoring[letter] || 0), 0)
}

// Find best gene for a plant type using same logic as gene calculator
const findBestGeneForPlant = (genesArray: string[]): string | null => {
  if (!genesArray || genesArray.length === 0) return null
  
  let bestGene = genesArray[0]
  let bestScore = calculateGeneQuality(bestGene)
  let bestGYCount = bestGene.split('').filter((g: string) => ['G', 'Y'].includes(g)).length
  
  genesArray.forEach((gene: string) => {
    const score = calculateGeneQuality(gene)
    const gyCount = gene.split('').filter((g: string) => ['G', 'Y'].includes(g)).length
    
    // Update best if this gene has a higher score, or same score but more G/Y genes
    if (score > bestScore || (score === bestScore && gyCount > bestGYCount)) {
      bestScore = score
      bestGene = gene
      bestGYCount = gyCount
    }
  })
  
  return bestGene
}

interface PlantGeneData {
  bestGene: string | null
  progress: number
}

interface GeneDataResult {
  hemp: PlantGeneData
  blueberry: PlantGeneData
  yellowberry: PlantGeneData
  redberry: PlantGeneData
  pumpkin: PlantGeneData
}

// Fetch genetic data from centralized database
const fetchGeneticDataFromAPI = async (): Promise<GeneDataResult> => {
  try {
    console.log('Fetching genetic data from API...')
    
    const response = await fetch('/api/genetic-data')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const apiData = await response.json()
    console.log('API genetic data:', apiData)
    
    const result: GeneDataResult = {
      hemp: { bestGene: null, progress: 0 },
      blueberry: { bestGene: null, progress: 0 },
      yellowberry: { bestGene: null, progress: 0 },
      redberry: { bestGene: null, progress: 0 },
      pumpkin: { bestGene: null, progress: 0 }
    }
    
    // Process API data
    apiData.forEach((plantData: any) => {
      const plantKey = plantData.plantType as keyof GeneDataResult
      if (result[plantKey]) {
        result[plantKey] = {
          bestGene: plantData.bestGene,
          progress: plantData.progress || 0
        }
      }
    })
    
    return result
  } catch (e) {
    console.error('Failed to fetch genetic data from API:', e)
    return {
      hemp: { bestGene: null, progress: 0 },
      blueberry: { bestGene: null, progress: 0 },
      yellowberry: { bestGene: null, progress: 0 },
      redberry: { bestGene: null, progress: 0 },
      pumpkin: { bestGene: null, progress: 0 }
    }
  }
}

// Save genetic data to centralized database
const saveGeneticDataToAPI = async (plantType: string, genes: string[], progress: number, bestGene: string | null) => {
  try {
    console.log(`Saving genetic data for ${plantType}:`, { genes, progress, bestGene })
    
    const response = await fetch('/api/genetic-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plantType,
        genes,
        progress,
        bestGene
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log(`Saved genetic data for ${plantType}:`, result)
    return result
  } catch (e) {
    console.error(`Failed to save genetic data for ${plantType}:`, e)
  }
}

export function ProgressionModal({ isOpen, onClose, onProgressionDisplayChange }: ProgressionModalProps) {
  const [inGroupWeapon, setInGroupWeapon] = useState('Bow')
  const [aloneWeapon, setAloneWeapon] = useState('Spear')
  const [counteringWeapon, setCounteringWeapon] = useState('Spear')
  const [displayOnMap, setDisplayOnMap] = useState(false)
  
  // Query genetic data from database using React Query
  const { data: geneData, isLoading, refetch } = useQuery({
    queryKey: ['/api/genetic-data'],
    queryFn: fetchGeneticDataFromAPI,
    enabled: isOpen, // Only fetch when modal is open
    refetchOnWindowFocus: false,
    refetchInterval: isOpen ? 2000 : false, // Refetch every 2 seconds when modal is open
    initialData: {
      hemp: { bestGene: null, progress: 0 },
      blueberry: { bestGene: null, progress: 0 },
      yellowberry: { bestGene: null, progress: 0 },
      redberry: { bestGene: null, progress: 0 },
      pumpkin: { bestGene: null, progress: 0 }
    }
  })
  
  const weaponOptions = ['Spear', 'Bow', 'DB', 'P2', 'SAR', 'Tommy', 'MP-5', 'AK-47', 'M249']
  
  // Function to restore previously synced gene data to database
  const restorePreviousGeneData = async () => {
    try {
      // Save hemp data
      await saveGeneticDataToAPI('hemp', ['GYGYGY'], 100, 'GYGYGY')
      // Save blueberry data
      await saveGeneticDataToAPI('blueberry', ['HGHHGG'], 50, 'HGHHGG')
      // Save yellowberry data
      await saveGeneticDataToAPI('yellowberry', ['HHYHHH', 'YYHHHH', 'GYGHHH'], 50, findBestGeneForPlant(['HHYHHH', 'YYHHHH', 'GYGHHH']))
      // Save redberry data
      await saveGeneticDataToAPI('redberry', ['HHYYGG'], 67, 'HHYYGG')
      // Save pumpkin data (empty)
      await saveGeneticDataToAPI('pumpkin', [], 0, null)
      
      // Refetch the data to update the UI
      await refetch()
      console.log('Restored previous gene data to database')
    } catch (e) {
      console.error('Failed to restore gene data:', e)
    }
  }

  // Test function to add sample gene data to database
  const addTestGeneData = async () => {
    try {
      const testData = [
        { type: 'hemp', genes: ['GGYYYY', 'GGGYYX', 'GGGGYH'], progress: 85 },
        { type: 'blueberry', genes: ['YYWWHX', 'GGYWHY', 'YGYWGH'], progress: 42 },
        { type: 'yellowberry', genes: ['XWHGHY', 'YYGYGG', 'GGGGGY'], progress: 67 },
        { type: 'redberry', genes: ['WWWXXY', 'YHGHGY', 'GYYYYY'], progress: 23 },
        { type: 'pumpkin', genes: ['HHHHWW', 'GGGGGG', 'YGYGYW'], progress: 91 }
      ]
      
      // Save each plant's data to the database
      for (const plant of testData) {
        const bestGene = findBestGeneForPlant(plant.genes)
        await saveGeneticDataToAPI(plant.type, plant.genes, plant.progress, bestGene)
      }
      
      // Refetch the data to update the UI
      await refetch()
      console.log('Added test gene data to database')
    } catch (e) {
      console.error('Failed to add test gene data:', e)
    }
  }
  
  const clearTestGeneData = async () => {
    try {
      const confirm = window.confirm('This will clear all gene progress data. Are you sure?')
      if (!confirm) return
      
      // Clear all genetic data from the database
      const response = await fetch('/api/genetic-data', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Refetch to update the UI
      await refetch()
      console.log('Cleared all gene data from database')
    } catch (e) {
      console.error('Failed to clear gene data:', e)
    }
  }
  
  // Function to manually request data from open gene calculator popup
  const requestDataFromPopup = () => {
    try {
      // Check if there's a reference to the popup stored globally
      const popup = (window as any).geneCalculatorPopup
      if (popup && !popup.closed) {
        console.log('Found open gene calculator popup via stored reference, requesting data...')
        
        // Send a message to the popup requesting its current data
        popup.postMessage({
          type: 'REQUEST_GENE_DATA',
          timestamp: Date.now()
        }, '*')
        
        console.log('Sent data request to popup')
      } else {
        console.log('No open gene calculator popup found via stored reference')
        alert('Please open the Gene Calculator from the toolbar first, then try this button again.')
      }
    } catch (e) {
      console.error('Error requesting data from popup:', e)
      alert('Error communicating with Gene Calculator. Please close and reopen it.')
    }
  }
  
  // Refetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      refetch()
    }
  }, [isOpen, refetch])

  // Listen for gene calculator popup communication when modal is open
  useEffect(() => {
    if (!isOpen) return
    
    // Listen for postMessage updates from the gene calculator popup
    const handleMessageFromPopup = async (event: MessageEvent) => {
      console.log('Received postMessage:', event.data)
      
      if (event.data.type === 'GENE_DATA_UPDATE') {
        console.log('Processing gene data update from popup:', event.data)
        
        try {
          const { geneData } = event.data.data
          if (geneData && geneData.plantGenes) {
            // Save each plant's data to the database
            const plantTypes = ['hemp', 'blueberry', 'yellowberry', 'redberry', 'pumpkin']
            
            for (const plantType of plantTypes) {
              const genes = geneData.plantGenes[plantType] || []
              const isCurrentPlant = plantType === geneData.currentPlant
              const genesArray = isCurrentPlant ? geneData.genes || [] : genes
              const bestGene = findBestGeneForPlant(genesArray)
              const progress = genesArray.length > 0 ? 100 : 0
              
              await saveGeneticDataToAPI(plantType, genesArray, progress, bestGene)
            }
            
            // Refetch to update the UI
            await refetch()
            console.log('Saved gene data from popup to database')
          }
        } catch (e) {
          console.error('Failed to save gene data from popup:', e)
        }
      }
      
      if (event.data.type === 'GENE_PROGRESS_UPDATE') {
        console.log('Processing gene progress update from popup:', event.data)
        
        try {
          const { progressData } = event.data.data
          if (progressData) {
            // Update progress for each plant type
            const plantTypes = ['hemp', 'blueberry', 'yellowberry', 'redberry', 'pumpkin']
            
            for (const plantType of plantTypes) {
              const progress = progressData[plantType] || 0
              // Get existing data to preserve genes and bestGene
              const response = await fetch(`/api/genetic-data/${plantType}`)
              if (response.ok) {
                const existingData = await response.json()
                await saveGeneticDataToAPI(
                  plantType,
                  existingData.genes || [],
                  progress,
                  existingData.bestGene
                )
              } else {
                // Create new entry with just progress
                await saveGeneticDataToAPI(plantType, [], progress, null)
              }
            }
            
            // Refetch to update the UI
            await refetch()
            console.log('Updated gene progress from popup in database')
          }
        } catch (e) {
          console.error('Failed to update gene progress from popup:', e)
        }
      }
    }
    
    window.addEventListener('message', handleMessageFromPopup)
    
    return () => {
      window.removeEventListener('message', handleMessageFromPopup)
    }
  }, [isOpen])

  // Update parent component when display settings change
  useEffect(() => {
    if (onProgressionDisplayChange) {
      onProgressionDisplayChange({
        enabled: displayOnMap,
        inGroupWeapon,
        aloneWeapon,
        counteringWeapon
      })
    }
  }, [displayOnMap, inGroupWeapon, aloneWeapon, counteringWeapon, onProgressionDisplayChange])

  const plantIcons = {
    hemp: '🌿',
    blueberry: '🫐', 
    yellowberry: '🟡',
    redberry: '🔴',
    pumpkin: '🎃'
  }

  const plantNames = {
    hemp: 'Hemp',
    blueberry: 'Blueberry',
    yellowberry: 'Yellow Berry', 
    redberry: 'Red Berry',
    pumpkin: 'Pumpkin'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-gray-900 border-2 border-orange-500 text-orange-50 shadow-2xl shadow-orange-800/50">
        <DialogHeader className="border-b border-orange-600/50 pb-3">
          <DialogTitle className="text-orange-400 font-mono text-lg tracking-wider text-center">
            [PROGRESSION SYSTEM]
          </DialogTitle>
          <DialogDescription className="sr-only">
            Progression tracker for managing team kit levels during wipe day
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full p-4 gap-4">
          {/* Recommended Kit Level Container */}
          <div className="border-2 border-orange-500/50 p-4 bg-gray-800/50">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h3 className="text-orange-400 font-mono text-lg tracking-wider">
                RECOMMENDED KIT LEVEL
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={displayOnMap} 
                  onCheckedChange={(checked) => setDisplayOnMap(checked === true)}
                  className="border-orange-500/50 data-[state=checked]:bg-orange-500"
                />
                <span className="text-orange-200 text-sm">Display on map</span>
              </div>
            </div>
            
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center">
                <label className="text-orange-400 mb-2 font-mono">In a group</label>
                <Select value={inGroupWeapon} onValueChange={setInGroupWeapon}>
                  <SelectTrigger className="w-40 bg-gray-800 border-orange-500/50 text-orange-100">
                    <SelectValue placeholder="Select weapon" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-orange-500/50">
                    {weaponOptions.map((weapon) => (
                      <SelectItem key={weapon} value={weapon} className="text-orange-100 hover:bg-orange-500/20">
                        {weapon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center">
                <label className="text-orange-400 mb-2 font-mono">Alone</label>
                <Select value={aloneWeapon} onValueChange={setAloneWeapon}>
                  <SelectTrigger className="w-40 bg-gray-800 border-orange-500/50 text-orange-100">
                    <SelectValue placeholder="Select weapon" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-orange-500/50">
                    {weaponOptions.map((weapon) => (
                      <SelectItem key={weapon} value={weapon} className="text-orange-100 hover:bg-orange-500/20">
                        {weapon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center">
                <label className="text-orange-400 mb-2 font-mono">Countering</label>
                <Select value={counteringWeapon} onValueChange={setCounteringWeapon}>
                  <SelectTrigger className="w-40 bg-gray-800 border-orange-500/50 text-orange-100">
                    <SelectValue placeholder="Select weapon" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-orange-500/50">
                    {weaponOptions.map((weapon) => (
                      <SelectItem key={weapon} value={weapon} className="text-orange-100 hover:bg-orange-500/20">
                        {weapon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bottom Section with Left Container and Message Container */}
          <div className="flex gap-4 flex-1">
            {/* Gene Progress Container */}
            <div className="border-2 border-orange-500/50 p-4 bg-gray-800/50 w-48 flex-shrink-0">
              <h3 className="text-orange-400 font-mono text-sm tracking-wider mb-3 text-center">
                GENE PROGRESS
              </h3>
              <div className="space-y-3">
                {Object.keys(plantNames).map((plant) => {
                  const plantKey = plant as keyof typeof plantNames
                  const plantData = geneData[plantKey]
                  const bestGene = plantData?.bestGene
                  const progressPercent = plantData?.progress || 0
                  
                  return (
                    <div key={plant} className="space-y-2">
                      <div className="relative">
                        <div className="w-full bg-gray-700/50 rounded-full h-6">
                          <div 
                            className="bg-green-500/50 h-6 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(progressPercent)}%` }}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center gap-2 px-3">
                          <span className="text-sm">{plantIcons[plantKey]}</span>
                          <span className="text-orange-200 text-sm font-mono">{plantNames[plantKey]}</span>
                        </div>
                      </div>
                      
                      {/* Best Gene Display with Timing */}
                      <div className="flex items-center justify-between text-xs">
                        {/* Clone timing on left */}
                        <div className="text-center">
                          {bestGene && (
                            <>
                              <div className="text-orange-300 font-mono">clone</div>
                              <div className="text-orange-100">
                                {(() => {
                                  const geneDataArray = [{ plantType: plant, bestGene: bestGene }];
                                  const cloneReduction = calculateCloneTimeReduction(plant, geneDataArray);
                                  const cloneTimeMinutes = 13 - Math.round(cloneReduction * 13 / 100);
                                  return `${cloneTimeMinutes}m`;
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Best gene in center */}
                        <div className="flex justify-center">
                          {bestGene ? (
                            <div className="inline-flex gap-0.5 bg-gray-900/70 px-1 py-0.5 rounded">
                              {bestGene.split('').map((letter: string, i: number) => (
                                <span 
                                  key={i}
                                  className={`
                                    w-3 h-3 text-xs font-bold font-mono flex items-center justify-center rounded
                                    ${['G', 'Y'].includes(letter) ? 'bg-green-600 text-white' : 
                                      letter === 'H' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}
                                  `}
                                >
                                  {letter}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">None</span>
                          )}
                        </div>
                        
                        {/* Harvest timing on right */}
                        <div className="text-center">
                          {bestGene && (
                            <>
                              <div className="text-orange-300 font-mono">harvest</div>
                              <div className="text-orange-100">
                                {(() => {
                                  const geneDataArray = [{ plantType: plant, bestGene: bestGene }];
                                  const harvestReduction = calculateHarvestTimeReduction(plant, geneDataArray);
                                  const harvestTimeSeconds = 150 - Math.round(harvestReduction * 150 / 100);
                                  const minutes = Math.floor(harvestTimeSeconds / 60);
                                  const seconds = harvestTimeSeconds % 60;
                                  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message Container */}
            <div className="border-2 border-orange-500/50 p-6 bg-gray-800/50 flex-1 flex items-center justify-center">
              <div className="text-center max-w-3xl">
                <p className="text-4xl font-mono text-orange-400 leading-relaxed tracking-wide">
                  The progression system is a check the box progression tracker to help teams keep their wipe day from getting chaotic. This feature is still under construction.
                </p>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-end">
            <Button 
              onClick={onClose}
              className="bg-orange-600 hover:bg-orange-700 text-white font-mono tracking-wider px-8 py-2"
            >
              [DONE]
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}