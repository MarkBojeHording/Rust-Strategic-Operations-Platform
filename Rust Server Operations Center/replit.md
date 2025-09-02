# BattleMetrics Server Monitor

## Overview

A real-time BattleMetrics server monitoring dashboard built with React and Express. The application provides live server information, player lists, and real-time activity tracking for gaming servers through the BattleMetrics API and WebSocket connection. It features a modern UI with shadcn/ui components and displays authentic real-time player join/leave events as they happen.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js web server
- **Language**: TypeScript with ESM modules
- **API Structure**: RESTful endpoints under `/api` prefix
- **Data Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware with proper status codes
- **Logging**: Custom request/response logging with timing metrics

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Cloud Provider**: Neon Database for serverless PostgreSQL hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Player Activity Storage**: Dedicated tables for player activities, sessions, and server tracking
- **Map Image Storage**: Base64-encoded high-resolution map images with metadata and usage tracking
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL storage
- **User Storage**: In-memory storage implementation with interface for database migration
- **Security**: Session-based authentication with secure cookie configuration

### External Dependencies
- **BattleMetrics API**: Primary data source for server information, player lists, and statistics
- **BattleMetrics WebSocket**: Real-time event streaming for live player join/leave notifications
- **Database**: PostgreSQL via Neon serverless platform (@neondatabase/serverless)
- **UI Framework**: Radix UI primitives for accessible components
- **Development Tools**: Replit integration with error overlay and cartographer plugins
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **Validation**: Zod for runtime type checking and schema validation
- **HTTP Client**: Axios for external API requests with timeout and error handling
- **WebSocket**: Native WebSocket implementation for real-time communication

The architecture follows a clean separation between frontend and backend, with shared TypeScript types and validation schemas. The system features authentic real-time monitoring through BattleMetrics WebSocket events, displaying live player activity as it happens. Designed for easy deployment on Replit with development-specific tooling and production-ready build processes.

### Recent Changes
- **Profile-Based Player Tracking System (August 2025)**: Complete redesign from activity-based to profile-based player tracking architecture. Each player now has a server-specific profile showing current online status, session durations, and complete activity history. Player list displays each person only once, sorted by recent activity with online status indicators. Clicking player names opens detailed profile with full session log history. System uses playerProfiles, enhanced playerSessions, and playerActivities tables with proper relations and foreign key constraints.
- **Database Schema Migration (August 2025)**: Successfully migrated from individual join/leave events to comprehensive profile system. Added playerProfiles table with current status tracking, session statistics, and metadata. Enhanced playerSessions table with profile relationships and detailed session logs. Cleared legacy data (554 activities, 947 sessions) and implemented new foreign key relationships for data integrity.
- **Player Profile Interface (August 2025)**: Created new PlayerProfilesList component replacing PlayersTable. Features profile cards showing online status, session information, total play time, and session count. Includes modal dialog for detailed session history with chronological session logs, duration tracking, and join/leave timestamps. Interface optimized for profile-centric view rather than raw activity events.
- **Enhanced Activity Tracking (August 2025)**: Redesigned PlayerActivityTracker service for profile-based operations. Features profile creation/management, session lifecycle tracking, state reconciliation, and premium player counting. Maintains backward compatibility with WebSocket events while providing profile-centric data access patterns.
- **API Endpoint Expansion (August 2025)**: Added new REST endpoints for profile-based system: /api/servers/:serverId/profiles for player profiles list, /api/profiles/:profileId/sessions for session history. Maintains existing activity endpoints while transitioning to profile-first architecture with proper data formatting and error handling.