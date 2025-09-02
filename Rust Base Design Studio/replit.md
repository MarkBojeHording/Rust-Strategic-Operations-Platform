# Shape Map Editor

## Overview
Shape Map Editor is a client-side web application for creating and editing geometric shapes and maps. It features a clean, desktop-style interface with a central canvas area for drawing, flanked by toolbars and property panels. The application is designed as a standalone HTML/CSS/JavaScript application, served via a simple Python HTTP server for development. It supports multi-floor tactical map creation with independent editing and real-time updates across floors, including a comprehensive dark-themed tactical overlay with power management capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a traditional single-page application (SPA) architecture built with vanilla HTML, CSS, and JavaScript. The layout is a three-panel design: Left (drawing tools/selection), Center (main canvas), and Right (properties panel). The CSS architecture employs a flexbox-based layout with a modern card-style design, ensuring responsiveness while maintaining a minimum canvas width of 940px. The codebase is modularized into separate JavaScript files for classes (`js/classes/`), managers (`js/managers/`), utilities (`js/utils/`), core state (`js/core/`), and main application orchestration (`js/app.js`).

### Core Features and Implementations
- **Shape & Edge Items:** Includes `Shape` (Square, Triangle) and `EdgeItems` (Wall, Window, External Wall/Square2) with specific visual attributes and behaviors. External Walls are draggable and 7m wide (280px), supporting rotation via 'R' key. Windows function identically to Walls, blocking line-of-sight.
- **Tool Management:** Manages tool selection, ghost previews, and item placement logic.
- **Selection Management:** Handles item selection state.


- **Multi-Floor System:** Supports 5 independent floor canvases (main 700x700px, plus 4 additional 350x349px floors) with separate data storage, scaling, zooming, panning, and floor switching. Thumbnails of additional floors update in real-time with optimized performance.
- **Tactical Map Overlay:** A toggleable dark-themed overlay covering the shape tool container. It includes a dark page background, light grey map canvas, and darker grids for all floors.
- **Turret System:** Full interaction for turrets across all 5 floors, including click-to-select, drag-and-drop, 'R' key rotation (45-degree increments), and 'L' key toggle for Field-of-View (FOV) display with optimized ray-casting performance. Global turret numbering system across all floors.
- **Power Management System:** Integrated into the tactical map overlay, allowing creation, deletion, and toggling (ON/OFF) of power containers. Features a scrollable list and highlights for selected containers, preparing for device connection.

### Development Server
A Node.js Express server (`server.js`) with PostgreSQL database integration for map storage, serving static files on port 5000 with CORS support and RESTful API endpoints for map management.

### Database System
- **PostgreSQL Database**: Maps stored in `maps` table with JSON data structure
- **Map Storage**: Complete map data including shapes, turrets, multi-floor layouts, and power containers
- **API Endpoints**: `/api/maps` for CRUD operations (Create, Read, Delete)
- **Named Saves**: Users prompted for map names when saving to database

## Recent Changes
- **August 2025**: Fixed turret FOV power control system - power container on/off switches now properly control Field of View display in tactical mode
- **August 2025**: Restored power-based FOV logic - turrets only show FOV when connected to enabled power containers in tactical mode
- **August 2025**: Enhanced power container toggle functionality to trigger canvas redraws across all floors
- **August 2025**: Completed code optimization reducing main file from 6,978 to 6,942 lines and getElementById calls from 112 to 100
- **August 2025**: Added utility functions for DOM caching, floor management, and canvas operations to consolidate repetitive patterns
- **August 2025**: Completely removed preset system from codebase to optimize space - removed preset dropdown with 1x1/2x1/2x2/Hex options and Load Center button functionality
- **August 2025**: Completely removed symmetry system from codebase to optimize space and performance - removed Symmetry 2 button, variables, and mirror placement logic
- **August 2025**: Implemented complete PostgreSQL database integration for map storage with named saves, load from database, and map management features
- **August 2025**: Updated save/load/manage buttons to use database instead of file downloads, with user prompts for map naming
- **August 2025**: Added RESTful API endpoints for map CRUD operations and replaced Python server with Node.js Express server
- **August 2025**: Fixed floor labels - swapped "2nd Floor" and "Roof", changed "5th Floor" to "3rd Floor"
- **August 2025**: Added "Turret Control Map" label above main canvas with large, prominent text
- **August 2025**: Updated Load Center, Show All Turrets, and Erase All buttons with silver metallic artwork using proper contain sizing
- **August 2025**: Added green metallic button backgrounds to Square, External Wall, Window, and Garage Door tool buttons with custom hover and active states
- **August 2025**: Implemented complete floor selection independence - all 5 floors now maintain separate selections without cross-interference
- **August 2025**: Fixed delete functionality to work across all floors by enhancing getSelectedItem() to search all floor data structures
- **August 2025**: Fixed keyboard event handling for Replit preview window - delete functionality now works in both dev link and preview
- **August 2025**: Added focus management to ensure keyboard events work properly in iframe contexts
- **August 2025**: Enhanced multi-floor selection system with proper click handling for additional floor canvases
- **August 2025**: Fixed "Erase All" button to clear all floors including power containers and global turret numbering
- **August 2025**: Ensured shapes always remain transparent grey and never turn blue across all floors
- **January 2025**: Expanded from 3 to 5 floors with 2 additional smaller floors on right side
- **January 2025**: Fixed performance lag on floors 4-5 by optimizing FOV calculations and extending global turret numbering
- **January 2025**: Added 60fps frame rate limiting and removed debug console logs for smooth operation
- **January 2025**: Restored right-click turret connection functionality for tactical map overlay

## External Dependencies

### Runtime Dependencies
- **Python 3.x**: Required for the development server (`server.py`).
- **Modern Web Browser**: For client-side application execution (e.g., Chrome, Firefox, Safari, Edge).

### Development Tools
- **Python Standard Library**: Utilizes `http.server`, `socketserver`, `os`, `webbrowser`, and `threading` modules.
- **No External JavaScript Libraries**: The application is built entirely with vanilla JavaScript.