// Edge utilities module

const EdgeUtils = {
    distance(p1, p2) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    },
    
    match(edge1, edge2, tolerance = 1) {
        const dist = EdgeUtils.distance;
        return (dist(edge1.start, edge2.start) < tolerance && dist(edge1.end, edge2.end) < tolerance) ||
               (dist(edge1.start, edge2.end) < tolerance && dist(edge1.end, edge2.start) < tolerance);
    },
    
    coincide(edge1, edge2, tolerance = 15) {
        const dist = EdgeUtils.distance;
        const startToStart = dist(edge1.start, edge2.start);
        const startToEnd = dist(edge1.start, edge2.end);
        const endToStart = dist(edge1.end, edge2.start);
        const endToEnd = dist(edge1.end, edge2.end);
        
        const sameDirection = startToStart < tolerance && endToEnd < tolerance;
        const oppositeDirection = startToEnd < tolerance && endToStart < tolerance;
        
        if (sameDirection || oppositeDirection) {
            const v1 = { x: edge1.end.x - edge1.start.x, y: edge1.end.y - edge1.start.y };
            const v2 = { x: edge2.end.x - edge2.start.x, y: edge2.end.y - edge2.start.y };
            
            const dot = v1.x * v2.x + v1.y * v2.y;
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            
            return Math.abs(Math.abs(dot / (len1 * len2)) - 1) < 0.01;
        }
        
        return false;
    },
    
    existsOn(edge, items) {
        return items.some(item => EdgeUtils.match(item.edge, edge));
    }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeUtils;
}