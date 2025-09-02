// Shape classes module
const SIDE_PIXELS = 40;

class Shape {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = 0;
        this.selected = false;
        this.transparent = true; // Shapes are always transparent (don't block vision)
    }
    
    contains(x, y) {
        return false;
    }
    
    getEdges() {
        return [];
    }
    
    getCenter() {
        return { x: this.x, y: this.y };
    }
    
    draw(ctx, isGhost = false, currentZoom = 1) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (isGhost) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 3 / currentZoom;
            ctx.setLineDash([5 / currentZoom, 5 / currentZoom]);
        } else {
            if (this.transparent) {
                ctx.fillStyle = this.selected ? '#999999' : '#d0d0d0';
                ctx.strokeStyle = this.selected ? '#666666' : '#a0a0a0';
            } else {
                ctx.fillStyle = this.selected ? '#e74c3c' : '#3498db';
                ctx.strokeStyle = this.selected ? '#c0392b' : '#2980b9';
            }
            ctx.lineWidth = 2 / currentZoom;
        }
        
        this.drawShape(ctx, isGhost);
        
        ctx.restore();
    }
}

class Square extends Shape {
    constructor(x, y) {
        super(x, y, 'square');
    }
    
    drawShape(ctx, isGhost) {
        const half = SIDE_PIXELS / 2;
        ctx.beginPath();
        ctx.rect(-half, -half, SIDE_PIXELS, SIDE_PIXELS);
        if (!isGhost) ctx.fill();
        ctx.stroke();
    }
    
    contains(x, y) {
        const half = SIDE_PIXELS / 2;
        const dx = x - this.x;
        const dy = y - this.y;
        
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        return rx >= -half && rx <= half && ry >= -half && ry <= half;
    }
    
    getEdges() {
        const half = SIDE_PIXELS / 2;
        const corners = [
            { x: -half, y: -half },
            { x: half, y: -half },
            { x: half, y: half },
            { x: -half, y: half }
        ];
        
        const rotatedCorners = corners.map(corner => {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            return {
                x: this.x + corner.x * cos - corner.y * sin,
                y: this.y + corner.x * sin + corner.y * cos
            };
        });
        
        return [
            { start: rotatedCorners[0], end: rotatedCorners[1] },
            { start: rotatedCorners[1], end: rotatedCorners[2] },
            { start: rotatedCorners[2], end: rotatedCorners[3] },
            { start: rotatedCorners[3], end: rotatedCorners[0] }
        ];
    }
}

class Square2 extends Shape {
    constructor(x, y) {
        super(x, y, 'square2');
        this.width = 280; // 7 meters = 7 * 40 pixels/meter = 280 pixels
        this.height = 32; // 0.8 meters = 0.8 * 40 pixels/meter = 32 pixels
    }
    
    drawShape(ctx, isGhost) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        
        if (!isGhost) {
            ctx.fillStyle = this.selected ? '#CC7722' : '#8B4513';
            ctx.strokeStyle = this.selected ? '#AA5511' : '#654321';
            ctx.fill();
        }
        
        ctx.stroke();
    }
    
    contains(x, y) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const dx = x - this.x;
        const dy = y - this.y;
        
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        return rx >= -halfWidth && rx <= halfWidth && ry >= -halfHeight && ry <= halfHeight;
    }
    
    getEdges() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const corners = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ];
        
        const rotatedCorners = corners.map(corner => {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            return {
                x: this.x + corner.x * cos - corner.y * sin,
                y: this.y + corner.x * sin + corner.y * cos
            };
        });
        
        return [
            { start: rotatedCorners[0], end: rotatedCorners[1] },
            { start: rotatedCorners[1], end: rotatedCorners[2] },
            { start: rotatedCorners[2], end: rotatedCorners[3] },
            { start: rotatedCorners[3], end: rotatedCorners[0] }
        ];
    }
}

class Triangle extends Shape {
    constructor(x, y) {
        super(x, y, 'triangle');
    }
    
    drawShape(ctx, isGhost) {
        const size = SIDE_PIXELS / 2;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(-size, size);
        ctx.lineTo(size, size);
        ctx.closePath();
        if (!isGhost) ctx.fill();
        ctx.stroke();
    }
    
    contains(x, y) {
        const size = SIDE_PIXELS / 2;
        const dx = x - this.x;
        const dy = y - this.y;
        
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        if (ry < -size || ry > size) return false;
        
        const leftEdge = -size + (ry + size) * size / (2 * size);
        const rightEdge = size - (ry + size) * size / (2 * size);
        
        return rx >= leftEdge && rx <= rightEdge;
    }
    
    getEdges() {
        const size = SIDE_PIXELS / 2;
        const corners = [
            { x: 0, y: -size },
            { x: -size, y: size },
            { x: size, y: size }
        ];
        
        const rotatedCorners = corners.map(corner => {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            return {
                x: this.x + corner.x * cos - corner.y * sin,
                y: this.y + corner.x * sin + corner.y * cos
            };
        });
        
        return [
            { start: rotatedCorners[0], end: rotatedCorners[1] },
            { start: rotatedCorners[1], end: rotatedCorners[2] },
            { start: rotatedCorners[2], end: rotatedCorners[0] }
        ];
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Shape, Square, Triangle, SIDE_PIXELS };
}