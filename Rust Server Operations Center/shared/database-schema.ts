import { pgTable, text, timestamp, integer, boolean, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Player activities table - raw join/leave events
export const playerActivities = pgTable("player_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverId: text("server_id").notNull().references(() => servers.id),
  playerName: text("player_name").notNull(),
  playerId: text("player_id"), // BattleMetrics player ID if available
  action: text("action").notNull(), // 'joined' or 'left'
  timestamp: timestamp("timestamp").notNull(),
  sessionId: uuid("session_id"), // Links join/leave pairs
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  serverTimestampIdx: index("server_timestamp_idx").on(table.serverId, table.timestamp),
  playerNameIdx: index("player_name_idx").on(table.playerName),
  actionIdx: index("action_idx").on(table.action),
}));

// Player sessions table - computed session durations
export const playerSessions = pgTable("player_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverId: text("server_id").notNull().references(() => servers.id),
  playerName: text("player_name").notNull(),
  playerId: text("player_id"), // BattleMetrics player ID if available
  joinTime: timestamp("join_time").notNull(),
  leaveTime: timestamp("leave_time"),
  durationMinutes: integer("duration_minutes"), // Session duration in minutes
  isActive: boolean("is_active").default(true).notNull(), // Player still online
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serverJoinTimeIdx: index("server_join_time_idx").on(table.serverId, table.joinTime),
  playerNameServerIdx: index("player_name_server_idx").on(table.playerName, table.serverId),
  activeSessionsIdx: index("active_sessions_idx").on(table.serverId, table.isActive),
}));

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
  playerActivities: many(playerActivities),
  playerSessions: many(playerSessions),
  maps: many(maps),
}));

export const playerActivitiesRelations = relations(playerActivities, ({ one }) => ({
  server: one(servers, {
    fields: [playerActivities.serverId],
    references: [servers.id],
  }),
}));

export const playerSessionsRelations = relations(playerSessions, ({ one }) => ({
  server: one(servers, {
    fields: [playerSessions.serverId],
    references: [servers.id],
  }),
}));

export const mapsRelations = relations(maps, ({ one }) => ({
  server: one(servers, {
    fields: [maps.serverId],
    references: [servers.id],
  }),
}));

// Insert schemas
export const insertServerSchema = createInsertSchema(servers);
export const insertPlayerActivitySchema = createInsertSchema(playerActivities);
export const insertPlayerSessionSchema = createInsertSchema(playerSessions);
export const insertMapSchema = createInsertSchema(maps);

// Types
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type PlayerActivity = typeof playerActivities.$inferSelect;
export type InsertPlayerActivity = z.infer<typeof insertPlayerActivitySchema>;
export type PlayerSession = typeof playerSessions.$inferSelect;
export type InsertPlayerSession = z.infer<typeof insertPlayerSessionSchema>;
export type Map = typeof maps.$inferSelect;
export type InsertMap = z.infer<typeof insertMapSchema>;