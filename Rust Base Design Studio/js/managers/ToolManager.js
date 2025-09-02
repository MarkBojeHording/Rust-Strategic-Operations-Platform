// Tool management module

class ToolManager {
    constructor() {
        this.currentTool = null;
        this.initialized = true;
    }

    // Set the current active tool
    setTool(toolName) {
        this.currentTool = toolName;
    }

    // Get the current active tool
    getCurrentTool() {
        return this.currentTool;
    }

    // Clear the current tool
    clearTool() {
        this.currentTool = null;
    }

    // Check if a specific tool is active
    isToolActive(toolName) {
        return this.currentTool === toolName;
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolManager;
}

// Make sure it's available globally in browser
if (typeof window !== 'undefined') {
    window.ToolManager = ToolManager;
}