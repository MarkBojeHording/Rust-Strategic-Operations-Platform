// Tool management module

class ToolManager {
    constructor() {
        this.currentTool = null;
        this.toolButtons = {};
        this.ghostObjects = {
            shape: null,
            wall: null,
            wall2: null,
            reinforcedWall: null,
            garageDoor: null,
            securityGate: null
        };
    }
    
    init(buttonElements) {
        this.toolButtons = buttonElements;
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        Object.entries(this.toolButtons).forEach(([tool, btn]) => {
            btn.addEventListener('click', () => this.selectTool(tool));
        });
    }
    
    selectTool(toolName) {
        this.currentTool = toolName;
        this.clearAllGhosts();
        
        Object.entries(this.toolButtons).forEach(([tool, btn]) => {
            btn.classList.toggle('active', tool === toolName);
        });
        
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
    }
    
    clearAllGhosts() {
        Object.keys(this.ghostObjects).forEach(key => {
            this.ghostObjects[key] = null;
        });
    }
    
    clearTool() {
        this.currentTool = null;
        this.clearAllGhosts();
        Object.values(this.toolButtons).forEach(btn => btn.classList.remove('active'));
    }
    
    isEdgeTool(toolName = this.currentTool) {
        return ['wall', 'wall2', 'reinforcedWall', 'door', 'securityGate'].includes(toolName);
    }
    
    isShapeTool(toolName = this.currentTool) {
        return ['square', 'triangle', 'square2'].includes(toolName);
    }
    
    setGhost(type, object) {
        this.ghostObjects[type] = object;
    }
    
    getGhost(type) {
        return this.ghostObjects[type];
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolManager;
}