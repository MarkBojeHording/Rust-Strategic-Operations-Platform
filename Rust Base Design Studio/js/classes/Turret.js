// Turret class module

class Turret {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 17;
        this.rotation = 0;
        this.selected = false;
        this.legs = [
            { angle: 0 },
            { angle: -Math.PI * 3/4 },
            { angle: Math.PI * 3/4 }
        ];
        this.number = 1; // Will be set by TurretManager
    }
    
    contains(x, y) {
        const dist = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        if (dist <= this.radius) return true;
        
        const dx = x - this.x;
        const dy = y - this.y;
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        return this.legs.some(leg => {
            const legCos = Math.cos(leg.angle);
            const legSin = Math.sin(leg.angle);
            const legX = localX * legCos - localY * legSin;
            const legY = localX * legSin + localY * legCos;
            
            return legX >= -2.5 && legX <= 2.5 && 
                   legY >= -this.radius - 25 && legY <= -this.radius + 5;
        });
    }
    
    draw(ctx, currentZoom = 1, gameState = null) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        this.drawLegs(ctx, currentZoom);
        
        const isActive = gameState ? 
            (gameState.showLineOfSight && gameState.lineOfSightTurret === this) || gameState.showAllTurrets :
            false;
        this.drawBody(ctx, currentZoom, isActive);
        
        this.drawDirectionIndicator(ctx, currentZoom, gameState);
        
        ctx.restore();
    }
    
    drawLegs(ctx, zoom) {
        ctx.fillStyle = '#555';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / zoom;
        
        this.legs.forEach(leg => {
            ctx.save();
            ctx.rotate(leg.angle);
            
            ctx.fillRect(-2.5, -this.radius - 25, 5, 30);
            ctx.strokeRect(-2.5, -this.radius - 25, 5, 30);
            
            ctx.beginPath();
            ctx.arc(0, -this.radius + 5, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        });
    }
    
    drawBody(ctx, zoom, isActive) {
        if (isActive) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20 / zoom;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.selected ? '#C08080' : '#A57070';
        ctx.fill();
        ctx.strokeStyle = this.selected ? '#ff6600' : '#444';
        ctx.lineWidth = 3 / zoom;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    
    drawDirectionIndicator(ctx, zoom, gameState = null) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius + 3);
        ctx.lineTo(-5, -this.radius + 10);
        ctx.lineTo(5, -this.radius + 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -this.radius + 10);
        ctx.stroke();
        
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw activation indicator if active
        if (gameState && ((gameState.showLineOfSight && gameState.lineOfSightTurret === this) || gameState.showAllTurrets)) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Get center point for calculations
    getCenter() {
        return { x: this.x, y: this.y };
    }
    
    // Rotate by 45 degrees (user preference)
    rotate() {
        this.rotation += Math.PI / 4; // 45 degrees
        if (this.rotation >= Math.PI * 2) {
            this.rotation -= Math.PI * 2;
        }
    }
    
    // Get facing direction as unit vector
    getFacingDirection() {
        return {
            x: Math.cos(this.rotation - Math.PI / 2),
            y: Math.sin(this.rotation - Math.PI / 2)
        };
    }
    
    // Clone for serialization
    serialize() {
        return {
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            number: this.number
        };
    }
    
    // Restore from serialized data
    static deserialize(data) {
        const turret = new Turret(data.x, data.y);
        turret.rotation = data.rotation || 0;
        turret.number = data.number || 1;
        return turret;
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Turret;
} else if (typeof window !== 'undefined') {
    window.Turret = Turret;
}