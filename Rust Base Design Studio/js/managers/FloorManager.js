/**
 * FloorManager - Manages multi-floor canvas system for the tactical map editor
 * Handles floor data, canvas states, rendering, and user interactions across 5 floors
 */
class FloorManager {
    constructor() {
        this.currentFloors = 5;
        this.currentActiveFloor = 1;
        this.selectedFloor = 1;
        this.floorData = {};
        this.floorCanvasStates = {
            floor2Canvas: { zoom: 0.8, panX: 0, panY: 0, initialized: false },
            floor3Canvas: { zoom: 0.8, panX: 0, panY: 0, initialized: false },
            floor4Canvas: { zoom: 0.8, panX: 0, panY: 0, initialized: false },
            floor5Canvas: { zoom: 0.8, panX: 0, panY: 0, initialized: false }
        };
        
        // Initialize floor data for 5 floors
        for (let i = 1; i <= 5; i++) {
            this.floorData[i] = this.createEmptyFloorData();
        }
    }

    /**
     * Create empty floor data structure
     */
    createEmptyFloorData() {
        return {
            shapes: [],
            turrets: [],
            walls: [],
            windows: [],
            reinforcedWalls: [],
            garageDoors: [],
            securityGates: []
        };
    }

    /**
     * Initialize the floor system with event handlers
     */
    initializeFloorSystem(elements, callbacks = {}) {
        if (elements.floorSelect) {
            elements.floorSelect.addEventListener("change", (e) => {
                const floors = parseInt(e.target.value);
                this.currentFloors = floors;
                this.updateFloorDisplay(floors, callbacks);
            });
        } else {
            console.error("Floor select element not found");
        }
    }

    /**
     * Update floor display based on number of floors selected
     */
    updateFloorDisplay(floors) {
        const additionalFloorsContainer = document.getElementById('additionalFloors');
        
        if (!additionalFloorsContainer) {
            console.error("Additional floors container not found");
            return;
        }
        
        if (floors === 1) {
            additionalFloorsContainer.style.display = 'none';
            const floors45Container = document.getElementById('floors45Container');
            if (floors45Container) {
                floors45Container.style.display = 'none';
            }
        } else if (floors === 3) {
            additionalFloorsContainer.style.display = 'flex';
            const floors45Container = document.getElementById('floors45Container');
            if (floors45Container) {
                floors45Container.style.display = 'none';
            }
            // Initialize floor 2 and 3 canvases
            setTimeout(() => {
                this.initializeFloorCanvas('floor2Canvas', 2);
                this.initializeFloorCanvas('floor3Canvas', 3);
            }, 100);
        } else if (floors === 5) {
            additionalFloorsContainer.style.display = 'flex';
            const floors45Container = document.getElementById('floors45Container');
            if (floors45Container) {
                floors45Container.style.display = 'flex';
            }
            // Initialize all canvases for 5 floors
            setTimeout(() => {
                this.initializeFloorCanvas('floor2Canvas', 2);
                this.initializeFloorCanvas('floor3Canvas', 3);
                this.initializeFloorCanvas('floor4Canvas', 4);
                this.initializeFloorCanvas('floor5Canvas', 5);
            }, 100);
        }
        
        this.currentFloors = floors;
    }

    /**
     * Initialize individual floor canvas with all event handlers
     */
    // Simplified initialization - just mark as ready for manual setup in index.html
    initializeFloorCanvas(canvasId, floorNumber) {
        const state = this.floorCanvasStates[canvasId];
        state.initialized = true;
        this.redrawFloorCanvasContent(canvasId, floorNumber);
    }

    /**
     * Handle mouse move events on floor canvases
     */
    handleFloorCanvasMouseMove(e, canvas, canvasId, floorNumber) {
        // Force crosshair cursor when tool is selected
        if (window.currentTool) {
            canvas.style.setProperty('cursor', 'crosshair', 'important');
        } else {
            canvas.style.cursor = 'grab';
        }
        
        if (canvas.floorState.isPanningFloor) {
            // Handle panning (exact same logic as main canvas)
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            
            const state = this.floorCanvasStates[canvasId];
            state.panX += screenX - canvas.floorState.lastFloorMouseX;
            state.panY += screenY - canvas.floorState.lastFloorMouseY;
            canvas.floorState.lastFloorMouseX = screenX;
            canvas.floorState.lastFloorMouseY = screenY;
            
            this.redrawFloorCanvasContent(canvasId, floorNumber);
            return;
        } else if (window.currentTool) {
            // Handle ghost preview
            this.updateFloorGhostPreview(e, canvas, canvasId, floorNumber);
        }
    }

    /**
     * Update ghost preview for floor canvas
     */
    updateFloorGhostPreview(e, canvas, canvasId, floorNumber) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Store raw canvas coordinates for click handler consistency
        canvas.lastCanvasX = canvasX;
        canvas.lastCanvasY = canvasY;
        
        const state = this.floorCanvasStates[canvasId];
        const worldX = (canvasX - state.panX) / state.zoom;
        const worldY = (canvasY - state.panY) / state.zoom;
        
        canvas.floorState.floorMousePos = { x: worldX, y: worldY };
        
        // Clear existing ghost
        this.clearFloorGhosts(canvas);
        
        const floor = this.floorData[floorNumber];
        
        // Create ghost preview based on current tool
        this.createGhostPreview(canvas, floor, worldX, worldY);
        
        // Store ghost data on canvas for rendering
        canvas.floorGhosts = {
            floorGhostShape: canvas.floorState.floorGhostShape,
            floorGhostWall: canvas.floorState.floorGhostWall,
            floorGhostWindow: canvas.floorState.floorGhostWindow,
            floorGhostReinforcedWall: canvas.floorState.floorGhostReinforcedWall,
            floorGhostGarageDoor: canvas.floorState.floorGhostGarageDoor,
            floorGhostSecurityGate: canvas.floorState.floorGhostSecurityGate,
            floorGhostTurret: canvas.floorState.floorGhostTurret
        };
        
        // Redraw with ghost preview (debounced for performance)
        if (!canvas.redrawTimeout) {
            canvas.redrawTimeout = setTimeout(() => {
                this.redrawFloorCanvasContent(canvasId, floorNumber);
                canvas.redrawTimeout = null;
            }, 16); // ~60fps limit
        }
    }

    /**
     * Clear floor ghost previews
     */
    clearFloorGhosts(canvas) {
        canvas.floorState.floorGhostShape = null;
        canvas.floorState.floorGhostWall = null;
        canvas.floorState.floorGhostWindow = null;
        canvas.floorState.floorGhostReinforcedWall = null;
        canvas.floorState.floorGhostGarageDoor = null;
        canvas.floorState.floorGhostSecurityGate = null;
        canvas.floorState.floorGhostTurret = null;
        canvas.floorState.floorSnapEdge = null;
    }

    /**
     * Create ghost preview based on current tool
     */
    createGhostPreview(canvas, floor, worldX, worldY) {
        if (window.currentTool === 'square') {
            let ghostPos = { x: worldX, y: worldY };
            const tempSquare = new Square(worldX, worldY);
            
            const snapResult = this.findSnapPositionOnFloor(tempSquare, floor.shapes);
            if (snapResult) {
                ghostPos = snapResult.position;
                tempSquare.rotation = snapResult.rotation;
            }
            
            canvas.floorState.floorGhostShape = new Square(ghostPos.x, ghostPos.y);
            if (snapResult) canvas.floorState.floorGhostShape.rotation = tempSquare.rotation;
            
        } else if (window.currentTool === 'triangle') {
            let ghostPos = { x: worldX, y: worldY };
            const tempTriangle = new Triangle(worldX, worldY);
            
            const snapResult = this.findSnapPositionOnFloor(tempTriangle, floor.shapes);
            if (snapResult) {
                ghostPos = snapResult.position;
                tempTriangle.rotation = snapResult.rotation;
            }
            
            canvas.floorState.floorGhostShape = new Triangle(ghostPos.x, ghostPos.y);
            if (snapResult) canvas.floorState.floorGhostShape.rotation = tempTriangle.rotation;
            
        } else if (window.currentTool === 'square2') {
            canvas.floorState.floorGhostShape = new Square2(worldX, worldY);
            canvas.floorState.floorGhostShape.rotation = window.previewRotation || 0;
            
        } else if (window.currentTool === 'wall') {
            canvas.floorState.floorSnapEdge = this.findNearestEdgeInShapes(worldX, worldY, floor.shapes);
            if (canvas.floorState.floorSnapEdge) {
                canvas.floorState.floorGhostWall = new Wall(canvas.floorState.floorSnapEdge);
            }
            
        } else if (window.currentTool === 'window') {
            canvas.floorState.floorSnapEdge = this.findNearestEdgeInShapes(worldX, worldY, floor.shapes);
            if (canvas.floorState.floorSnapEdge) {
                canvas.floorState.floorGhostWindow = new WindowTool(canvas.floorState.floorSnapEdge);
            }
            
        } else if (window.currentTool === 'reinforcedWall') {
            canvas.floorState.floorSnapEdge = this.findNearestEdgeInShapes(worldX, worldY, floor.shapes);
            if (canvas.floorState.floorSnapEdge) {
                canvas.floorState.floorGhostReinforcedWall = new ReinforcedWall(canvas.floorState.floorSnapEdge);
            }
            
        } else if (window.currentTool === 'door') {
            canvas.floorState.floorSnapEdge = this.findNearestEdgeInShapes(worldX, worldY, floor.shapes);
            if (canvas.floorState.floorSnapEdge) {
                canvas.floorState.floorGhostGarageDoor = new GarageDoor(canvas.floorState.floorSnapEdge, false);
            }
            
        } else if (window.currentTool === 'securityGate') {
            canvas.floorState.floorSnapEdge = this.findNearestEdgeInShapes(worldX, worldY, floor.shapes);
            if (canvas.floorState.floorSnapEdge) {
                canvas.floorState.floorGhostSecurityGate = new SecurityGate(canvas.floorState.floorSnapEdge);
            }
            
        } else if (window.currentTool === 'turret') {
            canvas.floorState.floorGhostTurret = new Turret(worldX, worldY);
        }
    }

    /**
     * Handle click events on floor canvases
     */
    handleFloorCanvasClick(e, canvas, canvasId, floorNumber) {
        if (window.currentTool) {
            // Use the exact same coordinate calculation as ghost preview
            let canvasX, canvasY;
            
            if (canvas.lastCanvasX !== undefined && canvas.lastCanvasY !== undefined) {
                canvasX = canvas.lastCanvasX;
                canvasY = canvas.lastCanvasY;
            } else {
                const rect = canvas.getBoundingClientRect();
                canvasX = e.clientX - rect.left;
                canvasY = e.clientY - rect.top;
            }
            
            // Convert canvas coordinates to world coordinates for this floor
            const state = this.floorCanvasStates[canvasId];
            const worldX = (canvasX - state.panX) / state.zoom;
            const worldY = (canvasY - state.panY) / state.zoom;
            
            // Use ghost position if available (includes snapping)
            let actualX = worldX;
            let actualY = worldY;
            let rotation = 0;
            
            if (canvas.floorState && canvas.floorState.floorGhostShape) {
                actualX = canvas.floorState.floorGhostShape.x;
                actualY = canvas.floorState.floorGhostShape.y;
                rotation = canvas.floorState.floorGhostShape.rotation || 0;
            }
            
            // Handle different item types
            if (canvas.floorState && canvas.floorState.floorGhostWall && canvas.floorState.floorSnapEdge) {
                this.placeEdgeItemDirectlyOnFloor(canvas.floorState.floorSnapEdge, floorNumber, 'wall');
            } else if (canvas.floorState && canvas.floorState.floorGhostWindow && canvas.floorState.floorSnapEdge) {
                this.placeEdgeItemDirectlyOnFloor(canvas.floorState.floorSnapEdge, floorNumber, 'window');
            } else if (canvas.floorState && canvas.floorState.floorGhostReinforcedWall && canvas.floorState.floorSnapEdge) {
                this.placeEdgeItemDirectlyOnFloor(canvas.floorState.floorSnapEdge, floorNumber, 'reinforcedWall');
            } else if (canvas.floorState && canvas.floorState.floorGhostGarageDoor && canvas.floorState.floorSnapEdge) {
                this.placeEdgeItemDirectlyOnFloor(canvas.floorState.floorSnapEdge, floorNumber, 'door');
            } else if (canvas.floorState && canvas.floorState.floorGhostSecurityGate && canvas.floorState.floorSnapEdge) {
                this.placeEdgeItemDirectlyOnFloor(canvas.floorState.floorSnapEdge, floorNumber, 'securityGate');
            } else if (canvas.floorState && canvas.floorState.floorGhostTurret) {
                this.placeTurretDirectlyOnFloor(actualX, actualY, floorNumber);
            } else {
                // Place shape with snapping
                this.placeShapeDirectlyOnFloor(actualX, actualY, floorNumber, rotation);
            }
        }
    }

    /**
     * Handle zoom events on floor canvases
     */
    handleFloorCanvasZoom(e, canvas, canvasId, floorNumber) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const state = this.floorCanvasStates[canvasId];
        const worldX = (mouseX - state.panX) / state.zoom;
        const worldY = (mouseY - state.panY) / state.zoom;
        
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        state.zoom = Math.max(0.2, Math.min(5, state.zoom * zoomDelta));
        
        state.panX = mouseX - worldX * state.zoom;
        state.panY = mouseY - worldY * state.zoom;
        
        this.redrawFloorCanvasContent(canvasId, floorNumber);
    }

    /**
     * Handle drop events on floor canvases
     */
    handleFloorCanvasDrop(e, canvas, canvasId, floorNumber) {
        e.preventDefault();
        
        if (window.draggedIcon === 'turret') {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            const state = this.floorCanvasStates[canvasId];
            const worldX = (canvasX - state.panX) / state.zoom;
            const worldY = (canvasY - state.panY) / state.zoom;
            
            this.placeTurretDirectlyOnFloor(worldX, worldY, floorNumber);
        }
        
        window.draggedIcon = null;
    }

    /**
     * Redraw floor canvas content
     */
    redrawFloorCanvasContent(canvasId, floorNumber) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const state = this.floorCanvasStates[canvasId];
        const floor = this.floorData[floorNumber];
        
        if (!floor) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformations
        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);
        
        // Draw grid (optional)
        this.drawFloorGrid(ctx, canvas, state.zoom);
        
        // Draw shapes
        floor.shapes.forEach(shape => {
            if (shape.draw) {
                shape.draw(ctx, false, state.zoom);
            }
        });
        
        // Draw walls and edge items
        floor.walls.forEach(wall => {
            if (wall.draw) wall.draw(ctx, false, state.zoom);
        });
        floor.windows.forEach(window => {
            if (window.draw) window.draw(ctx, false, state.zoom);
        });
        if (floor.reinforcedWalls) {
            floor.reinforcedWalls.forEach(wall => {
                if (wall.draw) wall.draw(ctx, false, state.zoom);
            });
        }
        if (floor.garageDoors) {
            floor.garageDoors.forEach(door => {
                if (door.draw) door.draw(ctx, false, state.zoom);
            });
        }
        if (floor.securityGates) {
            floor.securityGates.forEach(gate => {
                if (gate.draw) gate.draw(ctx, false, state.zoom);
            });
        }
        
        // Draw turrets with numbers
        floor.turrets.forEach(turret => {
            if (turret.draw) {
                turret.draw(ctx, state.zoom);
                
                // Draw turret number
                if (turret.number) {
                    ctx.save();
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3 / state.zoom;
                    ctx.font = `bold ${20 / state.zoom}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    const numberText = turret.number.toString();
                    const textX = turret.x;
                    const textY = turret.y - 18 / state.zoom;
                    
                    ctx.strokeText(numberText, textX, textY);
                    ctx.fillText(numberText, textX, textY);
                    ctx.restore();
                }
            }
        });
        
        // Draw FOV for powered turrets in tactical mode
        if (window.tacticalModeActive) {
            floor.turrets.forEach(turret => {
                if (window.isTurretPowered && window.isTurretPowered(turret.number)) {
                    this.drawLineOfSightForFloor(ctx, turret, state.zoom, floor);
                }
            });
        }
        
        // Draw ghost previews
        this.drawFloorGhosts(ctx, canvasId, state.zoom);
        
        ctx.restore();
    }

    /**
     * Draw grid for floor canvas
     */
    drawFloorGrid(ctx, canvas, zoom) {
        const gridSize = 40; // Grid size in pixels
        const canvasWidth = canvas.width / zoom;
        const canvasHeight = canvas.height / zoom;
        
        ctx.strokeStyle = window.tacticalModeActive ? '#444' : '#e0e0e0';
        ctx.lineWidth = 1 / zoom;
        
        ctx.beginPath();
        
        // Vertical lines
        for (let x = 0; x <= canvasWidth; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
        }
        
        // Horizontal lines
        for (let y = 0; y <= canvasHeight; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
        }
        
        ctx.stroke();
    }

    /**
     * Draw ghost previews for floor canvases
     */
    drawFloorGhosts(ctx, canvasId, scale) {
        const canvas = document.getElementById(canvasId);
        if (!canvas.floorGhosts) return;
        
        const state = this.floorCanvasStates[canvasId];
        const ghosts = canvas.floorGhosts;
        
        if (ghosts.floorGhostShape && ghosts.floorGhostShape.draw) {
            ghosts.floorGhostShape.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostWall && ghosts.floorGhostWall.draw) {
            ghosts.floorGhostWall.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostWindow && ghosts.floorGhostWindow.draw) {
            ghosts.floorGhostWindow.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostReinforcedWall && ghosts.floorGhostReinforcedWall.draw) {
            ghosts.floorGhostReinforcedWall.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostGarageDoor && ghosts.floorGhostGarageDoor.draw) {
            ghosts.floorGhostGarageDoor.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostSecurityGate && ghosts.floorGhostSecurityGate.draw) {
            ghosts.floorGhostSecurityGate.draw(ctx, true, state.zoom);
        }
        
        if (ghosts.floorGhostTurret && ghosts.floorGhostTurret.draw) {
            ghosts.floorGhostTurret.draw(ctx, state.zoom);
        }
    }

    /**
     * Place shape directly on specified floor
     */
    placeShapeDirectlyOnFloor(x, y, floorNumber, rotation = 0) {
        if (!window.currentTool) return;
        
        const floor = this.floorData[floorNumber];
        let newShape;
        
        if (window.currentTool === 'square') {
            newShape = new Square(x, y);
        } else if (window.currentTool === 'triangle') {
            newShape = new Triangle(x, y);
        } else if (window.currentTool === 'square2') {
            newShape = new Square2(x, y);
        }
        
        if (newShape) {
            newShape.rotation = rotation;
            newShape.transparent = true; // Always transparent
            floor.shapes.push(newShape);
            
            // Redraw all floor canvases
            this.redrawAllFloorCanvases();
        }
    }

    /**
     * Place edge item directly on specified floor
     */
    placeEdgeItemDirectlyOnFloor(edge, floorNumber, itemType) {
        const floor = this.floorData[floorNumber];
        
        if (itemType === 'wall') {
            const wall = new Wall(edge);
            floor.walls.push(wall);
        } else if (itemType === 'window') {
            const window = new WindowTool(edge);
            floor.windows.push(window);
        } else if (itemType === 'reinforcedWall') {
            if (!floor.reinforcedWalls) floor.reinforcedWalls = [];
            const reinforcedWall = new ReinforcedWall(edge);
            floor.reinforcedWalls.push(reinforcedWall);
        } else if (itemType === 'door') {
            if (!floor.garageDoors) floor.garageDoors = [];
            const garageDoor = new GarageDoor(edge, false);
            floor.garageDoors.push(garageDoor);
        } else if (itemType === 'securityGate') {
            if (!floor.securityGates) floor.securityGates = [];
            const securityGate = new SecurityGate(edge);
            floor.securityGates.push(securityGate);
        }
        
        // Redraw all floor canvases that are currently visible
        this.redrawAllFloorCanvases();
    }

    /**
     * Place turret directly on specified floor
     */
    placeTurretDirectlyOnFloor(x, y, floorNumber) {
        const gameState = { showLineOfSight: window.showLineOfSight, lineOfSightTurret: window.lineOfSightTurret };
        const callbacks = {
            deselectAll: window.deselectAll,
            updateSelectedInfo: window.updateSelectedInfo,
            redrawAllFloorCanvases: () => this.redrawAllFloorCanvases(),
            draw: window.draw
        };
        
        const newTurret = window.turretManager.placeTurretOnFloor(x, y, floorNumber, this.floorData, gameState, callbacks);
        
        if (newTurret) {
            window.selectedTurret = newTurret;
            window.showLineOfSight = gameState.showLineOfSight;
            window.lineOfSightTurret = gameState.lineOfSightTurret;
        }
    }

    /**
     * Redraw all floor canvases
     */
    redrawAllFloorCanvases() {
        if (document.getElementById('floor2Canvas')) {
            this.redrawFloorCanvasContent('floor2Canvas', 2);
        }
        if (document.getElementById('floor3Canvas')) {
            this.redrawFloorCanvasContent('floor3Canvas', 3);
        }
        if (document.getElementById('floor4Canvas')) {
            this.redrawFloorCanvasContent('floor4Canvas', 4);
        }
        if (document.getElementById('floor5Canvas')) {
            this.redrawFloorCanvasContent('floor5Canvas', 5);
        }
    }

    /**
     * Update all floor canvas cursors
     */
    updateAllFloorCanvasCursors() {
        const cursor = window.currentTool ? 'crosshair' : 'grab';
        
        const floorCanvases = ['floor2Canvas', 'floor3Canvas', 'floor4Canvas', 'floor5Canvas'];
        floorCanvases.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                canvas.style.cursor = cursor;
            }
        });
    }

    /**
     * Clear all floor data
     */
    clearAllFloors() {
        Object.keys(this.floorData).forEach(floorKey => {
            if (floorKey !== '1') {
                this.floorData[floorKey] = this.createEmptyFloorData();
            }
        });
        this.redrawAllFloorCanvases();
    }

    // Floor-specific utility functions
    findSnapPositionOnFloor(shape, floorShapes) {
        return window.findSnapPosition ? window.findSnapPosition(shape, floorShapes) : null;
    }

    findNearestEdgeOnFloor(mousePos, floorShapes) {
        return window.findNearestEdge ? window.findNearestEdge(mousePos, floorShapes) : null;
    }

    findNearestEdgeInShapes(x, y, shapesArray) {
        let nearestEdge = null;
        let minDistance = Infinity;
        
        for (const shape of shapesArray) {
            if (shape.getEdges) {
                const edges = shape.getEdges();
                for (const edge of edges) {
                    const distance = this.pointToLineDistance(x, y, edge.start.x, edge.start.y, edge.end.x, edge.end.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestEdge = edge;
                    }
                }
            }
        }
        
        return minDistance <= 20 ? nearestEdge : null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Draw line of sight for turrets on specific floors
     */
    drawLineOfSightForFloor(ctx, turret, currentZoom, floor) {
        if (!turret || !floor) return;
        
        const turretPos = { x: turret.x, y: turret.y };
        const viewRadius = 30 * (window.PIXELS_PER_METER || 40); // 30 meter range
        const numRays = 180; // Rays for FOV calculation
        
        // Calculate turret facing direction
        const facingAngle = turret.rotation - Math.PI / 2;
        const fovAngle = Math.PI; // 180 degree FOV cone
        const startAngle = facingAngle - fovAngle / 2;
        const endAngle = facingAngle + fovAngle / 2;
        
        // Get all blocking edges from shapes and walls on this floor
        const blockingEdges = [];
        
        // Add shape edges (only non-transparent)
        floor.shapes.forEach(shape => {
            if (!shape.transparent && shape.getEdges) {
                const edges = shape.getEdges();
                edges.forEach(edge => blockingEdges.push(edge));
            }
        });
        
        // Add wall edges
        floor.walls.forEach(wall => {
            if (!wall.transparent && wall.edge) {
                blockingEdges.push(wall.edge);
            }
        });
        
        // Add window edges (they block vision)
        floor.windows.forEach(window => {
            if (!window.transparent && window.edge) {
                blockingEdges.push(window.edge);
            }
        });
        
        // Cast rays and find visibility boundary
        const visibilityPoints = [];
        
        for (let i = 0; i <= numRays; i++) {
            const rayAngle = startAngle + (endAngle - startAngle) * (i / numRays);
            const rayEnd = {
                x: turretPos.x + Math.cos(rayAngle) * viewRadius,
                y: turretPos.y + Math.sin(rayAngle) * viewRadius
            };
            
            let closestDistance = viewRadius;
            let closestPoint = rayEnd;
            
            // Check intersections with all blocking edges
            for (const edge of blockingEdges) {
                const intersection = window.lineIntersection ? 
                    window.lineIntersection(turretPos, rayEnd, edge.start, edge.end) : null;
                
                if (intersection) {
                    const distance = Math.sqrt(
                        Math.pow(intersection.x - turretPos.x, 2) + 
                        Math.pow(intersection.y - turretPos.y, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPoint = intersection;
                    }
                }
            }
            
            visibilityPoints.push(closestPoint);
        }
        
        // Draw the FOV cone with red color
        if (visibilityPoints.length > 0) {
            ctx.save();
            
            // Create gradient for realistic FOV appearance
            const gradient = ctx.createRadialGradient(
                turretPos.x, turretPos.y, 0,
                turretPos.x, turretPos.y, viewRadius
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)'); // Bright red at center
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0.1)'); // Fading red at edges
            
            ctx.fillStyle = gradient;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Red outline
            ctx.lineWidth = 2 / currentZoom;
            
            // Draw FOV polygon
            ctx.beginPath();
            ctx.moveTo(turretPos.x, turretPos.y);
            visibilityPoints.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// Export for use in main application
window.FloorManager = FloorManager;