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

  // BattleMetrics server management
  getAllBattlemetricsServers(): Promise<any[]>;
  addBattlemetricsServer(serverData: any): Promise<any>;
  selectBattlemetricsServer(serverId: string): Promise<boolean>;
  getSelectedBattlemetricsServer(): Promise<any | null>;

  // Player profile management
  getPlayerProfileByBattlemetricsId(battlemetricsId: string): Promise<PlayerProfile | null>;
  getPlayerProfileCount(): Promise<number>;
  updatePlayerProfile(profileId: string, updates: any): Promise<boolean>;

  // Player session management
  createPlayerSession(sessionData: any): Promise<any>;
  endPlayerSession(profileId: string, leaveTime: Date): Promise<boolean>;

  // Note: Regular player data comes from external API, no local storage needed
}

import { db } from "./db";
import { users, reports, reportTemplates, premiumPlayers, playerBaseTags, playerProfiles as playerProfilesTable, teammates, geneticData, battlemetricsServers, playerProfiles, playerSessions } from "@shared/schema";
import { eq, desc, asc, like, and, or, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Using db instance from the imported db module
  private db = db;

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Report management methods
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await this.db
      .insert(reports)
      .values({
        ...report,
        displayId: generateReportDisplayId()
      })
      .returning();
    return newReport;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }

  async getAllReports(): Promise<Report[]> {
    return await this.db.select().from(reports);
  }

  async getReportsByType(type: string): Promise<Report[]> {
    return await this.db.select().from(reports).where(eq(reports.type, type));
  }

  async getReportsByPlayerTag(playerId: string): Promise<Report[]> {
    // Search in playerTags array, enemyPlayers, and friendlyPlayers fields
    const playerReports = await this.db.select().from(reports).where(
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
    const baseReports = await this.db.select().from(reports).where(sql`${reports.baseTags} @> ARRAY[${baseId}]`);
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
    const baseReports = await this.db.select().from(reports).where(sql`${reports.baseTags} @> ARRAY[${baseId}]`);

    // Get general reports that include any of the base owners in enemy or friendly players
    const playerConditions = ownerNames.map(name => 
      sql`${reports.enemyPlayers} LIKE ${'%' + name + '%'} OR ${reports.friendlyPlayers} LIKE ${'%' + name + '%'}`
    );

    const combinedCondition = playerConditions.reduce((acc, condition) => 
      acc ? sql`${acc} OR ${condition}` : condition, null
    );

    const playerMatchedReports = await this.db.select().from(reports).where(
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
    const [updatedReport] = await this.db
      .update(reports)
      .set(report)
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
  }

  async deleteReport(id: number): Promise<boolean> {
    const result = await this.db.delete(reports).where(eq(reports.id, id));
    return result.rowCount > 0;
  }

  // Template management methods
  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await this.db
      .insert(reportTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return await this.db.select().from(reportTemplates);
  }

  async getReportTemplateByType(reportType: string): Promise<ReportTemplate | undefined> {
    const [template] = await this.db.select().from(reportTemplates).where(eq(reportTemplates.reportType, reportType));
    return template || undefined;
  }

  // Premium player management methods
  async createPremiumPlayer(player: InsertPremiumPlayer): Promise<PremiumPlayer> {
    const [newPlayer] = await this.db
      .insert(premiumPlayers)
      .values(player)
      .returning();
    return newPlayer;
  }

  async getAllPremiumPlayers(): Promise<PremiumPlayer[]> {
    return await this.db.select().from(premiumPlayers);
  }

  async getPremiumPlayerByName(playerName: string): Promise<PremiumPlayer | undefined> {
    const [player] = await this.db.select().from(premiumPlayers).where(eq(premiumPlayers.playerName, playerName));
    return player || undefined;
  }

  async deletePremiumPlayer(id: number): Promise<boolean> {
    const result = await this.db.delete(premiumPlayers).where(eq(premiumPlayers.id, id));
    return result.rowCount > 0;
  }

  // Player base tagging methods
  async createPlayerBaseTag(tag: InsertPlayerBaseTag): Promise<PlayerBaseTag> {
    const [newTag] = await this.db
      .insert(playerBaseTags)
      .values(tag)
      .returning();
    return newTag;
  }

  async getPlayerBaseTags(playerName: string): Promise<PlayerBaseTag[]> {
    return await this.db.select().from(playerBaseTags).where(eq(playerBaseTags.playerName, playerName));
  }

  async getBasePlayerTags(baseId: string): Promise<PlayerBaseTag[]> {
    return await this.db.select().from(playerBaseTags).where(eq(playerBaseTags.baseId, baseId));
  }

  async getAllPlayerBaseTags(): Promise<PlayerBaseTag[]> {
    return await this.db.select().from(playerBaseTags);
  }

  async deletePlayerBaseTag(id: number): Promise<boolean> {
    const result = await this.db.delete(playerBaseTags).where(eq(playerBaseTags.id, id));
    return result.rowCount > 0;
  }

  async deletePlayerBaseTagsByBaseId(baseId: string): Promise<boolean> {
    const result = await this.db.delete(playerBaseTags).where(eq(playerBaseTags.baseId, baseId));
    return result.rowCount > 0;
  }

  // Player profile methods
  async createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile> {
    const [newProfile] = await this.db
      .insert(playerProfilesTable)
      .values({
        ...profile,
        updatedAt: new Date()
      })
      .returning();
    return newProfile;
  }

  async getPlayerProfile(playerName: string): Promise<PlayerProfile | undefined> {
    const [profile] = await this.db.select().from(playerProfiles).where(eq(playerProfiles.playerName, playerName));
    return profile;
  }

  async updatePlayerProfile(playerName: string, profile: Partial<InsertPlayerProfile>): Promise<PlayerProfile | undefined> {
    const [updatedProfile] = await this.db
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
    return await this.db.select().from(playerProfiles);
  }

  async deletePlayerProfile(playerName: string): Promise<boolean> {
    const result = await this.db.delete(playerProfilesTable).where(eq(playerProfilesTable.playerName, playerName));
    return result.rowCount > 0;
  }

  // Teammate methods
  async addTeammate(playerName: string): Promise<Teammate> {
    const [teammate] = await this.db
      .insert(teammates)
      .values({ playerName })
      .returning();
    return teammate;
  }

  async removeTeammate(playerName: string): Promise<boolean> {
    const result = await this.db.delete(teammates).where(eq(teammates.playerName, playerName));
    return result.rowCount > 0;
  }

  async getAllTeammates(): Promise<Teammate[]> {
    return await this.db.select().from(teammates);
  }

  async isTeammate(playerName: string): Promise<boolean> {
    const [teammate] = await this.db
      .select()
      .from(teammates)
      .where(eq(teammates.playerName, playerName));
    return !!teammate;
  }

  // Genetic data methods
  async upsertGeneticData(data: InsertGeneticData): Promise<GeneticData> {
    const [result] = await this.db
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
    const [result] = await this.db
      .select()
      .from(geneticData)
      .where(eq(geneticData.plantType, plantType));
    return result || undefined;
  }

  async getAllGeneticData(): Promise<GeneticData[]> {
    return await this.db.select().from(geneticData);
  }

  async deleteGeneticData(plantType: string): Promise<boolean> {
    const result = await this.db.delete(geneticData).where(eq(geneticData.plantType, plantType));
    return result.rowCount > 0;
  }

  async clearAllGeneticData(): Promise<boolean> {
    try {
      await this.db.delete(geneticData);
      console.log("Cleared all genetic data");
      return true;
    } catch (error) {
      console.error("Error clearing genetic data:", error);
      return false;
    }
  }

  // BattleMetrics server management
  async getAllBattlemetricsServers() {
    try {
      return await this.db.select().from(battlemetricsServers).where(eq(battlemetricsServers.isActive, true));
    } catch (error) {
      console.error("Error getting BattleMetrics servers:", error);
      return [];
    }
  }

  async addBattlemetricsServer(serverData: any) {
    try {
      const [server] = await this.db.insert(battlemetricsServers).values(serverData).returning();
      return server;
    } catch (error) {
      console.error("Error adding BattleMetrics server:", error);
      throw error;
    }
  }

  async selectBattlemetricsServer(serverId: string) {
    try {
      // First, unselect all servers
      await this.db.update(battlemetricsServers).set({ isSelected: false });

      // Then select the specified server
      await this.db.update(battlemetricsServers)
        .set({ isSelected: true, lastChecked: new Date() })
        .where(eq(battlemetricsServers.id, serverId));

      return true;
    } catch (error) {
      console.error("Error selecting BattleMetrics server:", error);
      return false;
    }
  }

  async getSelectedBattlemetricsServer() {
    try {
      const [server] = await this.db.select()
        .from(battlemetricsServers)
        .where(eq(battlemetricsServers.isSelected, true))
        .limit(1);
      return server || null;
    } catch (error) {
      console.error("Error getting selected server:", error);
      return null;
    }
  }

  // Player profile management
  async getAllPlayerProfiles() {
    try {
      return await this.db.select().from(playerProfiles);
    } catch (error) {
      console.error("Error getting player profiles:", error);
      return [];
    }
  }

  async getPlayerProfileByBattlemetricsId(battlemetricsId: string) {
    try {
      const [profile] = await this.db.select()
        .from(playerProfiles)
        .where(eq(playerProfiles.battlemetricsId, battlemetricsId))
        .limit(1);
      return profile || null;
    } catch (error) {
      console.error("Error getting player profile:", error);
      return null;
    }
  }

  async getPlayerProfileCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql`count(*)` }).from(playerProfiles);
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error getting player profile count:", error);
      return 0;
    }
  }

  async createPlayerProfile(profileData: any) {
    try {
      const [profile] = await this.db.insert(playerProfiles).values(profileData).returning();
      return profile;
    } catch (error) {
      console.error("Error creating player profile:", error);
      throw error;
    }
  }

  async updatePlayerProfile(profileId: string, updates: any) {
    try {
      await this.db.update(playerProfiles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(playerProfiles.id, profileId));
      return true;
    } catch (error) {
      console.error("Error updating player profile:", error);
      return false;
    }
  }

  // Player session management
  async createPlayerSession(sessionData: any) {
    try {
      const [session] = await this.db.insert(playerSessions).values(sessionData).returning();
      return session;
    } catch (error) {
      console.error("Error creating player session:", error);
      throw error;
    }
  }

  async endPlayerSession(profileId: string, leaveTime: Date) {
    try {
      // Find active session for this profile
      const [activeSession] = await this.db.select()
        .from(playerSessions)
        .where(and(eq(playerSessions.profileId, profileId), eq(playerSessions.isActive, true)))
        .limit(1);

      if (activeSession) {
        const joinTime = new Date(activeSession.joinTime);
        const durationMinutes = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 60000);

        await this.db.update(playerSessions)
          .set({
            leaveTime,
            durationMinutes,
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(playerSessions.id, activeSession.id));

        // Update total play time in profile
        await this.db.update(playerProfiles)
          .set({
            totalPlayTimeMinutes: sql`${playerProfiles.totalPlayTimeMinutes} + ${durationMinutes}`,
            updatedAt: new Date(),
          })
          .where(eq(playerProfiles.id, profileId));
      }

      return true;
    } catch (error) {
      console.error("Error ending player session:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();