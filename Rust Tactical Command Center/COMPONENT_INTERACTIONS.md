# Rust Tactical Map - Component Interactions & Data Flow

## 🔗 **COMPLEX SYSTEM INTERACTIONS**

### **Central Hub: TacticalMapPage**
```
┌─────────────────────────────────────────────────────────────────┐
│                      TACTICAL MAP PAGE                         │
│                   (Central Orchestrator)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   🎛️ STATE        📡 HOOKS      🔄 EFFECTS
   MANAGEMENT      & QUERIES    & HANDLERS
```

---

## 🌐 **DATA FLOW NETWORK**

### **1. State Management Web**
```
TacticalMapPage (Central State Hub)
├── 🗺️ Map Interaction State
│   ├── zoom (1-8x) ──────────► TacticalMapGrid
│   ├── pan {x, y} ───────────► TacticalMapBackground
│   ├── isDragging ───────────► Mouse Event Handlers
│   └── mapRef ───────────────► Wheel/Click Detection
│
├── 🏢 Location Management
│   ├── locations[] ──────────► TacticalMapLocation (rendering)
│   ├── selectedLocation ─────► BaseModal (editing)
│   ├── editingLocation ──────► BaseModal (update mode)
│   └── locationTimers{} ─────► WipeCountdownTimer
│
├── 📊 Modal Visibility Control
│   ├── newBaseModal ─────────► BaseModal
│   ├── showPlayerModal ──────► PlayerModal
│   ├── showLogsModal ────────► LogsModal
│   ├── showTeamsModal ───────► TeamsModal
│   ├── showProgressionModal ─► ProgressionModal
│   └── showBaseReportModal ──► ActionReportModal
│
├── 👥 Player & Report Data
│   ├── players[] ────────────► PlayerSearchSelector
│   ├── premiumPlayers[] ─────► PlayerModal
│   └── baseReportData{} ─────► ActionReportModal
│
└── 🎯 UI State Management
    ├── contextMenu ─────────► RadialMenu/BaseRadialMenu
    ├── modalType ───────────► BaseModal (friendly/enemy)
    ├── heatMapConfig ───────► HeatMapOverlay
    └── progressionDisplay ──► ProgressionModal
```

### **2. Component Communication Matrix**

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  COMPONENT      │  RECEIVES FROM  │   SENDS TO      │  SHARED STATE   │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ TacticalMapPage │ User Events     │ All Components  │ Central Hub     │
│ BaseModal       │ TacticalMapPage │ Database API    │ formData{}      │
│ PlayerModal     │ TacticalMapPage │ Database API    │ players[]       │
│ ReportPreview   │ BaseModal       │ ActionReport    │ reports[]       │
│ PlayerSearch    │ BaseModal       │ BaseModal       │ selectedPlayers │
│ HeatMapOverlay  │ TacticalMapPage │ Visual Layer    │ heatMapConfig   │
│ RocketCalc      │ BaseModal       │ Gene Calculator │ calculatorData  │
│ ActionReport    │ Multiple        │ Database API    │ reportData{}    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 🔄 **DETAILED INTERACTION FLOWS**

### **Base Creation & Management Flow**
```
User Right-Click on Map
         │
         ▼
┌─────────────────┐    contextMenu.visible = true
│ Context Menu    │ ──────────────────────────────►
│ (RadialMenu)    │                                │
└─────────────────┘                                │
         │                                         ▼
         │ User selects "Add Base"          ┌─────────────────┐
         ▼                                  │ TacticalMapPage │
┌─────────────────┐                        │ State Update    │
│ setModalType()  │ ◄─────────────────────  └─────────────────┘
│ setNewBaseModal │                                │
│ ({visible:true})│                                │
└─────────────────┘                                ▼
         │                               ┌─────────────────┐
         ▼                               │ BaseModal       │
┌─────────────────┐    Props Flow        │ Opens with:     │
│ BaseModal       │ ◄──────────────────  │ - modalType     │
│ Component       │                      │ - modal coords  │
│ Renders         │                      │ - editingLoc    │
└─────────────────┘                      └─────────────────┘
         │                                         │
         │ User fills form & saves                 │
         ▼                                         ▼
┌─────────────────┐                      ┌─────────────────┐
│ handleSaveBase  │ ◄─────────────────── │ onSave callback │
│ Function        │                      │ triggered       │
└─────────────────┘                      └─────────────────┘
         │
         ▼
┌─────────────────┐    Updates locations[]
│ setLocations    │ ──────────────────────►
│ State Update    │                       │
└─────────────────┘                       ▼
         │                        ┌─────────────────┐
         ▼                        │ TacticalMapLoc  │
┌─────────────────┐              │ Re-renders with │
│ Modal Closes    │              │ new base marker │
│ newBaseModal    │              └─────────────────┘
│ {visible:false} │                       │
└─────────────────┘                       ▼
                                 ┌─────────────────┐
                                 │ Visual Update   │
                                 │ Map shows new   │
                                 │ base marker     │
                                 └─────────────────┘
```

### **Player Tagging Cross-Component Flow**
```
BaseModal (Base Owners)           PlayerModal (Player Activity)
        │                                    │
        ▼                                    ▼
┌─────────────────┐                ┌─────────────────┐
│PlayerSearchSel  │◄──────────────►│ Player Data     │
│ Component       │   Shared API   │ Display         │
└─────────────────┘                └─────────────────┘
        │                                    │
        │ Comma-separated                    │
        │ string format                      │
        ▼                                    ▼
┌─────────────────┐                ┌─────────────────┐
│ "player1,       │                │ players[]       │
│  player2,       │                │ from API        │
│  player3"       │                │ /api/players    │
└─────────────────┘                └─────────────────┘
        │                                    │
        │ Parse & Display                    │
        ▼                                    ▼
┌─────────────────┐                ┌─────────────────┐
│ Array of player │                │ Heat Map Data   │
│ tags with       │                │ Activity        │
│ status indicators│ ─────────────► │ Visualization   │
└─────────────────┘                └─────────────────┘
        │
        │ User adds/removes
        ▼
┌─────────────────┐    onPlayersChange()
│ Rejoin as       │ ──────────────────────►
│ comma string    │                       │
└─────────────────┘                       ▼
        │                        ┌─────────────────┐
        │ Update callback        │ BaseModal       │
        ▼                        │ formData.players│
┌─────────────────┐              │ state update    │
│ Database Save   │              └─────────────────┘
│ via API call    │
└─────────────────┘
```

### **Report System Interconnections**
```
ActionReportModal                  BaseModal               LogsModal
        │                             │                       │
        │ Creates Report               │ Shows Related         │ Lists All
        ▼                             │ Reports               ▼ Reports
┌─────────────────┐                  ▼                ┌─────────────────┐
│ Report Data     │         ┌─────────────────┐       │ Report List     │
│ {type, notes,   │ ───────►│ ReportPreview   │◄──────│ with Filters    │
│  players, etc}  │         │ Component       │       └─────────────────┘
└─────────────────┘         └─────────────────┘               │
        │                             │                       │
        │ POST /api/reports            │ Shared Display        │
        ▼                             │ Logic                 ▼
┌─────────────────┐                  ▼                ┌─────────────────┐
│ Database        │         ┌─────────────────┐       │ Query Filters   │
│ Storage         │         │ Unified Report  │       │ by Type/Player  │
│ Dual ID System  │         │ Formatting      │       └─────────────────┘
└─────────────────┘         └─────────────────┘               │
        │                             │                       │
        │ Returns saved report        │                       │
        ▼                             ▼                       ▼
┌─────────────────┐         ┌─────────────────┐       ┌─────────────────┐
│ Map Marker      │         │ Status Icons    │       │ PlayerModal     │
│ Creation        │ ───────►│ Enemy/Friendly  │◄──────│ Report Filter   │
│ Visual Update   │         │ Player Tags     │       │ Integration     │
└─────────────────┘         └─────────────────┘       └─────────────────┘
```

---

## 🧬 **GENETICS INTEGRATION NETWORK**

### **Gene Calculator Cross-Window Communication**
```
Main Window (TacticalMapPage)          Popup Window (gene-calculator.html)
        │                                           │
        │ openGeneCalculator()                      │
        ▼                                           ▼
┌─────────────────┐                        ┌─────────────────┐
│ window.open()   │ ──────────────────────► │ Independent     │
│ Creates popup   │                        │ HTML/JS App     │
└─────────────────┘                        └─────────────────┘
        │                                           │
        │ Listen for messages                       │ Gene calculations
        ▼                                           ▼
┌─────────────────┐                        ┌─────────────────┐
│ window.addEvent │                        │ Advanced Gene   │
│ Listener        │                        │ Algorithms      │
│ 'message'       │ ◄─────────────────────  │ Quality Calc    │
└─────────────────┘    postMessage API     └─────────────────┘
        │                                           │
        │ Receives gene data                        │
        ▼                                           │
┌─────────────────┐                                │
│ ProgressionModal│ ◄─────────────────────────────┘
│ Updates display │   Real-time sync
│ with gene info  │
└─────────────────┘
        │
        │ Same data format as calculator
        ▼
┌─────────────────┐
│ Gene Quality    │
│ Color Coding    │
│ Progress %      │
└─────────────────┘
```

---

## 🎯 **HEAT MAP INTEGRATION WEB**

### **Multi-Source Data Aggregation**
```
Player Activity Data               Base Location Data              Session History
        │                                 │                               │
        │ API: /api/players                │ locations[] state             │ Database queries
        ▼                                 ▼                               ▼
┌─────────────────┐            ┌─────────────────┐             ┌─────────────────┐
│ Real-time       │            │ Base positions  │             │ Historical      │
│ Player Status   │            │ & types         │             │ Player Sessions │
│ Online/Offline  │            │ Enemy/Friendly  │             │ Time tracking   │
└─────────────────┘            └─────────────────┘             └─────────────────┘
        │                                 │                               │
        │                                 │                               │
        └─────────────────┬───────────────┼───────────────────────────────┘
                          │               │
                          ▼               ▼
                   ┌─────────────────────────────┐
                   │   HeatMapCalculator.ts      │
                   │   Advanced Algorithms       │
                   │   - Proximity weighting     │
                   │   - Time-based decay        │
                   │   - Activity clustering     │
                   └─────────────────────────────┘
                               │
                               ▼
                   ┌─────────────────────────────┐
                   │     HeatMapOverlay.tsx      │
                   │     Visual Rendering        │
                   │   - Gradient calculations   │
                   │   - Color interpolation     │
                   │   - SVG path generation     │
                   └─────────────────────────────┘
                               │
                               ▼
                   ┌─────────────────────────────┐    ┌─────────────────┐
                   │      Map Layer Stack       │◄───│ HeatMapControls │
                   │  Background → Grid →       │    │ User Settings   │
                   │  HeatMap → Locations       │    │ Intensity, etc  │
                   └─────────────────────────────┘    └─────────────────┘
```

---

## 🔌 **API INTEGRATION MATRIX**

### **Database → Component Data Flow**
```
PostgreSQL Database                 Express API Routes              React Components
        │                                  │                            │
        │ Drizzle ORM                      │ Route Handlers             │ React Query
        ▼                                  ▼                            ▼
┌─────────────────┐            ┌─────────────────┐           ┌─────────────────┐
│ reports table   │───────────►│ /api/reports    │◄──────────│ LogsModal       │
│ dual ID system  │            │ CRUD operations │           │ useQuery hook   │
└─────────────────┘            └─────────────────┘           └─────────────────┘
        │                                  │                            │
        │                                  │                            │
┌─────────────────┐            ┌─────────────────┐           ┌─────────────────┐
│ premium_players │───────────►│ /api/premium-   │◄──────────│ PlayerModal     │
│ table           │            │ players         │           │ Premium status  │
└─────────────────┘            └─────────────────┘           └─────────────────┘
        │                                  │                            │
        │                                  │                            │
┌─────────────────┐            ┌─────────────────┐           ┌─────────────────┐
│ player_base_tags│───────────►│ /api/player-    │◄──────────│ BaseModal       │
│ associations    │            │ base-tags       │           │ PlayerSearch    │
└─────────────────┘            └─────────────────┘           └─────────────────┘
```

### **External API Integration**
```
Battlemetrics API                SuperInfo API                 Gene Calculator
        │                            │                              │
        │ Player status              │ Server data                  │ Genetic algorithms
        ▼                            ▼                              ▼
┌─────────────────┐         ┌─────────────────┐          ┌─────────────────┐
│ Real-time       │         │ Server          │          │ Plant Breeding  │
│ Online/Offline  │         │ Population      │          │ Optimization    │
│ Player Data     │         │ Statistics      │          │ Calculations    │
└─────────────────┘         └─────────────────┘          └─────────────────┘
        │                            │                              │
        │ HTTP requests              │ Error handling               │ Popup window
        ▼                            ▼                              ▼
┌─────────────────┐         ┌─────────────────┐          ┌─────────────────┐
│ /api/players    │         │ Fallback data   │          │ ProgressionModal│
│ endpoint        │         │ when API down   │          │ Data sync       │
└─────────────────┘         └─────────────────┘          └─────────────────┘
```

---

## ⚡ **EVENT PROPAGATION CHAINS**

### **Mouse Interaction Chain**
```
User Mouse Event
        │
        ▼
┌─────────────────┐
│ Map Container   │ ──── onWheel ────► Zoom Handler
│ Event Capture   │                   
└─────────────────┘ ──── onMouseDown ─► Drag Handler
        │                             
        │           ──── onClick ────► Location Selection
        ▼                             
┌─────────────────┐ ──── onContext ──► Radial Menu
│ Event Delegation│                   
│ & Propagation   │                   
└─────────────────┘                   
        │                             
        ▼                             
┌─────────────────┐                   
│ State Updates   │ ────────────────► Re-render Cycle
│ Trigger Cascade │                   
└─────────────────┘                   
```

### **Data Mutation Chain**
```
User Action (Save/Update/Delete)
        │
        ▼
┌─────────────────┐
│ Component       │ ──── Validation ──► Form Validation
│ Event Handler   │                     
└─────────────────┘ ──── API Call ────► Database Update
        │                               
        │           ──── Success ─────► Cache Invalidation
        ▼                               
┌─────────────────┐                     
│ React Query     │ ────────────────► Background Refetch
│ Cache Management│                     
└─────────────────┘                     
        │                               
        ▼                               
┌─────────────────┐                     
│ UI Re-render    │ ────────────────► Visual Update
│ & State Sync    │                     
└─────────────────┘                     
```

---

## 🎨 **UI STATE SYNCHRONIZATION**

### **Modal Orchestration**
```
TacticalMapPage (Modal Controller)
        │
        ├── showPlayerModal ────────► PlayerModal
        │   │                        │
        │   └── closeModal ──────────┘ (onClose callback)
        │
        ├── showBaseReportModal ───► ActionReportModal
        │   │                        │
        │   └── reportData ──────────┘ (baseId, coords)
        │
        ├── newBaseModal.visible ──► BaseModal
        │   │                        │
        │   ├── modalType ───────────┘ (friendly/enemy)
        │   └── editingLocation ────┘ (update mode)
        │
        └── showProgressionModal ──► ProgressionModal
            │                        │
            └── progressionDisplay ─┘ (gene data sync)
```

This interaction map shows the complex web of dependencies, data flows, and communication patterns that make your tactical map application a cohesive, powerful tool for Rust strategic planning. Each component is interconnected through multiple channels, creating a robust and responsive user experience.