import { type User, type InsertUser, type Report, type InsertReport, type ReportTemplate, type InsertReportTemplate, type PremiumPlayer, type InsertPremiumPlayer, type PlayerBaseTag, type InsertPlayerBaseTag, type PlayerProfile, type InsertPlayerProfile, type Teammate, type InsertTeammate, type GeneticData, type InsertGeneticData } from "@shared/schema";
import { randomUUID } from "crypto";

// Utility function to generate consistent alphanumeric report IDs
const generateReportDisplayId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'R'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Centralized report management methods
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: number): Promise<Report | undefined>;
  getAllReports(): Promise<Report[]>;
  getReportsByType(type: string): Promise<Report[]>;
  getReportsByPlayerTag(playerId: string): Promise<Report[]>;
  getReportsByBaseTag(baseId: string): Promise<Report[]>;
  getReportsForBaseWithPlayers(baseId: string, baseOwners: string): Promise<Report[]>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: number): Promise<boolean>;
  
  // Template management methods
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplateByType(reportType: string): Promise<ReportTemplate | undefined>;
  
  // Premium player management methods
  createPremiumPlayer(player: InsertPremiumPlayer): Promise<PremiumPlayer>;
  getAllPremiumPlayers(): Promise<PremiumPlayer[]>;
  getPremiumPlayerByName(playerName: string): Promise<PremiumPlayer | undefined>;
  deletePremiumPlayer(id: number): Promise<boolean>;
  
  // Player base tagging methods
  createPlayerBaseTag(tag: InsertPlayerBaseTag): Promise<PlayerBaseTag>;
  getPlayerBaseTags(playerName: string): Promise<PlayerBaseTag[]>;
  getBasePlayerTags(baseId: string): Promise<PlayerBaseTag[]>;
  getAllPlayerBaseTags(): Promise<PlayerBaseTag[]>;
  deletePlayerBaseTag(id: number): Promise<boolean>;
  deletePlayerBaseTagsByBaseId(baseId: string): Promise<boolean>;
  
  // Player profile methods
  createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile>;
  getPlayerProfile(playerName: string): Promise<PlayerProfile | undefined>;
  updatePlayerProfile(playerName: string, profile: Partial<InsertPlayerProfile>): Promise<PlayerProfile>;
  getAllPlayerProfiles(): Promise<PlayerProfile[]>;
  deletePlayerProfile(playerName: string): Promise<boolean>;
  
  // Teammate methods
  addTeammate(playerName: string): Promise<Teammate>;
  removeTeammate(playerName: string): Promise<boolean>;
  getAllTeammates(): Promise<Teammate[]>;
  isTeammate(playerName: string): Promise<boolean>;
  
  // Genetic data methods
  upsertGeneticData(data: InsertGeneticData): Promise<GeneticData>;
  getGeneticData(plantType: string): Promise<GeneticData | undefined>;
  getAllGeneticData(): Promise<GeneticData[]>;
  deleteGeneticData(plantType: string): Promise<boolean>;
  clearAllGeneticData(): Promise<boolean>;
  
  // Note: Regular player data comes from external API, no local storage needed
}

import { db } from "./db";
import { users, reports, reportTemplates, premiumPlayers, playerBaseTags, playerProfiles, teammates, geneticData } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Report management methods
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db
      .insert(reports)
      .values({
        ...report,
        displayId: generateReportDisplayId()
      })
      .returning();
    return newReport;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }

  async getAllReports(): Promise<Report[]> {
    return await db.select().from(reports);
  }

  async getReportsByType(type: string): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.type, type));
  }

  async getReportsByPlayerTag(playerId: string): Promise<Report[]> {
    // Search in playerTags array, enemyPlayers, and friendlyPlayers fields
    const playerReports = await db.select().from(reports).where(
      sql`${reports.playerTags} @> ARRAY[${playerId}] OR 
          ${reports.enemyPlayers} LIKE ${'%' + playerId + '%'} OR 
          ${reports.friendlyPlayers} LIKE ${'%' + playerId + '%'}`
    );
    
    // Sort by creation date (newest first)
    return playerReports.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getReportsByBaseTag(baseId: string): Promise<Report[]> {
    const baseReports = await db.select().from(reports).where(sql`${reports.baseTags} @> ARRAY[${baseId}]`);
    return baseReports;
  }

  // Enhanced method to get reports for a base including player-matched general reports
  async getReportsForBaseWithPlayers(baseId: string, baseOwners: string): Promise<Report[]> {
    // Parse comma-separated base owners
    const ownerNames = baseOwners ? baseOwners.split(',').map(name => name.trim()).filter(name => name) : [];
    
    if (ownerNames.length === 0) {
      // If no base owners, just return base-tagged reports
      return this.getReportsByBaseTag(baseId);
    }

    // Get base-tagged reports
    const baseReports = await db.select().from(reports).where(sql`${reports.baseTags} @> ARRAY[${baseId}]`);
    
    // Get general reports that include any of the base owners in enemy or friendly players
    const playerConditions = ownerNames.map(name => 
      sql`${reports.enemyPlayers} LIKE ${'%' + name + '%'} OR ${reports.friendlyPlayers} LIKE ${'%' + name + '%'}`
    );
    
    const combinedCondition = playerConditions.reduce((acc, condition) => 
      acc ? sql`${acc} OR ${condition}` : condition, null
    );
    
    const playerMatchedReports = await db.select().from(reports).where(
      sql`${reports.type} = 'general' AND (${combinedCondition})`
    );

    // Combine and deduplicate reports by ID
    const allReports = [...baseReports, ...playerMatchedReports];
    const uniqueReports = allReports.filter((report, index, self) => 
      index === self.findIndex(r => r.id === report.id)
    );

    // Sort by creation date (newest first)
    return uniqueReports.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async updateReport(id: number, report: Partial<InsertReport>): Promise<Report> {
    const [updatedReport] = await db
      .update(reports)
      .set(report)
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
  }

  async deleteReport(id: number): Promise<boolean> {
    const result = await db.delete(reports).where(eq(reports.id, id));
    return result.rowCount > 0;
  }

  // Template management methods
  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db
      .insert(reportTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates);
  }

  async getReportTemplateByType(reportType: string): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.reportType, reportType));
    return template || undefined;
  }

  // Premium player management methods
  async createPremiumPlayer(player: InsertPremiumPlayer): Promise<PremiumPlayer> {
    const [newPlayer] = await db
      .insert(premiumPlayers)
      .values(player)
      .returning();
    return newPlayer;
  }

  async getAllPremiumPlayers(): Promise<PremiumPlayer[]> {
    return await db.select().from(premiumPlayers);
  }

  async getPremiumPlayerByName(playerName: string): Promise<PremiumPlayer | undefined> {
    const [player] = await db.select().from(premiumPlayers).where(eq(premiumPlayers.playerName, playerName));
    return player || undefined;
  }

  async deletePremiumPlayer(id: number): Promise<boolean> {
    const result = await db.delete(premiumPlayers).where(eq(premiumPlayers.id, id));
    return result.rowCount > 0;
  }

  // Player base tagging methods
  async createPlayerBaseTag(tag: InsertPlayerBaseTag): Promise<PlayerBaseTag> {
    const [newTag] = await db
      .insert(playerBaseTags)
      .values(tag)
      .returning();
    return newTag;
  }

  async getPlayerBaseTags(playerName: string): Promise<PlayerBaseTag[]> {
    return await db.select().from(playerBaseTags).where(eq(playerBaseTags.playerName, playerName));
  }

  async getBasePlayerTags(baseId: string): Promise<PlayerBaseTag[]> {
    return await db.select().from(playerBaseTags).where(eq(playerBaseTags.baseId, baseId));
  }

  async getAllPlayerBaseTags(): Promise<PlayerBaseTag[]> {
    return await db.select().from(playerBaseTags);
  }

  async deletePlayerBaseTag(id: number): Promise<boolean> {
    const result = await db.delete(playerBaseTags).where(eq(playerBaseTags.id, id));
    return result.rowCount > 0;
  }

  async deletePlayerBaseTagsByBaseId(baseId: string): Promise<boolean> {
    const result = await db.delete(playerBaseTags).where(eq(playerBaseTags.baseId, baseId));
    return result.rowCount > 0;
  }

  // Player profile methods
  async createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile> {
    const [newProfile] = await db
      .insert(playerProfiles)
      .values({
        ...profile,
        updatedAt: new Date()
      })
      .returning();
    return newProfile;
  }

  async getPlayerProfile(playerName: string): Promise<PlayerProfile | undefined> {
    const [profile] = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.playerName, playerName));
    return profile || undefined;
  }

  async updatePlayerProfile(playerName: string, profile: Partial<InsertPlayerProfile>): Promise<PlayerProfile> {
    const [updatedProfile] = await db
      .update(playerProfiles)
      .set({
        ...profile,
        updatedAt: new Date()
      })
      .where(eq(playerProfiles.playerName, playerName))
      .returning();
    return updatedProfile;
  }

  async getAllPlayerProfiles(): Promise<PlayerProfile[]> {
    return await db.select().from(playerProfiles);
  }

  async deletePlayerProfile(playerName: string): Promise<boolean> {
    const result = await db.delete(playerProfiles).where(eq(playerProfiles.playerName, playerName));
    return result.rowCount > 0;
  }

  // Teammate methods
  async addTeammate(playerName: string): Promise<Teammate> {
    const [teammate] = await db
      .insert(teammates)
      .values({ playerName })
      .returning();
    return teammate;
  }

  async removeTeammate(playerName: string): Promise<boolean> {
    const result = await db.delete(teammates).where(eq(teammates.playerName, playerName));
    return result.rowCount > 0;
  }

  async getAllTeammates(): Promise<Teammate[]> {
    return await db.select().from(teammates);
  }

  async isTeammate(playerName: string): Promise<boolean> {
    const [teammate] = await db
      .select()
      .from(teammates)
      .where(eq(teammates.playerName, playerName));
    return !!teammate;
  }

  // Genetic data methods
  async upsertGeneticData(data: InsertGeneticData): Promise<GeneticData> {
    const [result] = await db
      .insert(geneticData)
      .values({
        ...data,
        lastUpdated: new Date()
      })
      .onConflictDoUpdate({
        target: geneticData.plantType,
        set: {
          genes: data.genes,
          progress: data.progress,
          bestGene: data.bestGene,
          lastUpdated: new Date()
        }
      })
      .returning();
    return result;
  }

  async getGeneticData(plantType: string): Promise<GeneticData | undefined> {
    const [result] = await db
      .select()
      .from(geneticData)
      .where(eq(geneticData.plantType, plantType));
    return result || undefined;
  }

  async getAllGeneticData(): Promise<GeneticData[]> {
    return await db.select().from(geneticData);
  }

  async deleteGeneticData(plantType: string): Promise<boolean> {
    const result = await db.delete(geneticData).where(eq(geneticData.plantType, plantType));
    return result.rowCount > 0;
  }

  async clearAllGeneticData(): Promise<boolean> {
    const result = await db.delete(geneticData);
    return result.rowCount > 0;
  }

  // Note: Regular player methods removed - using external API instead
}

export const storage = new DatabaseStorage();
