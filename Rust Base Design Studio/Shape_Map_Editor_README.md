# Shape Map Editor - Getting Your Code

## How to Get a Complete Copy of This Code

### Option 1: Download from Replit (Recommended)
1. In the Replit interface, click the **three-dot menu** (⋯) next to your project name
2. Select **"Download as ZIP"** 
3. This will download the complete project including:
   - `index.html` (main application - ~6000+ lines)
   - `server.py` (development server)
   - `replit.md` (project documentation)
   - Any other project files

### Option 2: Copy Individual Files
**Main Application File (`index.html`):**
- This contains the entire Shape Map Editor application
- Includes HTML, CSS, and JavaScript in one file
- Size: ~6000+ lines of code
- Features: Multi-floor editing, tactical map overlay, power management, turret systems

**Development Server (`server.py`):**
- Python HTTP server for local development
- Includes cache-busting and CORS support
- Runs on port 5000

### Option 3: Fork the Repl
1. Click **"Fork Repl"** in the Replit interface
2. This creates your own copy in your Replit account
3. You can then download or continue editing

## Project Structure
```
Shape Map Editor/
├── index.html          # Main application (HTML + CSS + JS)
├── server.py           # Development server
├── replit.md          # Project documentation
└── README.md          # This file
```

## Running Locally
1. Download the files
2. Run: `python server.py` (or `python3 server.py`)
3. Open: http://localhost:5000
4. Or simply open `index.html` in any modern web browser

## Key Features Included
- ✅ Multi-floor editing (5 independent floors)
- ✅ Shape tools (squares, triangles) - always transparent grey
- ✅ Wall and edge item tools
- ✅ Turret system with FOV visualization
- ✅ Tactical map overlay with power management
- ✅ Save/Load system with localStorage
- ✅ Comprehensive keyboard shortcuts
- ✅ Real-time canvas updates and optimization

The code is completely self-contained and doesn't require any external dependencies or frameworks.