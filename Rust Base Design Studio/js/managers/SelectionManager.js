// Selection management module

class SelectionManager {
    constructor() {
        this.selectedItem = null;
        this.selectedType = null;
        this.initialized = true;
    }

    // Select an item with type tracking
    selectItem(item, type) {
        this.clearSelection();
        this.selectedItem = item;
        this.selectedType = type;

        if (item) {
            item.selected = true;
        }
    }

    // Clear current selection
    clearSelection() {
        if (this.selectedItem) {
            this.selectedItem.selected = false;
        }
        this.selectedItem = null;
        this.selectedType = null;
    }

    // Get currently selected item
    getSelected() {
        return {
            item: this.selectedItem,
            type: this.selectedType
        };
    }

    // Check if an item is selected
    isSelected(item) {
        return this.selectedItem === item;
    }

    // Check if any item is selected
    hasSelection() {
        return this.selectedItem !== null;
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionManager;
}

// Make sure it's available globally in browser
if (typeof window !== 'undefined') {
    window.SelectionManager = SelectionManager;
}