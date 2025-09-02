// Turret management module

class TurretManager {
    constructor() {
        this.globalTurretCounter = 1;
        this.powerContainers = [];
        this.selectedContainer = null;
        this.containerError = null;
        this.initialized = true;
    }
    
    // Initialize global turret counter based on existing turrets
    initializeGlobalTurretCounter(gameState, floorData) {
        let maxNumber = 0;
        
        // Check main canvas turrets
        if (gameState && gameState.turrets) {
            gameState.turrets.forEach(turret => {
                if (turret.number && turret.number > maxNumber) {
                    maxNumber = turret.number;
                }
            });
        }
        
        // Check all floor turrets
        if (floorData) {
            for (let floorNum = 2; floorNum <= 5; floorNum++) {
                if (floorData[floorNum] && floorData[floorNum].turrets) {
                    floorData[floorNum].turrets.forEach(turret => {
                        if (turret.number && turret.number > maxNumber) {
                            maxNumber = turret.number;
                        }
                    });
                }
            }
        }
        
        this.globalTurretCounter = maxNumber + 1;
    }
    
    // Get next available turret number
    getNextTurretNumber() {
        return this.globalTurretCounter++;
    }
    
    // Place turret on main canvas
    placeTurret(x, y, gameState, callbacks = {}) {
        if (!gameState) return null;
        
        const newTurret = new Turret(x, y);
        newTurret.floorNumber = 1;
        newTurret.number = this.getNextTurretNumber();
        
        gameState.turrets.push(newTurret);
        
        // Handle selection and FOV
        if (callbacks.deselectAll) callbacks.deselectAll();
        newTurret.selected = true;
        
        if (!gameState.showAllTurrets) {
            gameState.showLineOfSight = true;
            gameState.lineOfSightTurret = newTurret;
        }
        
        if (callbacks.updateSelectedInfo) callbacks.updateSelectedInfo();
        if (callbacks.updateFloorIndicator) callbacks.updateFloorIndicator(1);
        if (callbacks.draw) callbacks.draw();
        
        return newTurret;
    }
    
    // Place turret on specific floor
    placeTurretOnFloor(x, y, floorNumber, floorData, gameState, callbacks = {}) {
        if (!floorData || !floorData[floorNumber]) return null;
        
        const floor = floorData[floorNumber];
        const turret = new Turret(x, y);
        turret.floorNumber = floorNumber;
        turret.rotation = 0;
        turret.number = this.getNextTurretNumber();
        
        floor.turrets.push(turret);
        
        // Handle selection and FOV
        if (callbacks.deselectAll) callbacks.deselectAll();
        turret.selected = true;
        
        if (gameState) {
            gameState.showLineOfSight = true;
            gameState.lineOfSightTurret = turret;
        }
        
        if (callbacks.updateSelectedInfo) callbacks.updateSelectedInfo();
        if (callbacks.redrawAllFloorCanvases) callbacks.redrawAllFloorCanvases();
        if (callbacks.draw) callbacks.draw();
        
        return turret;
    }
    
    // Handle turret click for FOV toggling
    handleTurretClick(turret, gameState, callbacks = {}) {
        if (!turret || !gameState) return;
        
        if (gameState.showAllTurrets) {
            if (callbacks.selectItem) {
                callbacks.selectItem(turret, 'turret');
            }
        } else {
            // Check if clicking the same turret that already has FOV active
            if (turret.selected && gameState.lineOfSightTurret === turret && gameState.showLineOfSight) {
                gameState.showLineOfSight = false;
                gameState.lineOfSightTurret = null;
                turret.selected = true; // Keep selected but turn off FOV
            } else {
                // Clear all selections and activate FOV for this turret
                if (callbacks.clearAllSelections) callbacks.clearAllSelections();
                if (callbacks.selectItem) callbacks.selectItem(turret, 'turret');
                
                gameState.showLineOfSight = true;
                gameState.lineOfSightTurret = turret;
            }
            
            if (callbacks.updateSelectedInfo) callbacks.updateSelectedInfo();
        }
        
        if (callbacks.draw) callbacks.draw();
    }
    
    // Update all turret numbers globally across all floors
    updateAllTurretNumbers(gameState, floorData) {
        let globalTurretNumber = 1;
        
        // Number main canvas turrets first
        if (gameState && gameState.turrets) {
            gameState.turrets.forEach((turret) => {
                turret.number = globalTurretNumber++;
            });
        }
        
        // Then number turrets on additional floors
        if (floorData) {
            for (let floorNum = 2; floorNum <= 5; floorNum++) {
                if (floorData[floorNum] && floorData[floorNum].turrets) {
                    floorData[floorNum].turrets.forEach((turret) => {
                        turret.number = globalTurretNumber++;
                    });
                }
            }
        }
        
        // Update the global counter to the next available number
        this.globalTurretCounter = globalTurretNumber;
    }
    
    // Rotate turret by 45 degrees (user preference)
    rotateTurret(turret, callbacks = {}) {
        if (!turret) return;
        
        turret.rotate();
        
        if (callbacks.updateSelectedInfo) callbacks.updateSelectedInfo();
        if (callbacks.draw) callbacks.draw();
        if (callbacks.redrawAllFloorCanvases) callbacks.redrawAllFloorCanvases();
    }
    
    // Power container management
    addPowerContainer(name) {
        if (!name || name.trim() === '') {
            this.containerError = 'Container name cannot be empty';
            return false;
        }
        
        if (this.powerContainers.some(c => c.name === name.trim())) {
            this.containerError = 'Container name already exists';
            return false;
        }
        
        const container = {
            id: Date.now(),
            name: name.trim(),
            enabled: true,
            connectedTurrets: []
        };
        
        this.powerContainers.push(container);
        this.containerError = null;
        return true;
    }
    
    // Delete power container
    deletePowerContainer(containerId) {
        const index = this.powerContainers.findIndex(c => c.id === containerId);
        if (index > -1) {
            this.powerContainers.splice(index, 1);
            if (this.selectedContainer && this.selectedContainer.id === containerId) {
                this.selectedContainer = null;
            }
            return true;
        }
        return false;
    }
    
    // Toggle power container enabled state
    togglePowerContainer(containerId, callbacks = {}) {
        const container = this.powerContainers.find(c => c.id === containerId);
        if (container) {
            container.enabled = !container.enabled;
            
            // Trigger canvas redraws to update FOV visibility
            if (callbacks.draw) callbacks.draw();
            if (callbacks.redrawAllFloorCanvases) callbacks.redrawAllFloorCanvases();
            
            return true;
        }
        return false;
    }
    
    // Connect turret to power container
    connectTurretToContainer(containerId, turretNumber) {
        const container = this.powerContainers.find(c => c.id === containerId);
        if (!container) return false;
        
        // Check 12-turret limit
        if (container.connectedTurrets.length >= 12) {
            this.containerError = 'Maximum 12 turrets per container';
            return false;
        }
        
        // Remove from other containers first
        this.powerContainers.forEach(c => {
            c.connectedTurrets = c.connectedTurrets.filter(t => t !== turretNumber);
        });
        
        // Add to selected container if not already present
        if (!container.connectedTurrets.includes(turretNumber)) {
            container.connectedTurrets.push(turretNumber);
        }
        
        this.containerError = null;
        return true;
    }
    
    // Disconnect turret from container
    disconnectTurretFromContainer(containerId, turretNumber) {
        const container = this.powerContainers.find(c => c.id === containerId);
        if (container) {
            container.connectedTurrets = container.connectedTurrets.filter(t => t !== turretNumber);
            return true;
        }
        return false;
    }
    
    // Check if turret should show FOV based on power status
    shouldShowTurretFOV(turret, gameState) {
        if (!gameState || !turret) return false;
        
        // In tactical mode, check power container status
        if (typeof tacticalModeActive !== 'undefined' && tacticalModeActive) {
            const connectedContainer = this.powerContainers.find(c => 
                c.connectedTurrets.includes(turret.number)
            );
            
            if (!connectedContainer || !connectedContainer.enabled) {
                return false;
            }
        }
        
        // Check normal FOV conditions
        return (gameState.showLineOfSight && gameState.lineOfSightTurret === turret) || 
               gameState.showAllTurrets;
    }
    
    // Get all unassigned turrets
    getUnassignedTurrets(gameState, floorData) {
        const allTurrets = new Set();
        const assignedTurrets = new Set();
        
        // Collect all turret numbers
        if (gameState && gameState.turrets) {
            gameState.turrets.forEach(t => allTurrets.add(t.number));
        }
        
        if (floorData) {
            for (let floorNum = 2; floorNum <= 5; floorNum++) {
                if (floorData[floorNum] && floorData[floorNum].turrets) {
                    floorData[floorNum].turrets.forEach(t => allTurrets.add(t.number));
                }
            }
        }
        
        // Collect assigned turret numbers
        this.powerContainers.forEach(container => {
            container.connectedTurrets.forEach(turretNum => {
                assignedTurrets.add(turretNum);
            });
        });
        
        // Return unassigned turrets
        return Array.from(allTurrets).filter(turretNum => !assignedTurrets.has(turretNum)).sort((a, b) => a - b);
    }
    
    // Count connected turrets across all containers
    countConnectedTurrets() {
        const connectedTurrets = new Set();
        this.powerContainers.forEach(container => {
            container.connectedTurrets.forEach(turretNum => {
                connectedTurrets.add(turretNum);
            });
        });
        return connectedTurrets.size;
    }
    
    // Generate turret SVG for UI
    generateTurretSVG() {
        return `
            <g transform="rotate(0 60 60)">
                <rect x="57" y="35" width="6" height="26" fill="#555" stroke="#333" stroke-width="1"/>
            </g>
            <g transform="rotate(135 60 60)">
                <rect x="57" y="35" width="6" height="26" fill="#555" stroke="#333" stroke-width="1"/>
            </g>
            <g transform="rotate(225 60 60)">
                <rect x="57" y="35" width="6" height="26" fill="#555" stroke="#333" stroke-width="1"/>
            </g>
            <circle cx="60" cy="60" r="30" fill="#A57070" stroke="#444" stroke-width="3"/>
            <polygon points="60,35 55,45 65,45" fill="#333"/>
            <line x1="60" y1="60" x2="60" y2="45" stroke="#333" stroke-width="3"/>
            <circle cx="60" cy="60" r="7" fill="#444"/>
        `;
    }
    
    // Get turret status text for UI
    getTurretStatus(turret, gameState) {
        if (!gameState) return 'OFF';
        
        if (gameState.showAllTurrets) return 'ALL TURRETS ACTIVE';
        if (gameState.showLineOfSight && gameState.lineOfSightTurret === turret) return 'ON';
        if (gameState.showLineOfSight && gameState.lineOfSightTurret !== turret) return 'OFF (Another turret active)';
        return 'OFF';
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurretManager;
} else if (typeof window !== 'undefined') {
    window.TurretManager = TurretManager;
}