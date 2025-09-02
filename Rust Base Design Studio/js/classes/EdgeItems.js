// Edge-based items module

class EdgeItem {
    constructor(edge) {
        this.edge = {
            start: { x: edge.start.x, y: edge.start.y },
            end: { x: edge.end.x, y: edge.end.y }
        };
        this.selected = false;
    }
    
    contains(x, y) {
        const dist = this.distanceToPoint(x, y);
        return dist <= this.hitRadius / (window.zoom || 1);
    }
    
    distanceToPoint(px, py) {
        const {start, end} = this.edge;
        const A = px - start.x, B = py - start.y;
        const C = end.x - start.x, D = end.y - start.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
        
        const xx = start.x + param * C;
        const yy = start.y + param * D;
        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
    }
    
    getCenter() {
        return {
            x: (this.edge.start.x + this.edge.end.x) / 2,
            y: (this.edge.start.y + this.edge.end.y) / 2
        };
    }
}

class Wall extends EdgeItem {
    constructor(edge) {
        super(edge);
        this.hitRadius = 10;
    }
    
    draw(ctx, isGhost = false, currentZoom = 1) {
        ctx.save();
        
        ctx.strokeStyle = isGhost ? '#8B4513' : (this.selected ? '#CD853F' : '#8B4513');
        ctx.lineWidth = 8 / currentZoom;
        ctx.lineCap = 'round';
        
        if (isGhost) {
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5 / currentZoom, 5 / currentZoom]);
        }
        
        ctx.beginPath();
        ctx.moveTo(this.edge.start.x, this.edge.start.y);
        ctx.lineTo(this.edge.end.x, this.edge.end.y);
        ctx.stroke();
        
        if (!isGhost) {
            ctx.strokeStyle = this.selected ? '#A0522D' : '#654321';
            ctx.lineWidth = 5 / currentZoom;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.edge.start.x, this.edge.start.y);
            ctx.lineTo(this.edge.end.x, this.edge.end.y);
            ctx.stroke();
            
            ctx.fillStyle = '#8B4513';
            ctx.globalAlpha = 0.2;
            const numSpots = 3;
            for (let i = 1; i <= numSpots; i++) {
                const t = i / (numSpots + 1);
                const spotX = this.edge.start.x + t * (this.edge.end.x - this.edge.start.x);
                const spotY = this.edge.start.y + t * (this.edge.end.y - this.edge.start.y);
                ctx.beginPath();
                ctx.arc(spotX, spotY, 3 / currentZoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

class Wall2 extends EdgeItem {
    constructor(edge) {
        super(edge);
        this.hitRadius = 10;
    }
    
    draw(ctx, isGhost = false, currentZoom = 1) {
        ctx.save();
        
        ctx.strokeStyle = isGhost ? "#8B4513" : (this.selected ? "#CD853F" : "#8B4513");
        ctx.lineWidth = 8 / currentZoom;
        ctx.lineCap = "round";
        
        if (isGhost) {
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5 / currentZoom, 5 / currentZoom]);
        }
        
        ctx.beginPath();
        ctx.moveTo(this.edge.start.x, this.edge.start.y);
        ctx.lineTo(this.edge.end.x, this.edge.end.y);
        ctx.stroke();
        
        if (!isGhost) {
            ctx.strokeStyle = this.selected ? "#A0522D" : "#654321";
            ctx.lineWidth = 5 / currentZoom;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.edge.start.x, this.edge.start.y);
            ctx.lineTo(this.edge.end.x, this.edge.end.y);
            ctx.stroke();
            
            ctx.fillStyle = "#8B4513";
            ctx.globalAlpha = 0.2;
            const numSpots = 3;
            for (let i = 1; i <= numSpots; i++) {
                const t = i / (numSpots + 1);
                const spotX = this.edge.start.x + t * (this.edge.end.x - this.edge.start.x);
                const spotY = this.edge.start.y + t * (this.edge.end.y - this.edge.start.y);
                ctx.beginPath();
                ctx.arc(spotX, spotY, 3 / currentZoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

class Wall2 extends EdgeItem {
    constructor(edge) {
        super(edge);
        this.hitRadius = 10;
    }
    
    draw(ctx, isGhost = false, currentZoom = 1) {
        ctx.save();
        
        ctx.strokeStyle = isGhost ? '#8B4513' : (this.selected ? '#CD853F' : '#8B4513');
        ctx.lineWidth = 8 / currentZoom;
        ctx.lineCap = 'round';
        
        if (isGhost) {
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5 / currentZoom, 5 / currentZoom]);
        }
        
        ctx.beginPath();
        ctx.moveTo(this.edge.start.x, this.edge.start.y);
        ctx.lineTo(this.edge.end.x, this.edge.end.y);
        ctx.stroke();
        
        ctx.restore();
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EdgeItem, Wall, Wall2 };
}