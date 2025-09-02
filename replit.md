# Rust Strategic Operations Platform

## Overview

The Rust Strategic Operations Platform is a comprehensive suite of three interconnected applications designed for strategic operations management in Rust gaming environments. The platform consists of the Rust Base Design Studio (web-based tactical map editor), Rust Tactical Command Center (React-based command interface), and Rust Server Operations Center (server monitoring system with BattleMetrics integration). This multi-application architecture provides players with complete tactical planning, real-time monitoring, and strategic coordination capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The platform employs different frontend approaches optimized for each application's use case:
- **Rust Base Design Studio**: Vanilla HTML/CSS/JavaScript single-page application with modular class-based architecture for real-time shape editing and tactical map creation
- **Rust Tactical Command Center**: React 18 with TypeScript, Vite build system, and shadcn/ui components for interactive tactical operations and raid planning
- **Rust Server Operations Center**: React-based dashboard with TanStack Query for real-time server monitoring and player tracking

### Backend Architecture
Unified Node.js Express server architecture across applications:
- **Framework**: Express.js with TypeScript and ES modules
- **Development**: tsx for hot reloading, esbuild for production bundling
- **API Structure**: RESTful endpoints with centralized routing and validation
- **Session Management**: PostgreSQL-backed sessions with express-session
- **Real-time Communication**: WebSocket integration for live server monitoring

### Data Storage Solutions
PostgreSQL database with Drizzle ORM providing type-safe operations:
- **Database Provider**: Neon Database for serverless PostgreSQL hosting
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Multi-Application Data**: Shared schema supporting maps, reports, players, teams, and genetic data
- **Session Storage**: PostgreSQL session store with connect-pg-simple

### Authentication and Authorization
Replit OAuth integration with role-based access control:
- **Authentication Provider**: Replit OpenID Connect for seamless integration
- **Session Management**: Secure cookie-based sessions with PostgreSQL storage
- **User Management**: Team-based collaboration with admin/user roles
- **Access Control**: Route-level authentication middleware

## External Dependencies

### Third-Party Services
- **BattleMetrics API**: Primary integration for server information, player data, and real-time activity tracking
- **BattleMetrics WebSocket**: Live event streaming for player join/leave notifications and server status updates
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling

### Development Tools
- **Replit Platform**: Development environment with integrated deployment and error monitoring
- **Vite**: Fast frontend build tool with hot module replacement
- **Drizzle ORM**: Type-safe database operations with automatic query generation
- **shadcn/ui**: Component library built on Radix UI primitives for consistent design

### UI and Styling Frameworks
- **Tailwind CSS**: Utility-first CSS framework with custom theming and responsive design
- **Radix UI**: Accessible component primitives for complex interactions
- **Lucide Icons**: Consistent icon system across all applications

### Validation and Type Safety
- **Zod**: Runtime schema validation for API requests and database operations
- **TypeScript**: Static type checking across frontend and backend codebases
- **React Hook Form**: Form validation and state management with Zod integration