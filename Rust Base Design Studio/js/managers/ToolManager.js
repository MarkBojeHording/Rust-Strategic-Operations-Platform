
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
        this.initialized = true;
    }
    
    init(buttonElements) {
        this.toolButtons = buttonElements;
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        Object.entries(this.toolButtons).forEach(([tool, btn]) => {
            if (btn) {
                btn.addEventListener('click', () => this.selectTool(tool));
            }
        });
    }
    
    selectTool(toolName) {
        this.currentTool = toolName;
        this.clearAllGhosts();
        
        Object.entries(this.toolButtons).forEach(([tool, btn]) => {
            if (btn) {
                btn.classList.toggle('active', tool === toolName);
            }
        });
        
        const canvas = document.getElementById('mapCanvas');
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
        Object.values(this.toolButtons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
    }
    
    isEdgeTool(toolName = this.currentTool) {
        return ['wall', 'window', 'reinforcedWall', 'door', 'securityGate'].includes(toolName);
    }
    
    isShapeTool(toolName = this.currentTool) {
        return ['square', 'triangle', 'square2'].includes(toolName);
    }
    
    setGhost(type, ghost) {
        this.ghostObjects[type] = ghost;
    }
    
    getGhost(type) {
        return this.ghostObjects[type];
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolManager;
} else if (typeof window !== 'undefined') {
    window.ToolManager = ToolManager;
}
