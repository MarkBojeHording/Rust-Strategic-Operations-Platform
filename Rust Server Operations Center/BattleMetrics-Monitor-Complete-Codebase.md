# BattleMetrics Server Monitor - Complete Codebase

**Project Type:** Real-time Game Server Monitoring Dashboard  
**Technology Stack:** React + Express + PostgreSQL + WebSocket  
**Authentication:** Replit OAuth with session management  
**Database:** PostgreSQL with Drizzle ORM  
**Export Date:** August 14, 2025  

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Package Configuration](#package-configuration)
3. [Database Schema](#database-schema)
4. [Backend Code](#backend-code)
5. [Frontend Code](#frontend-code)
6. [Configuration Files](#configuration-files)
7. [Setup Instructions](#setup-instructions)

---

## Project Overview

A sophisticated real-time gaming server monitoring application that tracks player activity through BattleMetrics API integration. Features secure authentication, persistent player tracking, and comprehensive analytics dashboard.

**Key Features:**
- Real-time WebSocket player tracking
- Secure Replit OAuth authentication
- Player profile system with session history
- PostgreSQL database with Drizzle ORM
- Modern React UI with shadcn/ui components
- Scalable architecture for thousands of players

**Current Data:**
- 623 player activities tracked
- 466 unique player profiles
- 472 total sessions recorded
- Real-time tracking active

---

## Package Configuration

### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "description": "",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:pg-native",
    "build:client": "vite build --config vite.config.ts",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@google-cloud/storage": "^7.12.1",
    "@neondatabase/serverless": "^0.10.1",
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@tanstack/react-query": "^5.59.16",
    "axios": "^1.7.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^4.1.0",
    "drizzle-orm": "^0.36.1",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.3.0",
    "express": "^4.21.1",
    "express-session": "^1.18.1",
    "framer-motion": "^11.11.7",
    "google-auth-library": "^9.14.1",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.451.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "next-themes": "^0.3.0",
    "openid-client": "^6.1.3",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-icons": "^5.3.0",
    "react-resizable-panels": "^2.1.4",
    "recharts": "^2.12.7",
    "tailwind-merge": "^2.5.3",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.0.1",
    "uuid": "^10.0.0",
    "vaul": "^1.0.0",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/memoizee": "^0.4.11",
    "@types/node": "^22.7.5",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.5.12",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.28.1",
    "esbuild": "^0.24.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.8"
  }
}
```

---

## Database Schema

### shared/schema.ts
```typescript
import { z } from "zod";
import { pgTable, text, timestamp, integer, boolean, uuid, index, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Map info schema
export const mapInfoSchema = z.object({
  name: z.string().optional(),
  seed: z.number().optional(),
  size: z.number().optional(),
  url: z.string().optional(),
});

// Server schema
export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  game: z.string(),
  ip: z.string().optional(),
  port: z.number().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  players: z.number().optional(),
  maxPlayers: z.number().optional(),
  ping: z.number().optional(),
  mapInfo: mapInfoSchema.optional(),
});

// Player schema
export const playerSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  time: z.number().optional(),
  score: z.number().optional(),
  rank: z.number().optional(),
});

// Activity schema for real-time events
export const activitySchema = z.object({
  id: z.string(),
  serverId: z.string(),
  playerName: z.string(),
  action: z.enum(["joined", "left"]),
  timestamp: z.string(),
});

// Server stats schema
export const serverStatsSchema = z.object({
  playerCount: z.number(),
  maxPlayers: z.number(),
  uptimeMinutes: z.number(),
  averagePlayTime: z.number(),
});

// Add server request schema
export const addServerSchema = z.object({
  url: z.string().url("Please enter a valid BattleMetrics server URL"),
});

// Server list item schema for API responses
export const serverListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  game: z.string(),
  region: z.string().optional(),
  status: z.string().optional(),
  players: z.number().optional(),
  maxPlayers: z.number().optional(),
  ping: z.number().optional(),
  errorMessage: z.string().optional(),
  mapFetched: z.boolean().optional(),
  lastChecked: z.string().optional(),
  addedAt: z.string().optional(),
});

// Player profile schema for API
export const playerProfileSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  playerName: z.string(),
  playerId: z.string().optional(),
  isOnline: z.boolean(),
  currentSessionStart: z.string().optional(),
  lastJoinTime: z.string().optional(),
  lastLeaveTime: z.string().optional(),
  lastSeenTime: z.string(),
  totalSessions: z.number(),
  totalPlayTimeMinutes: z.number(),
  lastKnownRank: z.number().optional(),
  lastKnownScore: z.number().optional(),
  firstSeenAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Player activity tracking schemas
export const playerActivitySchema = z.object({
  id: z.string(),
  profileId: z.string().optional(),
  sessionId: z.string().optional(),
  serverId: z.string(),
  playerName: z.string(),
  playerId: z.string().optional(),
  action: z.enum(["joined", "left"]),
  timestamp: z.string(),
  playerRank: z.number().optional(),
  playerScore: z.number().optional(),
});

export const playerSessionSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  serverId: z.string(),
  playerName: z.string(),
  playerId: z.string().optional(),
  joinTime: z.string(),
  leaveTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  isActive: z.boolean(),
  playerRank: z.number().optional(),
  playerScore: z.number().optional(),
  sessionType: z.string().optional(),
});

export type MapInfo = z.infer<typeof mapInfoSchema>;
export type Server = z.infer<typeof serverSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type ServerStats = z.infer<typeof serverStatsSchema>;
export type PlayerProfile = z.infer<typeof playerProfileSchema>;
export type PlayerActivity = z.infer<typeof playerActivitySchema>;
export type PlayerSession = z.infer<typeof playerSessionSchema>;
export type AddServerRequest = z.infer<typeof addServerSchema>;
export type ServerListItem = z.infer<typeof serverListItemSchema>;

// Authentication types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Database schema for Drizzle ORM

// Servers table - for tracking monitored servers
export const servers = pgTable("servers", {
  id: text("id").primaryKey(), // BattleMetrics server ID
  name: text("name").notNull(),
  game: text("game").notNull(),
  region: text("region"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  lastChecked: timestamp("last_checked"),
  isActive: boolean("is_active").default(true).notNull(), // For soft delete
});

// Player activities table - raw join/leave events for detailed logging
export const playerActivities = pgTable("player_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => playerProfiles.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => playerSessions.id, { onDelete: "cascade" }),
  serverId: text("server_id").notNull().references(() => servers.id),
  playerName: text("player_name").notNull(),
  playerId: text("player_id"), // BattleMetrics player ID if available
  action: text("action").notNull(), // 'joined' or 'left'
  timestamp: timestamp("timestamp").notNull(),
  
  // Additional metadata
  playerRank: integer("player_rank"),
  playerScore: integer("player_score"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  profileIdx: index("profile_activities_idx").on(table.profileId),
  sessionIdx: index("session_activities_idx").on(table.sessionId),
  serverTimestampIdx: index("server_timestamp_idx").on(table.serverId, table.timestamp),
  actionIdx: index("action_idx").on(table.action),
}));

// Player profiles table - one profile per player per server
export const playerProfiles = pgTable("player_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverId: text("server_id").notNull().references(() => servers.id),
  playerName: text("player_name").notNull(),
  playerId: text("player_id"), // BattleMetrics player ID if available
  
  // Current status
  isOnline: boolean("is_online").default(false).notNull(),
  currentSessionStart: timestamp("current_session_start"),
  
  // Last activity tracking
  lastJoinTime: timestamp("last_join_time"),
  lastLeaveTime: timestamp("last_leave_time"),
  lastSeenTime: timestamp("last_seen_time").defaultNow().notNull(),
  
  // Statistics
  totalSessions: integer("total_sessions").default(0).notNull(),
  totalPlayTimeMinutes: integer("total_play_time_minutes").default(0).notNull(),
  
  // Player metadata
  lastKnownRank: integer("last_known_rank"),
  lastKnownScore: integer("last_known_score"),
  
  // Timestamps
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serverPlayerIdx: index("server_player_idx").on(table.serverId, table.playerName),
  lastSeenIdx: index("last_seen_idx").on(table.lastSeenTime),
  onlineStatusIdx: index("online_status_idx").on(table.serverId, table.isOnline),
}));

// Player sessions table - detailed session logs
export const playerSessions = pgTable("player_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  serverId: text("server_id").notNull().references(() => servers.id),
  playerName: text("player_name").notNull(),
  playerId: text("player_id"), // BattleMetrics player ID if available
  
  // Session timing
  joinTime: timestamp("join_time").notNull(),
  leaveTime: timestamp("leave_time"),
  durationMinutes: integer("duration_minutes"), // Session duration in minutes
  isActive: boolean("is_active").default(true).notNull(), // Player still online
  
  // Player info at time of session
  playerRank: integer("player_rank"),
  playerScore: integer("player_score"),
  
  // Session metadata
  sessionType: text("session_type").default("normal"), // 'normal', 'premium'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  profileIdx: index("profile_sessions_idx").on(table.profileId),
  serverJoinTimeIdx: index("server_join_time_idx").on(table.serverId, table.joinTime),
  activeSessionsIdx: index("active_sessions_idx").on(table.serverId, table.isActive),
}));

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maps table - for storing cached map images
export const maps = pgTable("maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverId: text("server_id").notNull().references(() => servers.id),
  mapName: text("map_name"), // e.g., "Procedural Map 4000"
  seed: text("seed"), // Map seed
  size: integer("size"), // Map size (e.g., 4000)
  imageUrl: text("image_url"), // Original source URL
  imageData: text("image_data"), // Base64 encoded image or file path
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  serverIdx: index("maps_server_idx").on(table.serverId),
  seedIdx: index("maps_seed_idx").on(table.seed),
  fetchedAtIdx: index("maps_fetched_at_idx").on(table.fetchedAt),
}));

// Relations
export const serversRelations = relations(servers, ({ many }) => ({
  playerProfiles: many(playerProfiles),
  playerActivities: many(playerActivities),
  playerSessions: many(playerSessions),
  maps: many(maps),
}));

export const playerProfilesRelations = relations(playerProfiles, ({ one, many }) => ({
  server: one(servers, {
    fields: [playerProfiles.serverId],
    references: [servers.id],
  }),
  sessions: many(playerSessions),
  activities: many(playerActivities),
}));

export const playerActivitiesRelations = relations(playerActivities, ({ one }) => ({
  server: one(servers, {
    fields: [playerActivities.serverId],
    references: [servers.id],
  }),
  profile: one(playerProfiles, {
    fields: [playerActivities.profileId],
    references: [playerProfiles.id],
  }),
  session: one(playerSessions, {
    fields: [playerActivities.sessionId],
    references: [playerSessions.id],
  }),
}));

export const playerSessionsRelations = relations(playerSessions, ({ one, many }) => ({
  server: one(servers, {
    fields: [playerSessions.serverId],
    references: [servers.id],
  }),
  profile: one(playerProfiles, {
    fields: [playerSessions.profileId],
    references: [playerProfiles.id],
  }),
  activities: many(playerActivities),
}));

export const mapsRelations = relations(maps, ({ one }) => ({
  server: one(servers, {
    fields: [maps.serverId],
    references: [servers.id],
  }),
}));

// Database types for TypeScript
export type DBServer = typeof servers.$inferSelect;
export type InsertDBServer = typeof servers.$inferInsert;
export type DBPlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertDBPlayerProfile = typeof playerProfiles.$inferInsert;
export type DBPlayerActivity = typeof playerActivities.$inferSelect;
export type InsertDBPlayerActivity = typeof playerActivities.$inferInsert;
export type DBPlayerSession = typeof playerSessions.$inferSelect;
export type InsertDBPlayerSession = typeof playerSessions.$inferInsert;
export type DBMap = typeof maps.$inferSelect;
export type InsertDBMap = typeof maps.$inferInsert;

// Drizzle insert schemas
export const insertServerSchema = createInsertSchema(servers);
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles);
export const insertPlayerActivitySchema = createInsertSchema(playerActivities);
export const insertPlayerSessionSchema = createInsertSchema(playerSessions);
export const insertMapSchema = createInsertSchema(maps);
```

---

## Backend Code

### server/index.ts
```typescript
import express from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { globalWebSocketManager } from "./services/websocketManager.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms :: ${typeof data === 'string' && data.length > 100 ? data.substring(0, 100) + '...' : typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data || ''}`);
    return originalSend.call(this, data);
  };

  next();
});

(async () => {
  const server = await registerRoutes(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize WebSocket connection for persistent tracking
  console.log('Connecting to BattleMetrics WebSocket for persistent tracking...');
  globalWebSocketManager.connect();

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
  });
})();
```

### server/db.ts
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

### server/storage.ts
```typescript
import { type DBServer, type InsertDBServer, type UpsertUser, type User, users } from "../shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

// Storage interface for server management and authentication
export interface IStorage {
  // Server operations
  getServer(id: string): Promise<DBServer | undefined>;
  createServer(server: InsertDBServer): Promise<DBServer>;
  getAllServers(): Promise<DBServer[]>;
  
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations for authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Server operations (legacy - maintained for compatibility)
  async getServer(id: string): Promise<DBServer | undefined> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }

  async createServer(server: InsertDBServer): Promise<DBServer> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }

  async getAllServers(): Promise<DBServer[]> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }
}

export const storage = new DatabaseStorage();
```

### server/replitAuth.ts
```typescript
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
```

### server/services/websocketManager.ts
```typescript
import WebSocket from 'ws';
import { PlayerActivityTracker } from './playerActivityTracker.js';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private subscribedServers: Set<string> = new Set();
  private processedEvents: Set<string> = new Set();
  private playerActivityTracker: PlayerActivityTracker;

  constructor() {
    this.playerActivityTracker = new PlayerActivityTracker();
  }

  connect(): void {
    try {
      this.ws = new WebSocket('wss://ws.battlemetrics.com/ws');

      this.ws.on('open', () => {
        console.log('✓ Connected to BattleMetrics WebSocket (persistent)');
        this.subscribeToServer('2933470'); // Default server
      });

      this.ws.on('message', async (data) => {
        await this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed, attempting to reconnect in 5 seconds...');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }
    
    this.reconnectInterval = setTimeout(() => {
      console.log('Attempting to reconnect to BattleMetrics WebSocket...');
      this.connect();
    }, 5000);
  }

  subscribeToServer(serverId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        type: 'subscribe',
        channels: [`server:${serverId}`]
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedServers.add(serverId);
      console.log(`📡 Subscribed to server ${serverId} for persistent tracking`);
    } else {
      console.warn('WebSocket not connected, cannot subscribe to server');
    }
  }

  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      // Handle server events
      if (message.message && message.message.type === 'SERVER_EVENT') {
        const event = message.message;
        const eventId = `${event.serverId}-${event.timestamp}-${event.playerId}-${event.type}`;
        
        // Check for duplicate events
        if (this.processedEvents.has(eventId)) {
          return; // Skip duplicate
        }
        this.processedEvents.add(eventId);
        
        // Clean up old processed events (keep only last 1000)
        if (this.processedEvents.size > 1000) {
          const eventsArray = Array.from(this.processedEvents);
          eventsArray.slice(0, 500).forEach(id => this.processedEvents.delete(id));
        }

        await this.handleServerEvent(event);
      }

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private async handleServerEvent(event: any): Promise<void> {
    try {
      const { type, serverId, playerId, name: playerName, timestamp } = event;

      // Validate player data before processing
      if (!playerName || typeof playerName !== 'string') {
        console.warn(`⚠️ [WebSocket] Invalid player name for event: ${JSON.stringify({ type, serverId, playerId, playerName })}`);
        return; // Skip events with invalid player names
      }

      if (type === 'addPlayer') {
        await this.playerActivityTracker.recordPlayerJoin(serverId, playerName, playerId);
        console.log(`[Persistent] Player ${playerName} joined server ${serverId}`);
      } else if (type === 'removePlayer') {
        await this.playerActivityTracker.recordPlayerLeave(serverId, playerName, playerId);
        console.log(`[Persistent] Player ${playerName} left server ${serverId}`);
      }

    } catch (error) {
      console.error('Error processing server event:', error);
    }
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedServers.clear();
    console.log('WebSocket disconnected and cleaned up');
  }

  getSubscribedServers(): string[] {
    return Array.from(this.subscribedServers);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket manager instance
export const globalWebSocketManager = new WebSocketManager();
```

### server/services/playerActivityTracker.ts
```typescript
import { db } from '../db.js';
import { 
  playerProfiles, 
  playerActivities, 
  playerSessions, 
  DBPlayerProfile,
  DBPlayerActivity, 
  DBPlayerSession 
} from '../../shared/schema.js';
import { desc, eq, and, isNull, sql, gte } from 'drizzle-orm';

export class PlayerActivityTracker {


  constructor() {
    console.log('🎯 [ProfileTracker] Initialized with profile-based tracking');
  }

  // Get or create a player profile for a server
  async getOrCreateProfile(serverId: string, playerName: string, playerId?: string): Promise<DBPlayerProfile> {
    try {
      // First try to find existing profile
      const existing = await db.select()
        .from(playerProfiles)
        .where(and(
          eq(playerProfiles.serverId, serverId),
          eq(playerProfiles.playerName, playerName)
        ))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new profile
      const newProfile = await db.insert(playerProfiles)
        .values({
          serverId,
          playerName,
          playerId,
          isOnline: false,
          totalSessions: 0,
          totalPlayTimeMinutes: 0,
          firstSeenAt: new Date(),
          lastSeenTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`👤 [Profile] Created new profile for ${playerName} on server ${serverId}`);
      return newProfile[0];
    } catch (error) {
      console.error('❌ [Profile] Error getting/creating profile:', error);
      throw error;
    }
  }

  // Record a player join event
  async recordPlayerJoin(serverId: string, playerName: string, playerId?: string): Promise<void> {
    try {
      const profile = await this.getOrCreateProfile(serverId, playerName, playerId);
      const joinTime = new Date();

      // Check if player is already marked as online to avoid duplicates
      if (profile.isOnline) {
        console.log(`🚫 [DuplicateCheck] ${playerName} already marked as online, skipping join`);
        return;
      }

      // Start a new session
      const newSession = await db.insert(playerSessions)
        .values({
          profileId: profile.id,
          serverId,
          playerName,
          playerId,
          joinTime,
          isActive: true,
          createdAt: joinTime,
          updatedAt: joinTime,
        })
        .returning();

      // Update profile status
      await db.update(playerProfiles)
        .set({
          isOnline: true,
          currentSessionStart: joinTime,
          lastJoinTime: joinTime,
          lastSeenTime: joinTime,
          totalSessions: sql`${playerProfiles.totalSessions} + 1`,
          updatedAt: joinTime,
        })
        .where(eq(playerProfiles.id, profile.id));

      // Record activity event
      await db.insert(playerActivities)
        .values({
          profileId: profile.id,
          sessionId: newSession[0].id,
          serverId,
          playerName,
          playerId,
          action: 'joined',
          timestamp: joinTime,
          createdAt: joinTime,
        });

      console.log(`🟢 [Join] ${playerName} joined server ${serverId}`);
    } catch (error) {
      console.error('❌ [Join] Error recording player join:', error);
    }
  }

  // Record a player leave event
  async recordPlayerLeave(serverId: string, playerName: string, playerId?: string): Promise<void> {
    try {
      const profile = await this.getOrCreateProfile(serverId, playerName, playerId);
      const leaveTime = new Date();

      // Check if player is already marked as offline
      if (!profile.isOnline) {
        console.log(`🚫 [DuplicateCheck] ${playerName} already marked as offline, skipping leave`);
        return;
      }

      // Find and close the active session
      const activeSession = await db.select()
        .from(playerSessions)
        .where(and(
          eq(playerSessions.profileId, profile.id),
          eq(playerSessions.isActive, true)
        ))
        .limit(1);

      if (activeSession.length > 0) {
        const session = activeSession[0];
        const joinTime = new Date(session.joinTime);
        const durationMinutes = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));

        // Update session with leave time and duration
        await db.update(playerSessions)
          .set({
            leaveTime,
            durationMinutes,
            isActive: false,
            updatedAt: leaveTime,
          })
          .where(eq(playerSessions.id, session.id));

        // Update profile statistics
        await db.update(playerProfiles)
          .set({
            isOnline: false,
            currentSessionStart: null,
            lastLeaveTime: leaveTime,
            lastSeenTime: leaveTime,
            totalPlayTimeMinutes: sql`${playerProfiles.totalPlayTimeMinutes} + ${durationMinutes}`,
            updatedAt: leaveTime,
          })
          .where(eq(playerProfiles.id, profile.id));

        // Record activity event
        await db.insert(playerActivities)
          .values({
            profileId: profile.id,
            sessionId: session.id,
            serverId,
            playerName,
            playerId,
            action: 'left',
            timestamp: leaveTime,
            createdAt: leaveTime,
          });

        console.log(`🔴 [Leave] ${playerName} left server ${serverId} (${durationMinutes} minutes)`);
      } else {
        console.log(`⚠️ [Leave] No active session found for ${playerName}, updating profile only`);
        
        // Update profile status even if no active session found
        await db.update(playerProfiles)
          .set({
            isOnline: false,
            currentSessionStart: null,
            lastLeaveTime: leaveTime,
            lastSeenTime: leaveTime,
            updatedAt: leaveTime,
          })
          .where(eq(playerProfiles.id, profile.id));
      }
    } catch (error) {
      console.error('❌ [Leave] Error recording player leave:', error);
    }
  }

  // Get player profiles for a server (for UI display)
  async getPlayerProfiles(serverId: string, limit: number = 500): Promise<DBPlayerProfile[]> {
    try {
      const profiles = await db.select()
        .from(playerProfiles)
        .where(eq(playerProfiles.serverId, serverId))
        .orderBy(desc(playerProfiles.lastSeenTime))
        .limit(limit);

      return profiles;
    } catch (error) {
      console.error('❌ [Profiles] Error fetching player profiles:', error);
      return [];
    }
  }

  // Get session history for a specific player profile
  async getPlayerSessionHistory(profileId: string, limit: number = 50): Promise<DBPlayerSession[]> {
    try {
      const sessions = await db.select()
        .from(playerSessions)
        .where(eq(playerSessions.profileId, profileId))
        .orderBy(desc(playerSessions.joinTime))
        .limit(limit);

      return sessions;
    } catch (error) {
      console.error('❌ [Sessions] Error fetching session history:', error);
      return [];
    }
  }

  // Reconcile player state with live server data
  async reconcilePlayerState(serverId: string, livePlayers: any[]): Promise<void> {
    try {
      const livePlayerNames = new Set(livePlayers.map(p => p.name));
      
      // Get all currently online profiles for this server
      const onlineProfiles = await db.select()
        .from(playerProfiles)
        .where(and(
          eq(playerProfiles.serverId, serverId),
          eq(playerProfiles.isOnline, true)
        ));

      // Find players who are marked online but not in live data
      for (const profile of onlineProfiles) {
        if (!livePlayerNames.has(profile.playerName)) {
          console.log(`🔄 [Reconcile] ${profile.playerName} marked online but not in live data - recording leave`);
          await this.recordPlayerLeave(serverId, profile.playerName, profile.playerId || undefined);
        }
      }

      // Find players in live data who aren't marked as online
      for (const player of livePlayers) {
        const existingProfile = await db.select()
          .from(playerProfiles)
          .where(and(
            eq(playerProfiles.serverId, serverId),
            eq(playerProfiles.playerName, player.name)
          ))
          .limit(1);

        if (existingProfile.length === 0 || !existingProfile[0].isOnline) {
          console.log(`🔄 [Reconcile] ${player.name} in live data but not marked online - recording join`);
          await this.recordPlayerJoin(serverId, player.name, player.id);
        }
      }

      console.log(`✅ [Reconcile] Completed for server ${serverId}: ${livePlayers.length} live players`);
    } catch (error) {
      console.error('❌ [Reconcile] Error during reconciliation:', error);
    }
  }
}
```

### server/services/battlemetrics.ts
```typescript
import axios, { AxiosResponse } from 'axios';
import { Server, Player, ServerStats } from '../../shared/schema.js';

export class BattleMetricsService {
  private baseURL = 'https://api.battlemetrics.com';
  private requestCount = 0;
  private maxRequestsPerMinute = 50; // Conservative limit
  private requestTimestamps: number[] = [];

  private async rateLimitedRequest(url: string): Promise<AxiosResponse> {
    // Clean up old timestamps (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);

    // Check if we're hitting rate limits
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (Date.now() - this.requestTimestamps[0]);
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
    this.requestCount++;

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'BattleMetrics-Monitor/1.0'
        }
      });
      
      return response;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('⚠️ Rate limited by BattleMetrics, waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return this.rateLimitedRequest(url); // Retry after wait
      }
      throw error;
    }
  }

  async getServer(serverId: string): Promise<Server> {
    try {
      const url = `${this.baseURL}/servers/${serverId}`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.data?.data) {
        throw new Error('Invalid server response format');
      }

      const serverData = response.data.data;
      const attributes = serverData.attributes;

      return {
        id: serverData.id,
        name: attributes.name || 'Unknown Server',
        game: attributes.details?.game || 'Unknown',
        ip: attributes.ip,
        port: attributes.port,
        region: attributes.country || attributes.region,
        status: attributes.status,
        players: attributes.players || 0,
        maxPlayers: attributes.maxPlayers || 0,
        ping: attributes.details?.ping,
        mapInfo: {
          name: attributes.details?.map,
          seed: attributes.details?.seed,
          size: attributes.details?.size,
          url: attributes.details?.rust_maps_url || attributes.details?.mapUrl
        }
      };
    } catch (error: any) {
      console.error('Error fetching server:', error.message);
      throw new Error(`Failed to fetch server ${serverId}: ${error.message}`);
    }
  }

  async getPlayers(serverId: string): Promise<Player[]> {
    try {
      const url = `${this.baseURL}/servers/${serverId}/players`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.data?.data) {
        return [];
      }

      return response.data.data.map((player: any) => ({
        id: player.id,
        name: player.attributes?.name || 'Unknown Player',
        time: player.attributes?.time,
        score: player.attributes?.score,
        rank: player.attributes?.rank
      }));
    } catch (error: any) {
      console.error('Error fetching players:', error.message);
      throw new Error(`Failed to fetch players for server ${serverId}: ${error.message}`);
    }
  }

  async getServerStats(serverId: string): Promise<ServerStats> {
    try {
      const server = await this.getServer(serverId);
      
      return {
        playerCount: server.players || 0,
        maxPlayers: server.maxPlayers || 0,
        uptimeMinutes: 0, // Would need additional API calls to calculate
        averagePlayTime: 0 // Would need to calculate from session data
      };
    } catch (error: any) {
      console.error('Error fetching server stats:', error.message);
      throw new Error(`Failed to fetch stats for server ${serverId}: ${error.message}`);
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getRemainingRequests(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    return Math.max(0, this.maxRequestsPerMinute - recentRequests.length);
  }
}
```

### server/services/mapStorage.ts
```typescript
import { db } from '../db.js';
import { maps, DBMap, InsertDBMap } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

interface MapData {
  serverId: string;
  mapName?: string;
  seed?: string;
  size?: number;
  imageUrl?: string;
  imageData: string; // Base64 encoded image data
}

export class MapStorageService {
  
  async storeMapImage(mapData: MapData): Promise<DBMap> {
    try {
      console.log(`💾 [MapStorage] Storing map image for server ${mapData.serverId}`);
      
      const insertData: InsertDBMap = {
        serverId: mapData.serverId,
        mapName: mapData.mapName,
        seed: mapData.seed,
        size: mapData.size,
        imageUrl: mapData.imageUrl,
        imageData: mapData.imageData,
        fetchedAt: new Date(),
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.insert(maps)
        .values(insertData)
        .returning();

      console.log(`✅ [MapStorage] Map image stored successfully for server ${mapData.serverId}`);
      return result[0];
      
    } catch (error) {
      console.error('❌ [MapStorage] Error storing map image:', error);
      throw error;
    }
  }

  async getLatestMapForServer(serverId: string): Promise<DBMap | null> {
    try {
      const result = await db.select()
        .from(maps)
        .where(eq(maps.serverId, serverId))
        .orderBy(desc(maps.fetchedAt))
        .limit(1);

      if (result.length > 0) {
        // Update last used timestamp
        await db.update(maps)
          .set({ lastUsed: new Date() })
          .where(eq(maps.id, result[0].id));
        
        return result[0];
      }

      return null;
    } catch (error) {
      console.error('❌ [MapStorage] Error fetching map:', error);
      return null;
    }
  }

  async deleteOldMaps(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await db.delete(maps)
        .where(eq(maps.lastUsed, cutoffDate));

      console.log(`🧹 [MapStorage] Cleaned up old maps (older than ${retentionDays} days)`);
      return 0; // Note: Drizzle doesn't return affected rows count directly
    } catch (error) {
      console.error('❌ [MapStorage] Error cleaning up maps:', error);
      return 0;
    }
  }

  async getStorageStats(): Promise<{ totalMaps: number; totalSizeKB: number }> {
    try {
      const allMaps = await db.select().from(maps);
      
      const totalMaps = allMaps.length;
      const totalSizeKB = allMaps.reduce((total, map) => {
        // Estimate size based on base64 string length
        const sizeBytes = map.imageData ? map.imageData.length * 0.75 : 0; // Base64 is ~33% larger than original
        return total + sizeBytes;
      }, 0) / 1024;

      return { totalMaps, totalSizeKB: Math.round(totalSizeKB) };
    } catch (error) {
      console.error('❌ [MapStorage] Error getting storage stats:', error);
      return { totalMaps: 0, totalSizeKB: 0 };
    }
  }
}

export const mapStorageService = new MapStorageService();
```

---

## Frontend Code

### client/src/App.tsx
```typescript
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import ServersPage from "@/pages/servers";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={ServersPage} />
          <Route path="/servers" component={ServersPage} />
          <Route path="/dashboard" component={Dashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

### client/src/pages/landing.tsx
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Shield, Users, Database } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            BattleMetrics Server Monitor
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Advanced real-time monitoring for gaming servers with comprehensive player tracking and analytics
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            <Shield className="mr-2 h-5 w-5" />
            Log In to Dashboard
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Real-Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live player join/leave events through WebSocket connections
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Player Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive player tracking with session history and statistics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Database className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Data Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Persistent storage with detailed session logs and play time tracking
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Secure Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Protected dashboard with secure authentication and session management
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Stats Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
            Professional Server Monitoring
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">Real-Time</div>
              <p className="text-slate-600 dark:text-slate-400">
                WebSocket connections for live player activity monitoring
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">Scalable</div>
              <p className="text-slate-600 dark:text-slate-400">
                Track thousands of players with PostgreSQL storage
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">Detailed</div>
              <p className="text-slate-600 dark:text-slate-400">
                Complete session history and player statistics
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Ready to monitor your gaming servers?
          </p>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login-secondary"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
          >
            Access Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### client/src/hooks/useAuth.ts
```typescript
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
```

### client/src/lib/authUtils.ts
```typescript
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
```

---

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["client/src", "server", "shared"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        surface: "var(--surface)",
        "surface-variant": "var(--surface-variant)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
```

### drizzle.config.ts
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
```

---

## Setup Instructions

### 1. Environment Variables
Set these environment variables:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-random-session-secret-here
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.replit.app
ISSUER_URL=https://replit.com/oidc
```

### 2. Installation & Setup
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Development
npm run dev

# Production build
npm run build
npm start
```

### 3. Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy application
5. Configure Replit OAuth domains

---

## Features Summary

### Authentication
- ✅ Replit OAuth integration
- ✅ Session-based authentication
- ✅ Protected API endpoints
- ✅ Secure logout functionality

### Real-time Tracking
- ✅ WebSocket connection to BattleMetrics
- ✅ Live player join/leave events
- ✅ Persistent background tracking
- ✅ Event deduplication

### Player Management
- ✅ Individual player profiles
- ✅ Session duration tracking
- ✅ Activity history logging
- ✅ Statistical calculations

### Database
- ✅ PostgreSQL with Drizzle ORM
- ✅ Proper relations and indexes
- ✅ Data integrity constraints
- ✅ Scalable schema design

### User Interface
- ✅ Modern React components
- ✅ Responsive design
- ✅ Real-time data updates
- ✅ Professional landing page

---

**Export Generated:** August 14, 2025  
**Application Status:** Production Ready  
**Current Data:** 623 activities, 466 profiles, 472 sessions tracked