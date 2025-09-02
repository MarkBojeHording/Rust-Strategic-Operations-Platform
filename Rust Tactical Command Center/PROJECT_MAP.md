# Rust Tactical Map - Project Architecture Map

## 🏗️ **SYSTEM OVERVIEW**
```
┌─────────────────────────────────────────────────────────────────┐
│                    RUST TACTICAL MAP APPLICATION                │
│     Strategic Planning Tool for Rust Game with Plant Genetics   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            📱 FRONTEND        🔌 API LAYER      🗄️ DATABASE
         (React/TypeScript)   (Express/Node)   (PostgreSQL)
```

---

## 🎯 **CORE FEATURES & DATA FLOW**

### 1. **Interactive Tactical Map System**
```
TacticalMapPage (Main Hub)
├── TacticalMapToolbar (Fixed Top Navigation)
│   ├── Zoom Controls
│   ├── Timer Management
│   ├── Location Actions Menu
│   └── Report/Base Creation Buttons
├── TacticalMapGrid (26x26 Grid Overlay)
│   ├── Grid Coordinates (A0-Z25)
│   └── Visual Grid Lines
├── TacticalMapBackground (Rust Game Map)
└── TacticalMapLocation (Interactive Markers)
    ├── Base Markers (Friendly/Enemy)
    ├── Report Markers (General/Base/Action)
    └── Context Menu Actions
```

### 2. **Base Management System**
```
BaseModal (Universal Base Interface)
├── Base Types (friendly-main, enemy-small, etc.)
├── RocketCalculatorSection
│   └── RocketCalculator (Popup Integration)
├── PlayerSearchSelector (Owner Management)
├── Upkeep Tracking (Wood/Stone/Metal/HQM)
├── Heat Map Integration
└── Report Preview System
```

### 3. **Reporting Architecture**
```
Centralized Report System
├── Report Types: [general | base | action]
├── ActionReportModal (Action-specific reporting)
├── ReportPreview (Unified display component)
├── Player Tagging System
│   ├── Enemy Players (comma-separated)
│   └── Friendly Players (comma-separated)
├── Alphanumeric ID System (R12ABC3, ROJH1GT)
└── Database Integration (Dual ID tracking)
```

---

## 📁 **FILE STRUCTURE & RESPONSIBILITIES**

### **Frontend Architecture** (`client/`)
```
src/
├── 🏠 pages/
│   ├── tactical-map.tsx          # Main application hub
│   └── not-found.tsx            # 404 handler
├── 🧩 components/
│   ├── 🗺️ MAP COMPONENTS
│   │   ├── TacticalMapGrid.tsx      # 26x26 coordinate system
│   │   ├── TacticalMapToolbar.tsx   # Fixed navigation controls
│   │   ├── TacticalMapLocation.tsx  # Interactive map markers
│   │   └── TacticalMapBackground.tsx # Rust game map display
│   ├── 🏢 BASE MANAGEMENT
│   │   ├── BaseModal.tsx            # Universal base interface
│   │   ├── BaseRadialMenu.tsx       # Base action menu
│   │   └── RocketCalculator.tsx     # Raid cost calculations
│   ├── 📊 REPORTING SYSTEM
│   │   ├── ActionReportModal.tsx    # Action-specific reports
│   │   ├── ReportPreview.tsx        # Unified report display
│   │   └── LogsModal.tsx           # Report management
│   ├── 👥 PLAYER MANAGEMENT
│   │   ├── PlayerModal.tsx          # Player tracking interface
│   │   └── PlayerSearchSelector.tsx # Player tagging system
│   ├── 🧬 GENETICS & PROGRESSION
│   │   ├── ProgressionModal.tsx     # Gene tracking display
│   │   ├── FarmRadialMenu.tsx       # Plant farming tools
│   │   └── gene-calculator.html     # Popup calculator
│   ├── 📈 VISUALIZATION
│   │   ├── HeatMap/                 # Activity visualization
│   │   │   ├── HeatMapOverlay.tsx   # Visual heat map display
│   │   │   ├── HeatMapControls.tsx  # Heat map settings
│   │   │   └── HeatMapCalculator.ts # Heat map algorithms
│   │   └── WipeCountdownTimer.tsx   # Server reset tracking
│   └── 🎨 ui/                       # Shadcn/UI components (60+ files)
├── 🔧 lib/
│   └── queryClient.ts               # React Query configuration
└── 🎯 hooks/                        # Custom React hooks
```

### **Backend Architecture** (`server/`)
```
server/
├── index.ts              # Express server entry point
├── routes.ts             # API endpoint definitions
├── db.ts                 # Neon PostgreSQL connection
├── storage.ts            # Database operations layer
├── seed-templates.ts     # Report template initialization
└── vite.ts              # Frontend/backend integration
```

### **Shared Schema** (`shared/`)
```
schema.ts                 # TypeScript/Drizzle ORM definitions
├── users                 # Authentication system
├── reports              # Centralized reporting (all types)
├── reportTemplates      # Report structure definitions
├── premiumPlayers       # Battlemetrics premium tracking
└── playerBaseTags       # Player-base associations
```

---

## 🔄 **DATA FLOW & INTERACTIONS**

### **Player Tagging Flow**
```
PlayerSearchSelector Component
├── Input: Comma-separated string ("player1, player2")
├── Parse: Split into array for display
├── Modify: Add/remove players via UI
├── Output: Rejoin as comma-separated string
└── Storage: Save to database columns
    ├── reports.enemy_players
    └── reports.friendly_players
```

### **Report Management Flow**
```
Report Creation → Database Storage → Map Marker → Modal Display
├── 1. User creates report via ActionReportModal
├── 2. Data saved with dual ID system:
│   ├── Database ID (integer) for API calls
│   └── Alphanumeric ID (R12ABC3) for user display
├── 3. Map marker created with all report data
├── 4. Report appears in LogsModal and player modals
└── 5. Editing updates in-place (no duplicates)
```

### **Base Management Flow**
```
Base Creation → Player Tagging → Heat Map → Reports
├── 1. BaseModal handles all base types
├── 2. PlayerSearchSelector manages owners
├── 3. HeatMap tracks activity patterns
├── 4. ReportPreview shows related reports
└── 5. RocketCalculator integration for raid planning
```

---

## 🧬 **GENETICS INTEGRATION**

### **Gene Calculator System**
```
Gene Calculator Popup (gene-calculator.html)
├── Independent HTML popup window
├── Advanced genetic algorithms
├── Real-time plant breeding calculations
└── PostMessage API communication
    └── Syncs to ProgressionModal in main window
```

### **Data Synchronization**
```
Popup Window ←→ Main Window Communication
├── postMessage API for cross-window data transfer
├── Automatic updates when gene data changes
├── Manual sync capability for user control
└── Identical gene display formatting
```

---

## 🗄️ **DATABASE ARCHITECTURE**

### **Core Tables**
```
PostgreSQL (Neon Database)
├── users                    # Authentication
├── reports                  # Centralized reporting system
│   ├── Dual ID system (integer + alphanumeric)
│   ├── Separate enemy/friendly player columns
│   ├── JSON location data (gridX, gridY)
│   └── Support for all report types
├── report_templates         # Report structure definitions
├── premium_players          # Battlemetrics integration
└── player_base_tags        # Player-base associations
```

---

## 🔌 **API ENDPOINTS**

### **External Integrations**
```
├── Battlemetrics API      # Real-time player data
├── Gene Calculator API    # Plant breeding algorithms  
└── Rust Map Service       # Authentic game map tiles
```

### **Internal API Routes** (`/api/`)
```
├── /reports              # CRUD operations for all report types
├── /players             # Player tracking and status
├── /premium-players     # Premium player management
├── /player-base-tags    # Player-base associations
└── /report-templates    # Report structure management
```

---

## 🎨 **DESIGN SYSTEM**

### **UI Framework Stack**
```
├── React 18 + TypeScript    # Core framework
├── Shadcn/UI + Radix UI     # Component library (60+ components)
├── Tailwind CSS             # Utility-first styling
├── Lucide React            # Icon system
├── Framer Motion           # Animations
└── React Query             # Server state management
```

### **Color Scheme & Theming**
```
Rust-Themed Orange/Gray Palette
├── Primary: Orange (#f97316, #ea580c)
├── Background: Dark Gray (#1f2937, #111827)
├── Accents: Orange variants for highlights
└── Status Colors: Red (enemy), Green (friendly), Blue (neutral)
```

---

## ⚡ **TECHNICAL HIGHLIGHTS**

### **Performance Optimizations**
- React Query for intelligent caching and background updates
- Parallel component loading with simultaneous API calls
- Efficient heat map calculations with memoization
- Optimized grid rendering for smooth zooming/panning

### **User Experience Features**
- Fixed toolbar positioning for consistent navigation
- Mouse-cursor-relative zooming with smooth transitions
- Context menus for quick access to actions
- Alphanumeric report IDs for user-friendly identification
- Real-time player status indicators

### **Data Integrity Systems**
- Dual ID system for reports (database + display)
- In-place updates to prevent duplicate markers
- Comma-separated string storage for simplicity
- Proper cache invalidation on data changes

---

## 🚀 **DEVELOPMENT WORKFLOW**

### **Build & Development**
```
npm run dev               # Start development server
├── Express backend (port 5000)
├── Vite frontend bundling
├── TypeScript compilation
├── Tailwind CSS processing
└── Hot module replacement
```

### **Database Management**
```
npm run db:push          # Deploy schema changes
npm run db:push --force  # Force schema updates
└── Drizzle ORM handles migrations automatically
```

---

## 📝 **KEY SUCCESS METRICS**

✅ **Resolved Critical Issues:**
- Duplicate report marker bug eliminated
- Notes persistence working correctly  
- Proper alphanumeric report ID display
- Separate enemy/friendly player storage
- In-place report updates (no duplicates)

✅ **System Reliability:**
- Dual ID system for robust data management
- Consistent player tagging like base owners
- Proper cache invalidation and data sync
- Cross-window gene calculator communication

This architecture provides a comprehensive tactical planning platform specifically designed for Rust gameplay, with advanced features for base management, player tracking, strategic reporting, and plant genetics optimization.