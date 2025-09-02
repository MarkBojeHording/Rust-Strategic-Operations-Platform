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

        // Update profile status and add session time to total
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

        console.log(`🔴 [Leave] ${playerName} left server ${serverId} (${durationMinutes} min session)`);
      } else {
        console.log(`⚠️ [Leave] No active session found for ${playerName}, updating profile only`);
        
        // Update profile status anyway
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

  // Get player profiles for a server, sorted by most recent activity (prioritizing updates)
  async getPlayerProfiles(serverId: string, limit: number = 500): Promise<DBPlayerProfile[]> {
    try {
      const profiles = await db.select()
        .from(playerProfiles)
        .where(eq(playerProfiles.serverId, serverId))
        .orderBy(desc(playerProfiles.updatedAt), desc(playerProfiles.lastSeenTime))
        .limit(limit);

      console.log(`👥 [Profiles] Retrieved ${profiles.length} profiles for server ${serverId}`);
      return profiles;
    } catch (error) {
      console.error('❌ [Profiles] Error getting player profiles:', error);
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

      console.log(`📜 [Sessions] Retrieved ${sessions.length} sessions for profile ${profileId}`);
      return sessions;
    } catch (error) {
      console.error('❌ [Sessions] Error getting session history:', error);
      return [];
    }
  }

  // Reconcile current online players with profiles to detect missed events
  async reconcilePlayerState(serverId: string, currentPlayers: any[]): Promise<void> {
    try {
      console.log(`🔄 [Reconciliation] Starting for server ${serverId} with ${currentPlayers.length} online players`);
      
      // Get all profiles for this server
      const allProfiles = await db.select()
        .from(playerProfiles)
        .where(eq(playerProfiles.serverId, serverId));

      const profilesByName = new Map<string, DBPlayerProfile>();
      for (const profile of allProfiles) {
        profilesByName.set(profile.playerName, profile);
      }

      const currentPlayerNames = new Set(currentPlayers.map(p => p.name));

      // Check for players who should be online but aren't in our records
      for (const player of currentPlayers) {
        const profile = profilesByName.get(player.name);
        if (!profile || !profile.isOnline) {
          console.log(`🆕 [Reconciliation] Found new/rejoined player: ${player.name} (missed join event)`);
          await this.recordPlayerJoin(serverId, player.name, player.id);
        }
      }

      // Check for players who should be offline but are marked as online
      for (const profile of allProfiles) {
        if (profile.isOnline && !currentPlayerNames.has(profile.playerName)) {
          console.log(`👋 [Reconciliation] Found departed player: ${profile.playerName} (missed leave event)`);
          await this.recordPlayerLeave(serverId, profile.playerName, profile.playerId || undefined);
        }
      }

      console.log(`🔄 [Reconciliation] Completed for server ${serverId}`);
    } catch (error) {
      console.error('❌ [Reconciliation] Error reconciling player state:', error);
    }
  }

  // Get recent activities for display
  async getRecentActivities(serverId: string, limit: number = 100): Promise<DBPlayerActivity[]> {
    try {
      const activities = await db.select()
        .from(playerActivities)
        .where(eq(playerActivities.serverId, serverId))
        .orderBy(desc(playerActivities.timestamp))
        .limit(limit);

      console.log(`🔍 [Activities] Retrieved ${activities.length} activities for server ${serverId}`);
      return activities;
    } catch (error) {
      console.error('❌ [Activities] Error getting activities:', error);
      return [];
    }
  }

  // Get premium player count (players not visible in public API)
  async getPremiumPlayerCount(serverId: string, totalPlayerCount: number, visiblePlayerCount: number): Promise<number> {
    try {
      // Basic calculation: total players minus visible players
      const basePremiumCount = Math.max(0, totalPlayerCount - visiblePlayerCount);
      
      // Get recent "A player" activities to adjust count
      const recentActivities = await db.select()
        .from(playerActivities)
        .where(and(
          eq(playerActivities.serverId, serverId),
          eq(playerActivities.playerName, "A player"),
          gte(playerActivities.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        ))
        .orderBy(desc(playerActivities.timestamp));

      // Count recent joins minus recent leaves for "A player"
      let aPlayerCount = 0;
      for (const activity of recentActivities) {
        if (activity.action === 'joined') aPlayerCount++;
        else if (activity.action === 'left') aPlayerCount--;
      }

      const finalCount = Math.max(basePremiumCount, aPlayerCount);
      console.log(`👻 [Premium] Server ${serverId}: Base=${basePremiumCount}, APlayer=${aPlayerCount}, Final=${finalCount}`);
      
      return finalCount;
    } catch (error) {
      console.error('❌ [Premium] Error calculating premium count:', error);
      return Math.max(0, totalPlayerCount - visiblePlayerCount);
    }
  }

  // Clean up old activities and sessions (maintenance function)
  async cleanup(olderThanDays: number = 30): Promise<{ activities: number; sessions: number }> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      // Delete old activities
      const deletedActivities = await db.delete(playerActivities)
        .where(gte(playerActivities.timestamp, cutoffDate));

      // Delete old completed sessions
      const deletedSessions = await db.delete(playerSessions)
        .where(and(
          eq(playerSessions.isActive, false),
          gte(playerSessions.joinTime, cutoffDate)
        ));

      console.log(`🧹 [Cleanup] Removed ${deletedActivities.rowCount || 0} activities and ${deletedSessions.rowCount || 0} sessions older than ${olderThanDays} days`);
      
      return {
        activities: deletedActivities.rowCount || 0,
        sessions: deletedSessions.rowCount || 0
      };
    } catch (error) {
      console.error('❌ [Cleanup] Error during cleanup:', error);
      return { activities: 0, sessions: 0 };
    }
  }
}