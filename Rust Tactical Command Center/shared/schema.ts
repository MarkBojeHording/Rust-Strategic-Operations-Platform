
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // user, admin, team_admin
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Centralized reports table for all report types
export const reports = pgTable("reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  displayId: text("display_id"), // Alphanumeric ID like "RKW6X91"
  type: text("type").notNull(), // "general" | "base" | "task"
  notes: text("notes").notNull(),
  outcome: text("outcome").notNull(), // "good" | "neutral" | "bad"
  playerTags: text("player_tags").array().default([]), // Array of player IDs (legacy)
  enemyPlayers: text("enemy_players").default(""), // Comma-separated enemy player names
  friendlyPlayers: text("friendly_players").default(""), // Comma-separated friendly player names  
  baseTags: text("base_tags").array().default([]), // Array of base IDs (only for base reports)
  screenshots: text("screenshots").array().default([]), // Array of image URLs
  location: jsonb("location").notNull(), // {gridX: number, gridY: number}
  createdBy: text("created_by"), // User ID who created the report
  createdAt: timestamp("created_at").defaultNow(),
  completedBy: text("completed_by"), // User ID who completed (only for task reports)
  completedAt: timestamp("completed_at"), // Completion timestamp (only for task reports)
  status: text("status").default("pending"), // "pending" | "completed" | "failed" (only for task reports)
  taskType: text("task_type"), // "needs_pickup" | etc (only for task reports)
  taskData: jsonb("task_data") // Task-specific data like {pickupType: "loot"} (only for task reports)
});

// Standard report templates
export const reportTemplates = pgTable("report_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(),
  template: jsonb("template").notNull(), // JSON structure defining fields
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, displayId: true, createdAt: true, completedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true });
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;

// Premium players table for tracking Battlemetrics premium users
export const premiumPlayers = pgTable("premium_players", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerName: text("player_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPremiumPlayerSchema = createInsertSchema(premiumPlayers).omit({ id: true, createdAt: true });
export type InsertPremiumPlayer = z.infer<typeof insertPremiumPlayerSchema>;
export type PremiumPlayer = typeof premiumPlayers.$inferSelect;

// Genetic data table for centralized gene calculator storage
export const geneticData = pgTable("genetic_data", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  plantType: text("plant_type").notNull(), // "hemp", "blueberry", "yellowberry", "redberry", "pumpkin", etc.
  genes: text("genes").array().default([]), // Array of gene strings like ["GYGYGY", "HGHHGG"]
  progress: integer("progress").default(0), // Progress percentage 0-100
  bestGene: text("best_gene"), // The calculated best gene string
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGeneticDataSchema = createInsertSchema(geneticData).omit({ 
  id: true, 
  lastUpdated: true, 
  createdAt: true 
});
export type InsertGeneticData = z.infer<typeof insertGeneticDataSchema>;
export type GeneticData = typeof geneticData.$inferSelect;

// Player base associations table for tracking which players are tagged with which bases
export const playerBaseTags = pgTable("player_base_tags", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerName: text("player_name").notNull(),
  baseId: text("base_id").notNull(), // Links to the base unique ID
  baseName: text("base_name").notNull(), // Base name for display (e.g., "A1", "B3(2)")
  baseType: text("base_type").notNull(), // enemy-small, friendly-main, etc.
  taggedAt: timestamp("tagged_at").defaultNow(),
});

export const insertPlayerBaseTagSchema = createInsertSchema(playerBaseTags).omit({ id: true, taggedAt: true });
export type InsertPlayerBaseTag = z.infer<typeof insertPlayerBaseTagSchema>;
export type PlayerBaseTag = typeof playerBaseTags.$inferSelect;

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

// External player data structure to match your API
export const externalPlayerSchema = z.object({
  playerName: z.string(),
  isOnline: z.boolean(),
  totalSessions: z.number(),
  // Add other fields as needed from your API
});

export type ExternalPlayer = z.infer<typeof externalPlayerSchema>;

// Teams table for organizing enemy bases and team management
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  color: text("color").notNull(), // Hex color for team identification
  mainBaseId: text("main_base_id"), // ID of the main base for this team
  notes: text("notes").default(""),
  selectedServerId: text("selected_server_id").references(() => battlemetricsServers.id), // Team's selected server
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team Server Tracking - which servers each team is monitoring
export const teamServerTracking = pgTable("team_server_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  serverId: text("server_id").notNull().references(() => battlemetricsServers.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  addedBy: varchar("added_by").notNull().references(() => users.id),
}, (table) => ({
  teamServerIdx: index("team_server_idx").on(table.teamId, table.serverId),
  teamActiveServersIdx: index("team_active_servers_idx").on(table.teamId, table.isActive),
}));

// Team Player Intelligence - team-specific player data (notes, aliases, associations)
export const teamPlayerIntelligence = pgTable("team_player_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  playerProfileId: text("player_profile_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(), // Denormalized for quick access
  battlemetricsId: text("battlemetrics_id"), // BattleMetrics ID for tracking name changes
  
  // Team-specific intelligence
  aliases: text("aliases").default(""), // Team's recorded aliases for this player
  notes: text("notes").default(""), // Team-specific notes about this player
  threat_level: text("threat_level").default("unknown"), // unknown, low, medium, high, critical
  relationship: text("relationship").default("unknown"), // ally, enemy, neutral, unknown
  
  // Base associations (team-specific)
  associatedBases: text("associated_bases").default(""), // Comma-separated base IDs
  
  // Metadata
  firstSeenByTeam: timestamp("first_seen_by_team").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  teamPlayerIdx: index("team_player_idx").on(table.teamId, table.playerProfileId),
  teamPlayerNameIdx: index("team_player_name_idx").on(table.teamId, table.playerName),
  battlemetricsTeamIdx: index("battlemetrics_team_idx").on(table.battlemetricsId, table.teamId),
  threatLevelIdx: index("threat_level_idx").on(table.teamId, table.threat_level),
  relationshipIdx: index("relationship_idx").on(table.teamId, table.relationship),
}));

// BattleMetrics servers table for tracking monitored servers
export const battlemetricsServers = pgTable("battlemetrics_servers", {
  id: text("id").primaryKey(), // BattleMetrics server ID
  name: text("name").notNull(),
  game: text("game").notNull(),
  region: text("region"),
  isSelected: boolean("is_selected").default(false), // Which server is currently being tracked
  addedAt: timestamp("added_at").defaultNow().notNull(),
  lastChecked: timestamp("last_checked"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Player profiles table - enhanced with BattleMetrics integration
export const playerProfiles = pgTable("player_profiles", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: text("player_name").notNull(),
  battlemetricsId: text("battlemetrics_id"), // BattleMetrics player ID if available
  serverId: text("server_id").references(() => battlemetricsServers.id),
  
  // Current status
  isOnline: boolean("is_online").default(false).notNull(),
  currentSessionStart: timestamp("current_session_start"),
  
  // Activity tracking
  lastJoinTime: timestamp("last_join_time"),
  lastLeaveTime: timestamp("last_leave_time"),
  lastSeenTime: timestamp("last_seen_time").defaultNow().notNull(),
  
  // Statistics
  totalSessions: integer("total_sessions").default(0).notNull(),
  totalPlayTimeMinutes: integer("total_play_time_minutes").default(0).notNull(),
  
  // Legacy tactical features
  aliases: text("aliases").default(""), // Comma-separated aliases for tactical intelligence
  notes: text("notes").default(""), // Tactical notes
  
  // Metadata
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serverPlayerIdx: index("server_player_idx").on(table.serverId, table.playerName),
  lastSeenIdx: index("last_seen_idx").on(table.lastSeenTime),
  onlineStatusIdx: index("online_status_idx").on(table.serverId, table.isOnline),
  playerNameIdx: index("player_name_idx").on(table.playerName),
}));

// Player activities table - raw join/leave events for detailed logging
export const playerActivities = pgTable("player_activities", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: text("profile_id").references(() => playerProfiles.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => playerSessions.id, { onDelete: "cascade" }),
  serverId: text("server_id").notNull().references(() => battlemetricsServers.id),
  playerName: text("player_name").notNull(),
  battlemetricsId: text("battlemetrics_id"), // BattleMetrics player ID if available
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

// Player sessions table - detailed session logs
export const playerSessions = pgTable("player_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: text("profile_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  serverId: text("server_id").notNull().references(() => battlemetricsServers.id),
  playerName: text("player_name").notNull(),
  battlemetricsId: text("battlemetrics_id"), // BattleMetrics player ID if available
  
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

// Teammates table for tracking player teammate relationships
export const teammates = pgTable("teammates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerName: text("player_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const battlemetricsServersRelations = relations(battlemetricsServers, ({ many }) => ({
  playerProfiles: many(playerProfiles),
  playerActivities: many(playerActivities),
  playerSessions: many(playerSessions),
}));

export const playerProfilesRelations = relations(playerProfiles, ({ one, many }) => ({
  server: one(battlemetricsServers, {
    fields: [playerProfiles.serverId],
    references: [battlemetricsServers.id],
  }),
  sessions: many(playerSessions),
  activities: many(playerActivities),
  teamIntelligence: many(teamPlayerIntelligence),
}));

export const playerSessionsRelations = relations(playerSessions, ({ one }) => ({
  profile: one(playerProfiles, {
    fields: [playerSessions.profileId],
    references: [playerProfiles.id],
  }),
  server: one(battlemetricsServers, {
    fields: [playerSessions.serverId],
    references: [battlemetricsServers.id],
  }),
}));

export const playerActivitiesRelations = relations(playerActivities, ({ one }) => ({
  profile: one(playerProfiles, {
    fields: [playerActivities.profileId],
    references: [playerProfiles.id],
  }),
  session: one(playerSessions, {
    fields: [playerActivities.sessionId],
    references: [playerSessions.id],
  }),
  server: one(battlemetricsServers, {
    fields: [playerActivities.serverId],
    references: [battlemetricsServers.id],
  }),
}));

// Team management relations
export const usersRelations = relations(users, ({ many }) => ({
  createdTeams: many(teams),
  teamMemberships: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  selectedServer: one(battlemetricsServers, {
    fields: [teams.selectedServerId],
    references: [battlemetricsServers.id],
  }),
  members: many(teamMembers),
  serverTracking: many(teamServerTracking),
  playerIntelligence: many(teamPlayerIntelligence),
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

export const teamServerTrackingRelations = relations(teamServerTracking, ({ one }) => ({
  team: one(teams, {
    fields: [teamServerTracking.teamId],
    references: [teams.id],
  }),
  server: one(battlemetricsServers, {
    fields: [teamServerTracking.serverId],
    references: [battlemetricsServers.id],
  }),
  addedBy: one(users, {
    fields: [teamServerTracking.addedBy],
    references: [users.id],
  }),
}));

export const teamPlayerIntelligenceRelations = relations(teamPlayerIntelligence, ({ one }) => ({
  team: one(teams, {
    fields: [teamPlayerIntelligence.teamId],
    references: [teams.id],
  }),
  playerProfile: one(playerProfiles, {
    fields: [teamPlayerIntelligence.playerProfileId],
    references: [playerProfiles.id],
  }),
  updatedBy: one(users, {
    fields: [teamPlayerIntelligence.updatedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBattlemetricsServerSchema = createInsertSchema(battlemetricsServers);
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles);
export const insertPlayerSessionSchema = createInsertSchema(playerSessions);
export const insertPlayerActivitySchema = createInsertSchema(playerActivities);
export const insertTeammateSchema = createInsertSchema(teammates).omit({ id: true, createdAt: true });
export const insertTeamServerTrackingSchema = createInsertSchema(teamServerTracking).omit({ id: true, addedAt: true });
export const insertTeamPlayerIntelligenceSchema = createInsertSchema(teamPlayerIntelligence).omit({ id: true, createdAt: true, firstSeenByTeam: true, lastUpdated: true });

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

// Types
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type DBTeam = typeof teams.$inferSelect;
export type InsertDBTeam = typeof teams.$inferInsert;
export type DBTeamMember = typeof teamMembers.$inferSelect;
export type InsertDBTeamMember = typeof teamMembers.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type BattlemetricsServer = typeof battlemetricsServers.$inferSelect;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type PlayerSession = typeof playerSessions.$inferSelect;
export type PlayerActivity = typeof playerActivities.$inferSelect;
export type TeamServerTracking = typeof teamServerTracking.$inferSelect;
export type TeamPlayerIntelligence = typeof teamPlayerIntelligence.$inferSelect;
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type InsertPlayerSession = z.infer<typeof insertPlayerSessionSchema>;
export type InsertPlayerActivity = z.infer<typeof insertPlayerActivitySchema>;
export type InsertTeammate = z.infer<typeof insertTeammateSchema>;
export type InsertTeamServerTracking = z.infer<typeof insertTeamServerTrackingSchema>;
export type InsertTeamPlayerIntelligence = z.infer<typeof insertTeamPlayerIntelligenceSchema>;
export type Teammate = typeof teammates.$inferSelect;
export type CreateTeamRequest = z.infer<typeof createTeamSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type AddTeamMemberRequest = z.infer<typeof addTeamMemberSchema>;
