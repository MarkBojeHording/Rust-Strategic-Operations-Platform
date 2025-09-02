// Main application module
class ShapeMapEditor {
    constructor() {
        this.gameState = new GameState();
        this.toolManager = new ToolManager();
        this.selectionManager = new SelectionManager();
        this.canvas = null;
        this.ctx = null;
        
        // Make these available globally for backwards compatibility
        window.gameState = this.gameState;
        window.toolManager = this.toolManager;
        window.selectionManager = this.selectionManager;
        
        // Expose zoom for edge items
        window.zoom = this.gameState.zoom;
    }
    
    init() {
        this.setupCanvas();
        this.setupTools();
        this.setupEventListeners();
        this.startGameLoop();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 900;
        this.canvas.height = 600;
    }
    
    setupTools() {
        const toolButtons = {
            square: document.getElementById('squareBtn'),
            triangle: document.getElementById('triangleBtn'),
            square2: document.getElementById('square2Btn'),
            wall: document.getElementById('wallBtn'),
            wall2: document.getElementById('wall2Btn'),
            reinforcedWall: document.getElementById('reinforcedWallBtn'),
            door: document.getElementById('doorBtn'),
            securityGate: document.getElementById('securityGateBtn')
        };
        
        this.toolManager.init(toolButtons);
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Pan controls
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Update mouse position
        this.gameState.mousePos = this.screenToWorld(screenX, screenY);
        
        // Handle panning
        if (this.gameState.isPanning) {
            this.gameState.panX += screenX - this.gameState.lastMouseX;
            this.gameState.panY += screenY - this.gameState.lastMouseY;
            this.gameState.lastMouseX = screenX;
            this.gameState.lastMouseY = screenY;
            this.draw();
            return;
        }
        
        // Handle tool previews
        this.updateToolPreview();
        this.draw();
    }
    
    updateToolPreview() {
        const currentTool = this.toolManager.currentTool;
        
        if (!currentTool) return;
        
        // Clear all ghosts
        this.toolManager.clearAllGhosts();
        
        if (this.toolManager.isEdgeTool(currentTool)) {
            this.updateEdgeToolPreview(currentTool);
        } else if (this.toolManager.isShapeTool(currentTool)) {
            this.updateShapeToolPreview(currentTool);
        }
    }
    
    updateEdgeToolPreview(toolType) {
        if (this.gameState.shapes.length === 0) {
            this.canvas.style.cursor = 'not-allowed';
            return;
        }
        
        const nearestEdge = this.findNearestEdge(this.gameState.mousePos.x, this.gameState.mousePos.y);
        
        if (nearestEdge && !this.anythingExistsOnEdge(nearestEdge)) {
            let ghostItem = null;
            
            switch(toolType) {
                case 'wall':
                    ghostItem = new Wall(nearestEdge);
                    this.toolManager.setGhost('wall', ghostItem);
                    break;
                case 'wall2':
                    ghostItem = new Wall2(nearestEdge);
                    this.toolManager.setGhost('wall2', ghostItem);
                    break;
                // Add other edge tools as needed
            }
            
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    updateShapeToolPreview(toolType) {
        let ghostShape = null;
        
        switch(toolType) {
            case 'square':
                ghostShape = new Square(this.gameState.mousePos.x, this.gameState.mousePos.y);
                break;
            case 'triangle':
                ghostShape = new Triangle(this.gameState.mousePos.x, this.gameState.mousePos.y);
                break;
        }
        
        if (ghostShape) {
            this.toolManager.setGhost('shape', ghostShape);
        }
        
        this.canvas.style.cursor = 'crosshair';
    }
    
    handleMouseClick(e) {
        const worldCoords = this.getWorldCoords(e);
        const currentTool = this.toolManager.currentTool;
        
        if (!currentTool) {
            // Selection mode
            this.handleSelection(worldCoords.x, worldCoords.y);
            return;
        }
        
        if (this.toolManager.isShapeTool(currentTool)) {
            this.createShape(currentTool, worldCoords.x, worldCoords.y);
        } else if (this.toolManager.isEdgeTool(currentTool)) {
            this.createEdgeItem(currentTool);
        }
        
        this.draw();
    }
    
    createShape(type, x, y) {
        let shape = null;
        
        switch(type) {
            case 'square':
                shape = new Square(x, y);
                break;
            case 'triangle':
                shape = new Triangle(x, y);
                break;
            case 'square2':
                shape = new Square2(x, y);
                break;
        }
        
        if (shape) {
            this.gameState.addItem(shape, 'shape');
        }
    }
    
    createEdgeItem(type) {
        const nearestEdge = this.findNearestEdge(this.gameState.mousePos.x, this.gameState.mousePos.y);
        
        if (!nearestEdge || this.anythingExistsOnEdge(nearestEdge)) {
            return;
        }
        
        let item = null;
        
        switch(type) {
            case 'wall':
                item = new Wall(nearestEdge);
                this.gameState.addItem(item, 'wall');
                break;
            case 'wall2':
                item = new Wall2(nearestEdge);
                this.gameState.addItem(item, 'wall2');
                break;
            // Add other edge tools as needed
        }
    }
    
    handleSelection(x, y) {
        const found = this.gameState.findItemAt(x, y);
        
        if (found) {
            this.selectionManager.selectItem(found.item, found.type);
        } else {
            this.selectionManager.deselectAll(this.gameState.getAllItems());
        }
        
        this.draw();
    }
    
    handleRightClick(e) {
        e.preventDefault();
        // Clear tool
        this.toolManager.clearTool();
        this.canvas.style.cursor = 'default';
        this.draw();
    }
    
    handleKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'r':
                const selected = this.selectionManager.getSelectedItem();
                if (selected && selected.type === 'shape' && selected.item.type === 'square2') {
                    selected.item.rotation += Math.PI / 6; // 30 degree increments
                    this.draw();
                }
                break;
            case 'delete':
                const selectedItem = this.selectionManager.getSelectedItem();
                if (selectedItem) {
                    this.gameState.removeItem(selectedItem.item, selectedItem.type);
                    this.selectionManager.deselectAll(this.gameState.getAllItems());
                    this.draw();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        // Add key handling as needed
    }
    
    handleMouseDown(e) {
        if (e.button === 1 || (e.ctrlKey && e.button === 0)) { // Middle mouse or Ctrl+click
            this.gameState.isPanning = true;
            const rect = this.canvas.getBoundingClientRect();
            this.gameState.lastMouseX = e.clientX - rect.left;
            this.gameState.lastMouseY = e.clientY - rect.top;
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }
    
    handleMouseUp() {
        this.gameState.isPanning = false;
        this.canvas.style.cursor = this.toolManager.currentTool ? 'crosshair' : 'default';
    }
    
    // Utility functions
    screenToWorld(x, y) {
        return {
            x: (x - this.gameState.panX) / this.gameState.zoom,
            y: (y - this.gameState.panY) / this.gameState.zoom
        };
    }
    
    worldToScreen(x, y) {
        return {
            x: x * this.gameState.zoom + this.gameState.panX,
            y: y * this.gameState.zoom + this.gameState.panY
        };
    }
    
    getWorldCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        return this.screenToWorld(screenX, screenY);
    }
    
    findNearestEdge(x, y) {
        let nearestEdge = null;
        let minDistance = Infinity;
        
        this.gameState.shapes.forEach(shape => {
            shape.getEdges().forEach(edge => {
                const dist = this.distanceToEdge(x, y, edge);
                if (dist < minDistance && dist < 20) {
                    minDistance = dist;
                    nearestEdge = edge;
                }
            });
        });
        
        return nearestEdge;
    }
    
    distanceToEdge(px, py, edge) {
        const {start, end} = edge;
        const A = px - start.x, B = py - start.y;
        const C = end.x - start.x, D = end.y - start.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
        
        const xx = start.x + param * C;
        const yy = start.y + param * D;
        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
    }
    
    anythingExistsOnEdge(edge) {
        return EdgeUtils.existsOn(edge, this.gameState.getAllEdgeItems());
    }
    
    // Drawing
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.gameState.panX, this.gameState.panY);
        this.ctx.scale(this.gameState.zoom, this.gameState.zoom);
        
        // Draw all items
        this.gameState.shapes.forEach(shape => shape.draw(this.ctx, false, this.gameState.zoom));
        this.gameState.turrets.forEach(turret => turret.draw(this.ctx, false, this.gameState.zoom));
        this.gameState.walls.forEach(wall => wall.draw(this.ctx, false, this.gameState.zoom));
        this.gameState.walls2.forEach(wall => wall.draw(this.ctx, false, this.gameState.zoom));
        
        // Draw ghosts
        const ghostShape = this.toolManager.getGhost('shape');
        const ghostWall = this.toolManager.getGhost('wall');
        const ghostWall2 = this.toolManager.getGhost('wall2');
        
        if (ghostShape && this.toolManager.isShapeTool()) {
            ghostShape.draw(this.ctx, true, this.gameState.zoom);
        }
        
        if (ghostWall && this.toolManager.currentTool === 'wall') {
            ghostWall.draw(this.ctx, true, this.gameState.zoom);
        }
        
        if (ghostWall2 && this.toolManager.currentTool === 'wall2') {
            ghostWall2.draw(this.ctx, true, this.gameState.zoom);
        }
        
        this.ctx.restore();
        
        // Update zoom display
        window.zoom = this.gameState.zoom;
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.gameState.zoom * 100) + '%';
        }
    }
    
    startGameLoop() {
        // Initial draw
        this.draw();
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ShapeMapEditor();
    window.app.init();
});