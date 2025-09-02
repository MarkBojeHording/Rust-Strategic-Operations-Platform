// Game state management module

class GameState {
    constructor() {
        this.shapes = [];
        this.turrets = [];
        this.walls = [];
        this.walls2 = [];
        this.reinforcedWalls = [];
        this.garageDoors = [];
        this.securityGates = [];
        this.singlePosts = [];
        
        this.mousePos = { x: 0, y: 0 };
        this.snapEdge = null;
        this.showLineOfSight = false;
        this.lineOfSightTurret = null;
        this.showAllTurrets = false;
        
        // View settings
        this.zoom = 0.8;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }
    
    addItem(item, type) {
        switch(type) {
            case 'shape':
                this.shapes.push(item);
                break;
            case 'turret':
                this.turrets.push(item);
                break;
            case 'wall':
                this.walls.push(item);
                break;
            case 'wall2':
                this.walls2.push(item);
                break;
            case 'reinforcedWall':
                this.reinforcedWalls.push(item);
                break;
            case 'garageDoor':
                this.garageDoors.push(item);
                break;
            case 'securityGate':
                this.securityGates.push(item);
                break;
            case 'singlePost':
                this.singlePosts.push(item);
                break;
        }
    }
    
    removeItem(item, type) {
        switch(type) {
            case 'shape':
                this.shapes = this.shapes.filter(s => s !== item);
                break;
            case 'turret':
                this.turrets = this.turrets.filter(t => t !== item);
                break;
            case 'wall':
                this.walls = this.walls.filter(w => w !== item);
                break;
            case 'wall2':
                this.walls2 = this.walls2.filter(w => w !== item);
                break;
            case 'reinforcedWall':
                this.reinforcedWalls = this.reinforcedWalls.filter(w => w !== item);
                break;
            case 'garageDoor':
                this.garageDoors = this.garageDoors.filter(g => g !== item);
                break;
            case 'securityGate':
                this.securityGates = this.securityGates.filter(s => s !== item);
                break;
            case 'singlePost':
                this.singlePosts = this.singlePosts.filter(p => p !== item);
                break;
        }
    }
    
    getAllItems() {
        return [
            ...this.shapes,
            ...this.turrets,
            ...this.walls,
            ...this.walls2,
            ...this.reinforcedWalls,
            ...this.garageDoors,
            ...this.securityGates,
            ...this.singlePosts
        ];
    }
    
    getAllEdgeItems() {
        return [
            ...this.walls,
            ...this.walls2,
            ...this.reinforcedWalls,
            ...this.garageDoors,
            ...this.securityGates
        ];
    }
    
    findItemAt(x, y) {
        const allItems = this.getAllItems();
        
        for (let i = allItems.length - 1; i >= 0; i--) {
            const item = allItems[i];
            if (item.contains && item.contains(x, y)) {
                // Determine type
                let type = null;
                if (this.shapes.includes(item)) type = 'shape';
                else if (this.turrets.includes(item)) type = 'turret';
                else if (this.walls.includes(item)) type = 'wall';
                else if (this.walls2.includes(item)) type = 'wall2';
                else if (this.reinforcedWalls.includes(item)) type = 'reinforcedWall';
                else if (this.garageDoors.includes(item)) type = 'garageDoor';
                else if (this.securityGates.includes(item)) type = 'securityGate';
                else if (this.singlePosts.includes(item)) type = 'singlePost';
                
                return { item, type };
            }
        }
        
        return null;
    }
    
    clear() {
        this.shapes = [];
        this.turrets = [];
        this.walls = [];
        this.walls2 = [];
        this.reinforcedWalls = [];
        this.garageDoors = [];
        this.securityGates = [];
        this.singlePosts = [];
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}