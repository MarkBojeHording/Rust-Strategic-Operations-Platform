### Overview
This project is a Rust-themed tactical map and raid calculator application designed for strategic planning and resource management in the game Rust. It provides players with an interactive map interface, comprehensive raid cost calculations for various material types, and tools for tracking bases, reports, and player activity. The application aims to be a specialized gaming utility to enhance strategic gameplay and resource management, enhancing strategic gameplay and resource management through a specialized gaming utility.

### User Preferences
Preferred communication style: Simple, everyday language.
IMPORTANT: Only implement exactly what is requested. Do not create mock/fake data or add unrequested features. Ask questions if unclear.
CRITICAL RULE: When user says "do not change" something, that command must be followed exactly - no modifications whatsoever to that code/component/functionality.
Layout Constraints: Avoid flex containers for modals and containers as they are hard to modify locations of
Scope Control: Do not make extra changes outside the scope of what is being asked. If an extra task or feature seems like a good idea, ask first
Targeted Changes: Avoid making changes to other modals or modules other than the ones being targeted for change. If changes affect multiple components, inform user first
Space Efficiency: Avoid extra containers and dead space when making modals, screens or similar. Minimize margins and unnecessary spacing
No Wrapper Containers: Never create wrapper containers as they cause confusion in development

### System Architecture
**Frontend Architecture**
- **Framework**: React 18 with TypeScript and Vite.
- **UI Framework**: Shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS with CSS variables and PostCSS.
- **State Management**: React Query for server state.
- **Routing**: Wouter for client-side routing.
- **Form Management**: React Hook Form with Zod validation.
- **Icon Management**: Centralized icon registry system (`client/src/lib/icons.ts`) for consistent emoji-based task icons and reducing redundancy.

**Backend Architecture**
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Development**: tsx for hot reloading.
- **Build**: esbuild for production bundling.
- **Storage Interface**: Abstracted storage layer with in-memory implementation.

**Data Storage Solutions**
- **Database**: PostgreSQL via Drizzle ORM.
- **Schema Management**: Drizzle Kit for migrations.
- **Connection**: Neon Database serverless driver.
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions.

**Authentication and Authorization**
- **User Schema**: Basic username/password authentication.
- **Session Handling**: Express sessions with PostgreSQL session store.
- **Validation**: Zod schemas for input validation.

**Core Features**
- **Interactive Tactical Map**: Features zoom/pan, base placement (friendly/enemy), rocket calculator, timers, location action menus, and report tracking. Includes a 26x26 grid system (A0-Z25) aligned with an authentic Rust game map.
- **Base Management**: Comprehensive BaseModal for detailed base information, including rocket and ammo calculations, upkeep tracking, base types, and heat map integration for activity visualization. Supports duplicate base naming (e.g., A1, A1(2)).
- **Centralized Reporting System**: Unified report architecture supporting General, Base, and Task Reports. Task reports are future-focused, linked to bases with interactive map icons, and support CRUD operations for task types including "Request Resources" and "Stock Kits."
- **Player Management System**: A comprehensive modal for tracking players with search, online/offline status, session history, and a premium player system. Player activity is visualized through a heatmap based on session data, with player-specific report filtering.
- **Base Grouping & Visualization**: Implements player-based and proximity-based grouping of bases, displaying colored rings and connection lines.
- **User Interface Enhancements**: Features a consistent design with Shadcn/ui, optimized layouts, and visual indicators for various functionalities. Toolbar positioning is fixed, and interfaces are simplified for a cleaner user experience.
- **Genetic Calculator Data Migration**: Transitioned from localStorage-based genetic data storage to centralized PostgreSQL database. The ProgressionModal now uses React Query and database API endpoints for genetic data persistence. A dedicated genetic_data table stores plant types, genes, progress, and best gene calculations with full CRUD API endpoints available.
- **Farm Countdown Timer System**: Comprehensive timer system integrated with genetic data for clone and harvest timing. Features compact green-styled containers with plant emojis, capitalized activity letters (H/C), and differentiated time formats - clone timers display as `:MM` format while harvest timers show full `H:MM` format. Timers appear above farm bases and countdown based on authentic G gene calculations from genetic data.

### External Dependencies
- **Database Service**: Neon Database (serverless PostgreSQL)
- **Player Data API**: superinfotest.replit.app
- **Icon System**: Lucide React
- **Date Handling**: date-fns
- **Carousel Components**: Embla Carousel
- **Class Management**: clsx and class-variance-authority
- **Command Interface**: cmdk