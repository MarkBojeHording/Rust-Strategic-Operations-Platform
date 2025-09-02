# Rust Strategic Operations Platform

## ⚠️ COPYRIGHT NOTICE - STRICTLY ENFORCED ⚠️

**ALL RIGHTS RESERVED - NO COPYING, DISTRIBUTION, OR USE PERMITTED**

This codebase and all associated intellectual property is the exclusive property of **Mark Boje Hording**. 

**COPYING, REPRODUCING, DISTRIBUTING, MODIFYING, OR USING THIS CODE IN ANY WAY IS STRICTLY PROHIBITED WITHOUT EXPRESS WRITTEN PERMISSION.**

**VIOLATION OF THESE COPYRIGHT RESTRICTIONS MAY RESULT IN LEGAL ACTION.**

---

## Project Overview

The Rust Strategic Operations Platform is a comprehensive suite of tools and applications designed for strategic operations management in Rust gaming environments. This platform consists of three main components, each serving specific operational needs.

## Architecture

### 🎨 Rust Base Design Studio
A web-based design and planning tool for creating strategic layouts, maps, and operational plans. Features include:
- Interactive map editor with drag-and-drop functionality
- Shape and object management system
- Real-time collaboration tools
- Export capabilities for operational planning

**Technology Stack:**
- HTML5, CSS3, JavaScript (ES6+)
- Express.js server
- PostgreSQL database integration
- CORS-enabled API endpoints

### 🎯 Rust Tactical Command Center
A React-based tactical operations interface providing real-time monitoring and command capabilities. Features include:
- Real-time data visualization
- Interactive dashboards
- Component-based architecture
- Responsive design with Tailwind CSS

**Technology Stack:**
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Radix UI components
- Drizzle ORM for database operations
- Express.js backend

### 🖥️ Rust Server Operations Center
A comprehensive server monitoring and management system with advanced analytics and BattleMetrics integration. Features include:
- Real-time server monitoring
- BattleMetrics API integration
- Advanced analytics and reporting
- File upload and management
- Google Cloud Storage integration

**Technology Stack:**
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Drizzle ORM with PostgreSQL
- Google Cloud Platform integration
- BattleMetrics API integration
- Express.js backend with session management

## Development Setup

### Prerequisites
- Node.js 18+ (LTS version recommended)
- PostgreSQL database
- Git

### Installation

1. **Clone the repository** (requires authorization)
   ```bash
   git clone https://github.com/MarkBojeHording/Rust-Strategic-Operations-Platform.git
   cd Rust-Strategic-Operations-Platform
   ```

2. **Install dependencies for each component**
   ```bash
   # Base Design Studio
   cd "Rust Base Design Studio"
   npm install
   
   # Tactical Command Center
   cd "../Rust Tactical Command Center"
   npm install
   
   # Server Operations Center
   cd "../Rust Server Operations Center"
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` files to `.env` in each component directory
   - Configure database connections and API keys
   - Set up Google Cloud credentials (for Server Operations Center)

4. **Database Setup**
   ```bash
   # For components using Drizzle ORM
   npm run db:push
   ```

### Running the Applications

#### Base Design Studio
```bash
cd "Rust Base Design Studio"
npm start
```
Access at: http://localhost:3000

#### Tactical Command Center
```bash
cd "Rust Tactical Command Center"
npm run dev
```
Access at: http://localhost:5173

#### Server Operations Center
```bash
cd "Rust Server Operations Center"
npm run dev
```
Access at: http://localhost:5173

## Project Structure

```
Rust Strategic Operations Platform/
├── Rust Base Design Studio/          # Web-based design tool
│   ├── js/                          # JavaScript modules
│   ├── server/                      # Express.js server
│   ├── attached_assets/             # Design assets
│   └── index.html                   # Main application
├── Rust Tactical Command Center/     # React tactical interface
│   ├── client/                      # React frontend
│   ├── server/                      # Express.js backend
│   ├── shared/                      # Shared utilities
│   └── dist/                        # Build output
└── Rust Server Operations Center/    # Server monitoring system
    ├── client/                      # React frontend
    ├── server/                      # Express.js backend
    ├── shared/                      # Shared utilities
    └── migrations/                  # Database migrations
```

## Contributing

**NO CONTRIBUTIONS ACCEPTED WITHOUT EXPRESS WRITTEN PERMISSION.**

This is a proprietary platform. All development and modifications are restricted to authorized personnel only.

## License

**PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

This software is proprietary and confidential. No license is granted for use, modification, or distribution.

## Support

For technical support or licensing inquiries, contact:
- **Mark Boje Hording**
- **Email:** [Contact information protected]
- **GitHub:** [@MarkBojeHording](https://github.com/MarkBojeHording)

## Security

This platform includes security features such as:
- Session management
- Authentication systems
- API rate limiting
- Secure database connections
- CORS protection

## Performance

- Optimized for real-time operations
- Efficient database queries with Drizzle ORM
- Responsive UI with Tailwind CSS
- Vite-based fast development and build processes

---

**© 2025 Mark Boje Hording. All Rights Reserved.**
