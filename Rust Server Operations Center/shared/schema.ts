import { z } from "zod";

export const mapInfoSchema = z.object({
  name: z.string(),
  seed: z.number().optional(),
  size: z.number().optional(),
  entityCount: z.number().optional(),
  monuments: z.number().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  game: z.string(),
  region: z.string().optional(),
  status: z.enum(["online", "offline"]),
  players: z.number(),
  maxPlayers: z.number(),
  rank: z.number().optional(),
  mapInfo: mapInfoSchema.optional(),
  gameMode: z.string().optional(),
  version: z.string().optional(),
  lastWipe: z.string().optional(),
  details: z.record(z.any()).optional(),
  ping: z.number().optional(),
  lastSeen: z.string().optional(),
  queueCount: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  sessionTime: z.string(),
  joinTime: z.string(),
  private: z.boolean().optional(),
});

export const activitySchema = z.object({
  id: z.string(),
  playerName: z.string(),
  action: z.enum(["joined", "left"]),
  timestamp: z.string(),
});

export const serverStatsSchema = z.object({
  joinedToday: z.number(),
  avgSessionTime: z.string(),
  peakToday: z.number(),
});

// Server management schemas
export const addServerSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  serverId: z.string().min(1, "Server ID is required"),
});

export const serverListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  game: z.string(),
  region: z.string().optional(),
  status: z.enum(["online", "offline"]),
  players: z.number(),
  maxPlayers: z.number(),
  ping: z.number().optional(),
  errorMessage: z.string().optional(),
  mapFetched: z.boolean(),
  lastChecked: z.string(),
  addedAt: z.string(),
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

// Team management schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name too long"),
  description: z.string().optional(),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export type CreateTeamRequest = z.infer<typeof createTeamSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type AddTeamMemberRequest = z.infer<typeof addTeamMemberSchema>;

// Database schema for Drizzle ORM
import { pgTable, text, timestamp, integer, boolean, uuid, index, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

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
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // user, admin, team_admin
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teams table for managing team accounts
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team memberships table for linking users to teams
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  teamUserIdx: index("team_user_idx").on(table.teamId, table.userId),
  userTeamsIdx: index("user_teams_idx").on(table.userId),
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

export const usersRelations = relations(users, ({ many }) => ({
  createdTeams: many(teams),
  teamMemberships: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertServerSchema = createInsertSchema(servers);
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles);
export const insertPlayerActivitySchema = createInsertSchema(playerActivities);
export const insertPlayerSessionSchema = createInsertSchema(playerSessions);
export const insertMapSchema = createInsertSchema(maps);
export const insertTeamSchema = createInsertSchema(teams);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);

// Database types
export type DBServer = typeof servers.$inferSelect;
export type InsertDBServer = z.infer<typeof insertServerSchema>;
export type DBPlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertDBPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type DBPlayerActivity = typeof playerActivities.$inferSelect;
export type InsertDBPlayerActivity = z.infer<typeof insertPlayerActivitySchema>;
export type DBPlayerSession = typeof playerSessions.$inferSelect;
export type InsertDBPlayerSession = z.infer<typeof insertPlayerSessionSchema>;
export type DBMap = typeof maps.$inferSelect;
export type InsertDBMap = z.infer<typeof insertMapSchema>;
export type DBTeam = typeof teams.$inferSelect;
export type InsertDBTeam = z.infer<typeof insertTeamSchema>;
export type DBTeamMember = typeof teamMembers.$inferSelect;
export type InsertDBTeamMember = z.infer<typeof insertTeamMemberSchema>;
