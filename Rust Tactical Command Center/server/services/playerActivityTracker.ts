
import { db } from '../db.js';
import { 
  playerProfiles, 
  playerActivities, 
  playerSessions, 
  PlayerProfile,
  PlayerActivity, 
  PlayerSession 
} from '../../shared/schema.js';
import { desc, eq, and, isNull, sql, gte } from 'drizzle-orm';

export class PlayerActivityTracker {
  constructor() {
    console.log('🎯 [ProfileTracker] Initialized with team-aware player tracking');
  }

  // Get or create a player profile for a server (team-aware)
  async getOrCreateProfile(serverId: string, playerName: string, playerId?: string): Promise<PlayerProfile> {
    try {
      // First try to find existing profile by name and server
      const existing = await db.select()
        .from(playerProfiles)
        .where(and(
          eq(playerProfiles.serverId, serverId),
          eq(playerProfiles.playerName, playerName)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update battlemetricsId if it's now available and wasn't before
        if (playerId && !existing[0].battlemetricsId) {
          await db.update(playerProfiles)
            .set({ 
              battlemetricsId: playerId,
              updatedAt: new Date()
            })
            .where(eq(playerProfiles.id, existing[0].id));
          
          return { ...existing[0], battlemetricsId: playerId };
        }
        return existing[0];
      }

      // Create new profile using database defaults
      const [newProfile] = await db.insert(playerProfiles)
        .values({
          serverId,
          playerName,
          battlemetricsId: playerId || null,
          isOnline: false,
          totalSessions: 0,
          totalPlayTimeMinutes: 0,
          aliases: '', // Will be populated when team members add aliases
          notes: '', // Team-specific notes
          firstSeenAt: new Date(),
          lastSeenTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`👤 [Profile] Created new profile for ${playerName} on server ${serverId}`);
      return newProfile;
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

      // Start a new session using database defaults
      const [newSession] = await db.insert(playerSessions)
        .values({
          profileId: profile.id,
          serverId,
          playerName,
          battlemetricsId: playerId || null,
          joinTime,
          leaveTime: null,
          durationMinutes: null,
          isActive: true,
          sessionType: 'normal',
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

      // Record activity event using database defaults
      await db.insert(playerActivities)
        .values({
          profileId: profile.id,
          sessionId: newSession.id,
          serverId,
          playerName,
          battlemetricsId: playerId || null,
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
            battlemetricsId: playerId || null,
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

  // Get player profiles for a server, sorted by most recent activity
  async getPlayerProfiles(serverId: string, limit: number = 500): Promise<PlayerProfile[]> {
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
  async getPlayerSessionHistory(profileId: string, limit: number = 50): Promise<PlayerSession[]> {
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

      const profilesByName = new Map<string, PlayerProfile>();
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
          await this.recordPlayerLeave(serverId, profile.playerName, profile.battlemetricsId || undefined);
        }
      }

      console.log(`🔄 [Reconciliation] Completed for server ${serverId}`);
    } catch (error) {
      console.error('❌ [Reconciliation] Error reconciling player state:', error);
    }
  }

  // Get recent activities for display
  async getRecentActivities(serverId: string, limit: number = 100): Promise<PlayerActivity[]> {
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

  // Add team-specific methods for alias tracking
  async addPlayerAlias(playerName: string, serverId: string, newAlias: string): Promise<void> {
    try {
      const profile = await this.getOrCreateProfile(serverId, playerName);
      
      // Get current aliases, add new one if not already present
      const currentAliases = profile.aliases ? profile.aliases.split(',').map(a => a.trim()).filter(a => a) : [];
      
      if (!currentAliases.includes(newAlias) && newAlias !== playerName) {
        currentAliases.push(newAlias);
        const updatedAliases = currentAliases.join(', ');
        
        await db.update(playerProfiles)
          .set({
            aliases: updatedAliases,
            updatedAt: new Date()
          })
          .where(eq(playerProfiles.id, profile.id));
        
        console.log(`🔖 [Alias] Added alias "${newAlias}" for player ${playerName}`);
      }
    } catch (error) {
      console.error('❌ [Alias] Error adding player alias:', error);
    }
  }

  // Update player notes (team-specific)
  async updatePlayerNotes(playerName: string, serverId: string, notes: string): Promise<void> {
    try {
      const profile = await this.getOrCreateProfile(serverId, playerName);
      
      await db.update(playerProfiles)
        .set({
          notes: notes,
          updatedAt: new Date()
        })
        .where(eq(playerProfiles.id, profile.id));
      
      console.log(`📝 [Notes] Updated notes for player ${playerName}`);
    } catch (error) {
      console.error('❌ [Notes] Error updating player notes:', error);
    }
  }

  // Get player by BattleMetrics ID (for name change tracking)
  async getPlayerByBattleMetricsId(serverId: string, battlemetricsId: string): Promise<PlayerProfile | null> {
    try {
      const [profile] = await db.select()
        .from(playerProfiles)
        .where(and(
          eq(playerProfiles.serverId, serverId),
          eq(playerProfiles.battlemetricsId, battlemetricsId)
        ))
        .limit(1);

      return profile || null;
    } catch (error) {
      console.error('❌ [Profile] Error getting player by BattleMetrics ID:', error);
      return null;
    }
  }

  // Legacy methods for compatibility with existing code
  async handlePlayerJoin(playerName: string, battlemetricsId: string, serverId: string): Promise<void> {
    await this.recordPlayerJoin(serverId, playerName, battlemetricsId);
  }

  async handlePlayerLeave(playerName: string, battlemetricsId: string, serverId: string): Promise<void> {
    await this.recordPlayerLeave(serverId, playerName, battlemetricsId);
  }
}

export const playerActivityTracker = new PlayerActivityTracker();
