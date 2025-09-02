// Field of View calculation utilities

const FOVUtils = {
    // Constants
    PIXELS_PER_METER: 40,
    NUM_RAYS: 90,
    VIEW_RADIUS_METERS: 30,
    
    get VIEW_RADIUS() {
        return this.VIEW_RADIUS_METERS * this.PIXELS_PER_METER;
    },
    
    // Normalize angle to [-π, π] range
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },
    
    // Collect all vertices that could block line of sight
    collectBlockingVertices(gameState) {
        const vertices = [];
        
        if (!gameState) return vertices;
        
        // Regular blocking shapes and walls
        const basicBlockingSources = [
            ...gameState.shapes.filter(s => !s.transparent).flatMap(s => s.getEdges ? s.getEdges() : []),
            ...gameState.walls.map(w => w.edge),
            ...(gameState.windows || []).map(w => w.edge),
            ...(gameState.garageDoors || []).filter(d => !d.isOpen).map(d => d.edge)
        ];
        
        basicBlockingSources.forEach(edge => {
            if (edge && edge.start && edge.end) {
                vertices.push(edge.start, edge.end);
            }
        });
        
        // Special handling for reinforced walls (door frames)
        if (gameState.reinforcedWalls) {
            gameState.reinforcedWalls.forEach(wall => {
                if (!wall.isOpen) {
                    // If closed, the entire edge blocks
                    vertices.push(wall.edge.start, wall.edge.end);
                } else if (wall.getGapBounds) {
                    // If open, only the segments block
                    const gap = wall.getGapBounds();
                    vertices.push(wall.edge.start, gap.start);
                    vertices.push(gap.end, wall.edge.end);
                }
            });
        }
        
        return vertices;
    },
    
    // Cast a ray and find the first intersection
    castRay(origin, angle, gameState) {
        const direction = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        
        let closestDistance = this.VIEW_RADIUS * 2;
        let hitPoint = {
            x: origin.x + direction.x * this.VIEW_RADIUS,
            y: origin.y + direction.y * this.VIEW_RADIUS
        };
        
        // Check intersections with blocking edges
        const blockingEdges = this.getBlockingEdges(gameState);
        
        blockingEdges.forEach(edge => {
            const intersection = this.lineIntersection(
                origin.x, origin.y,
                origin.x + direction.x * this.VIEW_RADIUS,
                origin.y + direction.y * this.VIEW_RADIUS,
                edge.start.x, edge.start.y,
                edge.end.x, edge.end.y
            );
            
            if (intersection) {
                const distance = Math.sqrt(
                    (intersection.x - origin.x) ** 2 + 
                    (intersection.y - origin.y) ** 2
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    hitPoint = intersection;
                }
            }
        });
        
        return hitPoint;
    },
    
    // Get all blocking edges from game state
    getBlockingEdges(gameState) {
        const edges = [];
        
        if (!gameState) return edges;
        
        // Add shape edges (only non-transparent ones)
        gameState.shapes.filter(s => !s.transparent).forEach(shape => {
            if (shape.getEdges) {
                edges.push(...shape.getEdges());
            }
        });
        
        // Add wall edges
        gameState.walls.forEach(wall => edges.push(wall.edge));
        
        // Add window edges (windows block sight)
        if (gameState.windows) {
            gameState.windows.forEach(window => edges.push(window.edge));
        }
        
        // Add closed garage door edges
        if (gameState.garageDoors) {
            gameState.garageDoors.filter(door => !door.isOpen).forEach(door => {
                edges.push(door.edge);
            });
        }
        
        // Add reinforced wall edges (door frames)
        if (gameState.reinforcedWalls) {
            gameState.reinforcedWalls.forEach(wall => {
                if (!wall.isOpen) {
                    edges.push(wall.edge);
                } else if (wall.getGapBounds) {
                    const gap = wall.getGapBounds();
                    edges.push(
                        { start: wall.edge.start, end: gap.start },
                        { start: gap.end, end: wall.edge.end }
                    );
                }
            });
        }
        
        return edges;
    },
    
    // Calculate line intersection
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    },
    
    // Calculate field of view for a turret
    calculateFOV(turret, gameState) {
        if (!turret || !gameState) return [];
        
        const turretPos = { x: turret.x, y: turret.y };
        const visibilityPoints = [];
        const vertices = this.collectBlockingVertices(gameState);
        
        const baseAngle = turret.rotation - Math.PI / 2;
        const startAngle = baseAngle - Math.PI / 2;
        const endAngle = baseAngle + Math.PI / 2;
        const angles = [];
        
        // Add vertex angles
        vertices.forEach(vertex => {
            const angle = Math.atan2(vertex.y - turretPos.y, vertex.x - turretPos.x);
            
            let diff = angle - baseAngle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            
            if (Math.abs(diff) <= Math.PI / 2 + 0.01) {
                angles.push(angle - 0.00001);
                angles.push(angle);
                angles.push(angle + 0.00001);
            }
        });
        
        // Add regular ray angles
        for (let i = 0; i <= this.NUM_RAYS; i++) {
            const angle = startAngle + (i / this.NUM_RAYS) * Math.PI;
            angles.push(angle);
        }
        
        // Sort angles
        angles.sort((a, b) => {
            let aDiff = a - startAngle;
            let bDiff = b - startAngle;
            while (aDiff < 0) aDiff += 2 * Math.PI;
            while (bDiff < 0) bDiff += 2 * Math.PI;
            return aDiff - bDiff;
        });
        
        // Cast rays and collect visibility points
        angles.forEach(angle => {
            const hitPoint = this.castRay(turretPos, angle, gameState);
            const dist = Math.sqrt((hitPoint.x - turretPos.x) ** 2 + (hitPoint.y - turretPos.y) ** 2);
            
            if (dist > this.VIEW_RADIUS) {
                visibilityPoints.push({
                    x: turretPos.x + Math.cos(angle) * this.VIEW_RADIUS,
                    y: turretPos.y + Math.sin(angle) * this.VIEW_RADIUS
                });
            } else {
                visibilityPoints.push(hitPoint);
            }
        });
        
        return visibilityPoints;
    },
    
    // Draw field of view cone
    drawFOV(ctx, turret, gameState, isAllMode = false) {
        if (!turret || !gameState) return;
        
        const turretPos = { x: turret.x, y: turret.y };
        const visibilityPoints = this.calculateFOV(turret, gameState);
        
        ctx.save();
        
        const opacityMultiplier = isAllMode ? 0.5 : 1;
        
        const gradient = ctx.createRadialGradient(
            turretPos.x, turretPos.y, 0, 
            turretPos.x, turretPos.y, this.VIEW_RADIUS
        );
        
        // Enhanced visibility for main canvas turrets
        const isMainCanvas = !turret.floorNumber || turret.floorNumber === 1;
        const baseOpacity = isMainCanvas ? 0.4 : 0.25;
        
        gradient.addColorStop(0, `rgba(255, 0, 0, ${baseOpacity * opacityMultiplier})`);
        gradient.addColorStop(0.7, `rgba(255, 0, 0, ${(baseOpacity * 0.7) * opacityMultiplier})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${(baseOpacity * 0.3) * opacityMultiplier})`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(turretPos.x, turretPos.y);
        for (let i = 0; i < visibilityPoints.length; i++) {
            ctx.lineTo(visibilityPoints[i].x, visibilityPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Debug log for development
        if (typeof console !== 'undefined' && console.log) {
            console.log(`FOV cone drawn with ${visibilityPoints.length} visibility points`);
        }
    }
};

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FOVUtils;
} else if (typeof window !== 'undefined') {
    window.FOVUtils = FOVUtils;
}