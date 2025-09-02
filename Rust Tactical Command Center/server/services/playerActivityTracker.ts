
import { storage } from '../storage';

export interface PlayerSession {
  id: string;
  playerName: string;
  battlemetricsId: string;
  serverId: string;
  joinTime: string;
  leaveTime?: string;
  durationMinutes?: number;
  isActive: boolean;
}

export interface PlayerProfile {
  id: string;
  playerName: string;
  battlemetricsId: string;
  serverId: string;
  isOnline: boolean;
  currentSessionStart?: string;
  lastJoinTime?: string;
  lastLeaveTime?: string;
  lastSeenTime: string;
  totalSessions: number;
  totalPlayTimeMinutes: number;
  firstSeenAt: string;
  aliases: string[];
}

export class PlayerActivityTracker {
  private activeServer: string | null = null;

  setActiveServer(serverId: string) {
    this.activeServer = serverId;
    console.log(`Player tracking now active for server: ${serverId}`);
  }

  getActiveServer(): string | null {
    return this.activeServer;
  }

  async handlePlayerJoin(playerName: string, battlemetricsId: string, serverId: string): Promise<void> {
    if (!this.activeServer || serverId !== this.activeServer) {
      return; // Only track active server
    }

    try {
      // Get or create player profile
      let profile = await this.getPlayerProfile(battlemetricsId, serverId);
      
      if (!profile) {
        profile = await this.createPlayerProfile(playerName, battlemetricsId, serverId);
      } else {
        // Update profile with potential name change
        await this.updatePlayerProfile(profile.id, {
          playerName: playerName,
          isOnline: true,
          currentSessionStart: new Date().toISOString(),
          lastJoinTime: new Date().toISOString(),
          lastSeenTime: new Date().toISOString(),
        });

        // Track alias if name changed
        if (profile.playerName !== playerName && !profile.aliases.includes(profile.playerName)) {
          const updatedAliases = [...profile.aliases, profile.playerName];
          await this.updatePlayerProfile(profile.id, { aliases: updatedAliases });
        }
      }

      // Start new session
      await this.startPlayerSession(profile.id, playerName, battlemetricsId, serverId);
      
      console.log(`Player joined: ${playerName} (${battlemetricsId})`);
    } catch (error) {
      console.error('Error handling player join:', error);
    }
  }

  async handlePlayerLeave(playerName: string, battlemetricsId: string, serverId: string): Promise<void> {
    if (!this.activeServer || serverId !== this.activeServer) {
      return;
    }

    try {
      const profile = await this.getPlayerProfile(battlemetricsId, serverId);
      if (!profile) {
        console.warn(`No profile found for leaving player: ${playerName}`);
        return;
      }

      const leaveTime = new Date();
      
      // Update profile
      await this.updatePlayerProfile(profile.id, {
        isOnline: false,
        currentSessionStart: undefined,
        lastLeaveTime: leaveTime.toISOString(),
        lastSeenTime: leaveTime.toISOString(),
      });

      // End active session
      await this.endPlayerSession(profile.id, leaveTime);

      console.log(`Player left: ${playerName} (${battlemetricsId})`);
    } catch (error) {
      console.error('Error handling player leave:', error);
    }
  }

  private async getPlayerProfile(battlemetricsId: string, serverId: string): Promise<PlayerProfile | null> {
    // This would integrate with your existing storage system
    // For now, return null - you'll need to implement this in storage.ts
    return null;
  }

  private async createPlayerProfile(playerName: string, battlemetricsId: string, serverId: string): Promise<PlayerProfile> {
    const now = new Date().toISOString();
    const profile: PlayerProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerName,
      battlemetricsId,
      serverId,
      isOnline: true,
      currentSessionStart: now,
      lastJoinTime: now,
      lastSeenTime: now,
      totalSessions: 1,
      totalPlayTimeMinutes: 0,
      firstSeenAt: now,
      aliases: [],
    };

    // You'll need to implement this in storage.ts
    console.log('Would create player profile:', profile);
    return profile;
  }

  private async updatePlayerProfile(profileId: string, updates: Partial<PlayerProfile>): Promise<void> {
    // You'll need to implement this in storage.ts
    console.log('Would update player profile:', profileId, updates);
  }

  private async startPlayerSession(profileId: string, playerName: string, battlemetricsId: string, serverId: string): Promise<void> {
    const session: PlayerSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerName,
      battlemetricsId,
      serverId,
      joinTime: new Date().toISOString(),
      isActive: true,
    };

    // You'll need to implement this in storage.ts
    console.log('Would start player session:', session);
  }

  private async endPlayerSession(profileId: string, leaveTime: Date): Promise<void> {
    // You'll need to implement this in storage.ts
    console.log('Would end player session for profile:', profileId, 'at', leaveTime);
  }
}

export const playerActivityTracker = new PlayerActivityTracker();
