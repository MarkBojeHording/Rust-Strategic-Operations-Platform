import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

// Player profiles table for storing aliases and notes
export const playerProfiles = pgTable("player_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerName: text("player_name").notNull().unique(),
  aliases: text("aliases").default(""), // Comma-separated aliases
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerProfile = typeof playerProfiles.$inferSelect;

// External player data structure to match your API
export const externalPlayerSchema = z.object({
  playerName: z.string(),
  isOnline: z.boolean(),
  totalSessions: z.number(),
  // Add other fields as needed from your API
});

export type ExternalPlayer = z.infer<typeof externalPlayerSchema>;

// Teams table for organizing enemy bases
export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  color: text("color").notNull(), // Hex color for team identification
  mainBaseId: text("main_base_id"), // ID of the main base for this team
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Teammates table for tracking player teammate relationships
export const teammates = pgTable("teammates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerName: text("player_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeammateSchema = createInsertSchema(teammates).omit({ id: true, createdAt: true });
export type InsertTeammate = z.infer<typeof insertTeammateSchema>;
export type Teammate = typeof teammates.$inferSelect;
