import { db } from "../db";
import { maps, servers } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertDBMap, DBMap } from "../../shared/schema";

export class MapStorageService {
  
  // Store a map image in the database
  async storeMapImage(data: {
    serverId: string;
    mapName?: string;
    seed?: string;
    size?: number;
    imageUrl: string;
    imageData: string; // Base64 encoded image data
  }): Promise<DBMap> {
    // First, check if ANY map already exists for this server (regardless of seed)
    const existingMap = await this.getLatestMapForServer(data.serverId);
    
    if (existingMap) {
      // Replace the existing map with the new one
      const [updated] = await db
        .update(maps)
        .set({
          mapName: data.mapName || existingMap.mapName,
          seed: data.seed, // Update seed as it may have changed
          size: data.size || existingMap.size,
          imageUrl: data.imageUrl,
          imageData: data.imageData,
          fetchedAt: new Date(),
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(maps.id, existingMap.id))
        .returning();
      
      console.log(`Replaced existing map for server ${data.serverId}, old seed: ${existingMap.seed}, new seed: ${data.seed}`);
      return updated;
    } else {
      // Insert new map (first map for this server)
      const [newMap] = await db
        .insert(maps)
        .values({
          serverId: data.serverId,
          mapName: data.mapName,
          seed: data.seed,
          size: data.size,
          imageUrl: data.imageUrl,
          imageData: data.imageData,
          fetchedAt: new Date(),
          lastUsed: new Date()
        })
        .returning();
      
      console.log(`Stored first map for server ${data.serverId}, seed ${data.seed}`);
      return newMap;
    }
  }

  // Get map by server ID and seed
  async getMapByServerAndSeed(serverId: string, seed?: string): Promise<DBMap | null> {
    if (!seed) return null;
    
    const [map] = await db
      .select()
      .from(maps)
      .where(and(
        eq(maps.serverId, serverId),
        eq(maps.seed, seed)
      ))
      .orderBy(desc(maps.fetchedAt))
      .limit(1);
    
    if (map) {
      // Update last used timestamp
      await db
        .update(maps)
        .set({ lastUsed: new Date() })
        .where(eq(maps.id, map.id));
    }
    
    return map || null;
  }

  // Get latest map for a server (regardless of seed) - don't update lastUsed in this internal method
  async getLatestMapForServer(serverId: string): Promise<DBMap | null> {
    try {
      console.log(`Checking for maps for server: ${serverId}`);
      const [map] = await db
        .select()
        .from(maps)
        .where(eq(maps.serverId, serverId))
        .orderBy(desc(maps.fetchedAt))
        .limit(1);
      
      console.log(`Map found for server ${serverId}:`, map ? 'YES' : 'NO');
      if (map) {
        console.log(`Map details: id=${map.id}, seed=${map.seed}, fetchedAt=${map.fetchedAt}`);
      }
      
      return map || null;
    } catch (error) {
      console.error(`Error checking map for server ${serverId}:`, error);
      return null;
    }
  }

  // Get latest map for a server and mark as used (for external API calls)
  async getLatestMapForServerAndMarkUsed(serverId: string): Promise<DBMap | null> {
    const map = await this.getLatestMapForServer(serverId);
    
    if (map) {
      // Update last used timestamp
      await db
        .update(maps)
        .set({ lastUsed: new Date() })
        .where(eq(maps.id, map.id));
    }
    
    return map;
  }

  // Get all maps for a server
  async getServerMaps(serverId: string): Promise<DBMap[]> {
    return await db
      .select()
      .from(maps)
      .where(eq(maps.serverId, serverId))
      .orderBy(desc(maps.fetchedAt));
  }

  // Delete old maps (keep only the latest 1 map per server to save space)
  async cleanupOldMaps(serverId: string, keepCount = 1): Promise<void> {
    const allMaps = await this.getServerMaps(serverId);
    
    if (allMaps.length > keepCount) {
      const toDelete = allMaps.slice(keepCount);
      
      for (const map of toDelete) {
        await db.delete(maps).where(eq(maps.id, map.id));
      }
      
      console.log(`Cleaned up ${toDelete.length} old maps for server ${serverId}, keeping only latest map`);
    }
  }

  // Global cleanup to ensure only 1 map per server across all servers
  async globalMapCleanup(): Promise<void> {
    try {
      const allMaps = await db.select().from(maps);
      const serverMapCounts = new Map<string, number>();
      
      // Count maps per server
      for (const map of allMaps) {
        serverMapCounts.set(map.serverId, (serverMapCounts.get(map.serverId) || 0) + 1);
      }
      
      let totalCleaned = 0;
      
      // Cleanup each server that has more than 1 map
      for (const [serverId, count] of Array.from(serverMapCounts.entries())) {
        if (count > 1) {
          await this.cleanupOldMaps(serverId, 1);
          totalCleaned += (count - 1);
        }
      }
      
      if (totalCleaned > 0) {
        console.log(`Global cleanup complete: removed ${totalCleaned} old maps across all servers`);
      } else {
        console.log('Global cleanup complete: no old maps to remove');
      }
    } catch (error) {
      console.error('Error during global map cleanup:', error);
    }
  }

  // Check if a map exists and is recent (within last 30 days by default)
  async isMapFresh(serverId: string, seed?: string, maxAgeDays = 30): Promise<boolean> {
    const map = await this.getMapByServerAndSeed(serverId, seed);
    
    if (!map) return false;
    
    const maxAge = new Date();
    maxAge.setDate(maxAge.getDate() - maxAgeDays);
    
    return new Date(map.fetchedAt) > maxAge;
  }

  // Get map statistics
  async getMapStats(serverId?: string) {
    if (serverId) {
      const serverMaps = await this.getServerMaps(serverId);
      return {
        totalMaps: serverMaps.length,
        latestFetch: serverMaps[0]?.fetchedAt,
        oldestFetch: serverMaps[serverMaps.length - 1]?.fetchedAt
      };
    } else {
      const allMaps = await db.select().from(maps);
      return {
        totalMaps: allMaps.length,
        totalServers: new Set(allMaps.map(m => m.serverId)).size
      };
    }
  }
}

export const mapStorageService = new MapStorageService();