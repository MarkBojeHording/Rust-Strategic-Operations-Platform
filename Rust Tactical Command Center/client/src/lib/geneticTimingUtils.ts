// Genetic timing utilities for farm radial menu
// Replicates the exact logic from gene-calculator.html

export interface GeneticData {
  plantType: string;
  bestGene: string;
  progress: number;
}

// Plant mapping for genetic data lookup
export const plantTypeMapping = {
  '0-green': 'hemp',
  '0-0-bottom': 'yellowberry', 
  '0-0-top': 'pumpkin',
  '0-1-bottom': 'redberry',
  '0-1-top': 'blueberry'
};

// Calculate timing based on genetic data - same logic as genetic calculator
export const calculateHarvestTimeReduction = (plantType: string, geneticData: GeneticData[]): number => {
  if (!Array.isArray(geneticData)) return 0;
  const geneticPlantData = geneticData.find(g => g.plantType === plantType);
  if (!geneticPlantData?.bestGene) return 0;
  
  const gCount = geneticPlantData.bestGene.split('').filter(g => g === 'G').length;
  const reductions: Record<number, number> = { 0: 0, 1: 20, 2: 39, 3: 50, 4: 56, 5: 60, 6: 62 };
  return reductions[gCount] || 0;
};

export const calculateCloneTimeReduction = (plantType: string, geneticData: GeneticData[]): number => {
  if (!Array.isArray(geneticData)) return 0;
  const geneticPlantData = geneticData.find(g => g.plantType === plantType);
  if (!geneticPlantData?.bestGene) return 0;
  
  const gCount = geneticPlantData.bestGene.split('').filter(g => g === 'G').length;
  if (gCount === 0) return 0;
  return 2 + (gCount - 1); // 2 for first G, plus 1 for each additional
};

export const formatTimerDisplay = (selectedPlant: string, geneticData: GeneticData[]): { harvest: string; clone: string } => {
  if (!selectedPlant || !plantTypeMapping[selectedPlant as keyof typeof plantTypeMapping] || !Array.isArray(geneticData)) {
    return { harvest: '2:30', clone: '13m' };
  }

  const plantType = plantTypeMapping[selectedPlant as keyof typeof plantTypeMapping];
  
  // Calculate harvest time
  const baseHarvestMinutes = 150; // 2:30
  const harvestReduction = calculateHarvestTimeReduction(plantType, geneticData);
  const finalHarvestMinutes = baseHarvestMinutes - harvestReduction;
  const harvestHours = Math.floor(finalHarvestMinutes / 60);
  const harvestMins = finalHarvestMinutes % 60;
  const harvestDisplay = harvestMins === 0 ? `${harvestHours}:00` : `${harvestHours}:${harvestMins.toString().padStart(2, '0')}`;
  
  // Calculate clone time  
  const baseCloneMinutes = 13;
  const cloneReduction = calculateCloneTimeReduction(plantType, geneticData);
  const finalCloneMinutes = baseCloneMinutes - cloneReduction;
  const cloneDisplay = `${finalCloneMinutes}m`;
  
  return { harvest: harvestDisplay, clone: cloneDisplay };
};