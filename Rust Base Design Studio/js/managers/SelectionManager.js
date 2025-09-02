// Selection management module

class SelectionManager {
    constructor() {
        this.selectedItems = {
            shape: null,
            turret: null,
            wall: null,
            wall2: null,
            reinforcedWall: null,
            garageDoor: null,
            securityGate: null,
            singlePost: null
        };
    }
    
    deselectAll(allItems = []) {
        allItems.forEach(item => {
            if (item && typeof item === 'object') {
                item.selected = false;
            }
        });
        
        Object.keys(this.selectedItems).forEach(key => {
            this.selectedItems[key] = null;
        });
    }
    
    selectItem(item, type) {
        // First deselect everything
        if (window.gameState) {
            const allItems = window.gameState.getAllItems();
            this.deselectAll(allItems);
        }
        
        // Select the new item
        item.selected = true;
        this.selectedItems[type] = item;
        
        // Update UI if function exists
        if (typeof window.updateSelectedInfo === 'function') {
            window.updateSelectedInfo();
        }
    }
    
    getSelectedItem() {
        for (const [type, item] of Object.entries(this.selectedItems)) {
            if (item) {
                return { item, type };
            }
        }
        return null;
    }
    
    getSelected(type) {
        return this.selectedItems[type];
    }
    
    clearSelection(type) {
        if (this.selectedItems[type]) {
            this.selectedItems[type].selected = false;
            this.selectedItems[type] = null;
        }
    }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionManager;
} else if (typeof window !== 'undefined') {
    window.SelectionManager = SelectionManager;
}