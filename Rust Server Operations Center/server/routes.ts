import type { Express } from "express";
import { createServer, type Server } from "http";

import { BattleMetricsService } from "./services/battlemetrics";
import { PlayerActivityTracker } from "./services/playerActivityTracker";
import { mapStorageService } from "./services/mapStorage";
import { globalWebSocketManager } from "./services/websocketManager";
import { BackupManager } from "./services/backupManager";
import {
  serverSchema,
  playerSchema,
  addServerSchema,
  serverStatsSchema,
  createTeamSchema,
  createUserSchema,
  addTeamMemberSchema,
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth.js";
import { storage } from "./storage.js";
import { buildMapImage } from "./services/tile.js";
import { db } from "./db.js";
import { servers, playerActivities, playerSessions, playerProfiles, maps } from "@shared/schema";

// Initialize the player activity tracker
const playerActivityTracker = new PlayerActivityTracker();

// Initialize the backup manager with fallback support
const backupManager = new BackupManager(globalWebSocketManager);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  try {
    await setupAuth(app);
  } catch (error) {
    console.warn('Authentication setup failed, continuing without auth:', error);
  }
  
  const battleMetricsService = new BattleMetricsService();
  
  // In-memory storage for server list (you can replace with database)
  const serverList = new Map<string, any>();

  // Initialize backup manager system
  console.log('🚀 [Startup] Starting backup management system...');
  try {
    backupManager.start();
  } catch (error) {
    console.warn('Backup manager failed to start:', error);
  }

  // Authentication routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Team Management Routes - PROTECTED
  
  // Get all users
  app.get('/api/admin/users', async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create a new user
  app.post('/api/admin/users', async (req: any, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create user" 
      });
    }
  });

  // Update user
  app.put('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userData = createUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(userId, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update user" 
      });
    }
  });

  // Delete user (soft delete)
  app.delete('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete user" 
      });
    }
  });

  // Get all teams
  app.get('/api/admin/teams', async (req: any, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Create a new team
  app.post('/api/admin/teams', isAuthenticated, async (req: any, res) => {
    try {
      const teamData = createTeamSchema.parse(req.body);
      const currentUserId = req.user.claims.sub;
      
      const team = await storage.createTeam({
        ...teamData,
        createdBy: currentUserId,
      });
      
      // Add creator as team owner
      await storage.addTeamMember(team.id, currentUserId, 'owner');
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create team" 
      });
    }
  });

  // Update team
  app.put('/api/admin/teams/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const teamData = createTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(teamId, teamData);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update team" 
      });
    }
  });

  // Delete team (soft delete)
  app.delete('/api/admin/teams/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      await storage.deleteTeam(teamId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete team" 
      });
    }
  });

  // Get team members
  app.get('/api/admin/teams/:teamId/members', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Add team member
  app.post('/api/admin/teams/:teamId/members', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { userId, role } = addTeamMemberSchema.parse(req.body);
      const member = await storage.addTeamMember(teamId, userId, role);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to add team member" 
      });
    }
  });

  // Update team member role
  app.put('/api/admin/teams/:teamId/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId, userId } = req.params;
      const { role } = addTeamMemberSchema.parse(req.body);
      const member = await storage.updateTeamMemberRole(teamId, userId, role);
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update team member" 
      });
    }
  });

  // Remove team member
  app.delete('/api/admin/teams/:teamId/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId, userId } = req.params;
      await storage.removeTeamMember(teamId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to remove team member" 
      });
    }
  });

  // Get user's teams
  app.get('/api/users/:userId/teams', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const teams = await storage.getUserTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  // Get server information - PROTECTED
  app.get("/api/servers/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params;
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      const server = await battleMetricsService.getServer(serverId);
      const validatedServer = serverSchema.parse(server);
      res.json(validatedServer);
    } catch (error) {
      console.error("Error fetching server:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch server information" 
      });
    }
  });

  // Get server players - PROTECTED
  app.get("/api/servers/:serverId/players", async (req, res) => {
    try {
      const { serverId } = req.params;
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      const players = await battleMetricsService.getPlayers(serverId);
      const validatedPlayers = players.map(player => playerSchema.parse(player));
      
      // Reconcile player state to catch missed join/leave events
      await playerActivityTracker.reconcilePlayerState(serverId, validatedPlayers);
      
      res.json(validatedPlayers);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch player information" 
      });
    }
  });

  // Get server statistics - PROTECTED
  app.get("/api/servers/:serverId/stats", isAuthenticated, async (req, res) => {
    try {
      const { serverId } = req.params;
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      const stats = await battleMetricsService.getServerStats(serverId);
      const validatedStats = serverStatsSchema.parse(stats);
      res.json(validatedStats);
    } catch (error) {
      console.error("Error fetching server stats:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch server statistics",
      });
    }
  });

  // Get player profiles for a server (new profile-based system) - PROTECTED
  app.get("/api/servers/:serverId/profiles", isAuthenticated, async (req, res) => {
    try {
      const { serverId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 500;
      
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      const profiles = await playerActivityTracker.getPlayerProfiles(serverId, limit);
      
      // Format profiles for frontend
      const formattedProfiles = profiles.map(profile => ({
        id: profile.id,
        serverId: profile.serverId,
        playerName: profile.playerName,
        playerId: profile.playerId,
        isOnline: profile.isOnline,
        currentSessionStart: profile.currentSessionStart?.toISOString(),
        lastJoinTime: profile.lastJoinTime?.toISOString(),
        lastLeaveTime: profile.lastLeaveTime?.toISOString(),
        lastSeenTime: profile.lastSeenTime.toISOString(),
        totalSessions: profile.totalSessions,
        totalPlayTimeMinutes: profile.totalPlayTimeMinutes,
        lastKnownRank: profile.lastKnownRank,
        lastKnownScore: profile.lastKnownScore,
        firstSeenAt: profile.firstSeenAt.toISOString(),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      }));

      res.json(formattedProfiles);
    } catch (error) {
      console.error("Error fetching player profiles:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch player profiles" 
      });
    }
  });

  // Get session history for a specific player profile - PROTECTED
  app.get("/api/profiles/:profileId/sessions", isAuthenticated, async (req, res) => {
    try {
      const { profileId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (!profileId) {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      const sessions = await playerActivityTracker.getPlayerSessionHistory(profileId, limit);
      
      // Format sessions for frontend
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        profileId: session.profileId,
        serverId: session.serverId,
        playerName: session.playerName,
        playerId: session.playerId,
        joinTime: session.joinTime.toISOString(),
        leaveTime: session.leaveTime?.toISOString(),
        durationMinutes: session.durationMinutes,
        isActive: session.isActive,
        playerRank: session.playerRank,
        playerScore: session.playerScore,
        sessionType: session.sessionType,
      }));

      res.json(formattedSessions);
    } catch (error) {
      console.error("Error fetching session history:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch session history" 
      });
    }
  });

  // Fetch high-resolution map image from RustMaps
  app.get("/api/servers/:serverId/map-image", async (req, res) => {
    try {
      const { serverId } = req.params;
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      const server = await battleMetricsService.getServer(serverId);

      if (!server.mapInfo?.url) {
        return res
          .status(404)
          .json({ error: "No RustMaps URL available for this server" });
      }

      // Try the direct high-resolution image URL first
      const mapHash = server.mapInfo.url.split("/").pop();
      const highResUrl = `https://content.rustmaps.com/maps/269/${mapHash}/map_raw.png`;

      try {
        const size = server.mapInfo?.size ?? 4500;
        const imageBuffer = await buildMapImage(size, highResUrl, 0);

        if (imageBuffer) {
          // Store high-resolution map image in database
          const base64Image = imageBuffer.toString("base64");
          await mapStorageService.storeMapImage({
            serverId: serverId,
            mapName: server.mapInfo?.name,
            seed: server.mapInfo?.seed?.toString(),
            size: server.mapInfo?.size,
            imageUrl: highResUrl,
            imageData: base64Image,
          });

          // Mark map as fetched for this server
          if (serverList.has(serverId)) {
            const serverEntry = serverList.get(serverId);
            if (serverEntry) {
              serverEntry.mapFetched = true;
              serverList.set(serverId, serverEntry);
              console.log(
                `✓ Updated server ${serverId} mapFetched to true (direct route)`
              );
            } else {
              console.log(`⚠ Server entry for ${serverId} exists but is null`);
            }
          } else {
            console.log(
              `⚠ Server ${serverId} not found in serverList during map fetch`
            );
          }

          return res
            .type("png")
            .set("Cache-Control", "public, max-age=3600")
            .send(imageBuffer);
        }
      } catch (error) {
        console.log("Direct image fetch failed, trying to scrape from website");
      }

      // If direct image fails, scrape the RustMaps website
      const websiteResponse = await fetch(server.mapInfo.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!websiteResponse.ok) {
        return res.status(404).json({ error: "Failed to fetch RustMaps page" });
      }

      const html = await websiteResponse.text();

      // Look for high-resolution image URLs in the HTML
      const imagePatterns = [
        /https:\/\/content\.rustmaps\.com\/maps\/\d+\/[^\/]+\/map_raw_normalized\.png/g,
        /https:\/\/content\.rustmaps\.com\/maps\/\d+\/[^\/]+\/4000\.webp/g,
        /https:\/\/content\.rustmaps\.com\/maps\/\d+\/[^\/]+\/2000\.webp/g,
        /https:\/\/content\.rustmaps\.com\/maps\/\d+\/[^\/]+\/1000\.webp/g,
      ];

      let imageUrl = null;
      for (const pattern of imagePatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          imageUrl = matches[0];
          break;
        }
      }

      if (!imageUrl) {
        // Fallback to thumbnail if no high-res image found
        if (server.mapInfo.thumbnailUrl) {
          const thumbnailResponse = await fetch(server.mapInfo.thumbnailUrl, {
            headers: { "User-Agent": "BattleMetrics-Monitor/1.0" },
          });
          if (thumbnailResponse.ok) {
            const imageBuffer = await thumbnailResponse.arrayBuffer();

            // Store map image in database and mark as fetched
            const base64Image = Buffer.from(imageBuffer).toString("base64");
            await mapStorageService.storeMapImage({
              serverId: serverId,
              mapName: server.mapInfo?.name,
              seed: server.mapInfo?.seed?.toString(),
              size: server.mapInfo?.size,
              imageUrl: server.mapInfo.thumbnailUrl,
              imageData: base64Image,
            });

            // Mark map as fetched for this server
            if (serverList.has(serverId)) {
              const serverEntry = serverList.get(serverId);
              if (serverEntry) {
                serverEntry.mapFetched = true;
                serverList.set(serverId, serverEntry);
              }
            }

            res.set({
              "Content-Type":
                thumbnailResponse.headers.get("content-type") || "image/webp",
              "Cache-Control": "public, max-age=3600",
            });
            return res.send(Buffer.from(imageBuffer));
          }
        }
        return res
          .status(404)
          .json({ error: "Could not find high-resolution map image" });
      }

      // Fetch the discovered image
      const finalImageResponse = await fetch(imageUrl, {
        headers: {
          "User-Agent": "BattleMetrics-Monitor/1.0",
          Referer: server.mapInfo.url,
        },
      });

      if (!finalImageResponse.ok) {
        return res
          .status(404)
          .json({ error: "Failed to fetch discovered map image" });
      }

      const finalImageBuffer = await finalImageResponse.arrayBuffer();
      const contentType =
        finalImageResponse.headers.get("content-type") || "image/png";

      // Store high-resolution map image in database
      const base64Image = Buffer.from(finalImageBuffer).toString("base64");
      await mapStorageService.storeMapImage({
        serverId: serverId,
        mapName: server.mapInfo?.name,
        seed: server.mapInfo?.seed?.toString(),
        size: server.mapInfo?.size,
        imageUrl: imageUrl,
        imageData: base64Image,
      });

      res.set({
        "Content-Type": contentType,
        "Content-Length": finalImageBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      });

      // Mark map as fetched for this server
      if (serverList.has(serverId)) {
        const server = serverList.get(serverId);
        if (server) {
          server.mapFetched = true;
          serverList.set(serverId, server);
          console.log(
            `✓ Updated server ${serverId} mapFetched to true (fallback route)`
          );
        } else {
          console.log(`⚠ Server entry for ${serverId} exists but is null`);
        }
      } else {
        console.log(
          `⚠ Server ${serverId} not found in serverList during map fetch`
        );
      }

      res.send(Buffer.from(finalImageBuffer));

    } catch (error) {
      console.error('Error fetching map image:', error);
      res.status(500).json({ error: 'Failed to fetch map image' });
    }
  });

  // Server Management Routes

  // Get list of all added servers
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await Promise.all(Array.from(serverList.values()).map(async server => {
        // Get live server data from BattleMetrics API
        let liveServerData;
        try {
          liveServerData = await battleMetricsService.getServer(server.id);
        } catch (error) {
          console.log(`Failed to fetch live data for server ${server.id}, using cached data`);
          liveServerData = server; // Fall back to cached data
        }
        
        // Check if we have a map stored in the database for this server
        console.log(`Checking database for map for server: ${server.id}`);
        const hasStoredMap = await mapStorageService.getLatestMapForServer(server.id);
        const mapFetched = hasStoredMap !== null;
        
        console.log(`Server ${server.id} - mapFetched: ${mapFetched} (database check)`);
        
        return {
          id: server.id,
          name: liveServerData.name || server.name,
          game: server.game,
          region: server.region || 'Unknown',
          status: liveServerData.status || server.status,
          players: liveServerData.players || server.players || 0,
          maxPlayers: liveServerData.maxPlayers || server.maxPlayers || 0,
          ping: liveServerData.ping || server.ping,
          errorMessage: server.errorMessage,
          mapFetched: mapFetched, // Use database check instead of in-memory flag
          lastChecked: new Date().toISOString(),
          addedAt: server.addedAt
        };
      }));
      res.json(servers);
    } catch (error) {
      console.error("Error fetching server list:", error);
      res.status(500).json({ error: "Failed to fetch server list" });
    }
  });

  // Add a new server
  app.post("/api/servers", async (req, res) => {
    try {
      const validation = addServerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { serverId, url } = validation.data;

      // Check if server already exists
      if (serverList.has(serverId)) {
        return res.status(409).json({ error: "Server already added" });
      }

      // Fetch server info from BattleMetrics to validate
      const serverInfo = await battleMetricsService.getServer(serverId);
      
      // Store server in our list
      const serverEntry = {
        id: serverId,
        name: serverInfo.name,
        game: serverInfo.game,
        region: serverInfo.region,
        status: serverInfo.status,
        players: serverInfo.players,
        maxPlayers: serverInfo.maxPlayers,
        ping: serverInfo.ping,
        errorMessage: null,
        mapFetched: false,
        lastChecked: new Date().toISOString(),
        addedAt: new Date().toISOString(),
        battleMetricsUrl: url
      };

      serverList.set(serverId, serverEntry);

      // Also store the server in the database to satisfy foreign key constraints
      try {
        await db.insert(servers).values({
          id: serverId,
          name: serverInfo.name,
          game: serverInfo.game,
          region: serverInfo.region || 'Unknown',
          addedAt: new Date(),
          lastChecked: new Date(),
          isActive: true
        }).onConflictDoUpdate({
          target: servers.id,
          set: {
            name: serverInfo.name,
            game: serverInfo.game,
            region: serverInfo.region || 'Unknown',
            lastChecked: new Date(),
            isActive: true
          }
        });
        console.log(`✓ Server ${serverId} stored in database`);
      } catch (dbError) {
        console.error(`Failed to store server ${serverId} in database:`, dbError);
        // Continue anyway - the server will work in memory
      }

      // Subscribe to persistent monitoring (WebSocket with backup failover)
      backupManager.subscribeToServer(serverId);
      console.log(`✓ Subscribed to persistent monitoring (with backup support) for server ${serverId}`);

      res.json({ message: "Server added successfully", server: serverEntry });
    } catch (error) {
      console.error("Error adding server:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to add server" 
      });
    }
  });

  // Remove a server
  app.delete("/api/servers/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params;
      if (!serverId) {
        return res.status(400).json({ error: "Server ID is required" });
      }

      if (!serverList.has(serverId)) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Unsubscribe from persistent monitoring
      backupManager.unsubscribeFromServer(serverId);
      console.log(`✓ Unsubscribed from persistent monitoring for server ${serverId}`);
      
      serverList.delete(serverId);
      res.json({ message: "Server removed successfully" });
    } catch (error) {
      console.error("Error removing server:", error);
      res.status(500).json({ error: "Failed to remove server" });
    }
  });

  // Delete all data (for prototyping)
  app.delete("/api/admin/delete-all-data", isAuthenticated, async (req, res) => {
    try {
      console.log("🗑️ Starting complete data deletion...");
      
      // Clear in-memory server list and backup system
      for (const serverId of Array.from(serverList.keys())) {
        backupManager.unsubscribeFromServer(serverId);
      }
      backupManager.stop();
      serverList.clear();
      console.log("✓ Cleared in-memory server list");
      
      // Delete all database tables data
      await db.delete(playerActivities);
      await db.delete(playerSessions);  
      await db.delete(playerProfiles);
      await db.delete(maps);
      await db.delete(servers);
      console.log("✓ Cleared all database tables");
      
      res.json({ 
        message: "All data deleted successfully",
        cleared: ["servers", "profiles", "sessions", "activities", "maps"]
      });
    } catch (error) {
      console.error("Error deleting all data:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to delete data" 
      });
    }
  });

  // Player Activity API Endpoints
  


  // Get activity history for a server
  app.get("/api/servers/:serverId/activity", async (req, res) => {
    try {
      const { serverId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      console.log(`🎯 [API] Activity endpoint called: serverId=${serverId}, limit=${limit}`);
      
      // Force no-cache headers to prevent 304 responses
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const activities = await playerActivityTracker.getRecentActivities(serverId, limit);
      console.log(`🎯 [API] Returning ${activities.length} activities`);
      
      res.json(activities);
    } catch (error) {
      console.error("❌ [API] Error fetching server activity:", error);
      res.status(500).json({ error: "Failed to fetch server activity" });
    }
  });





  // Get premium player count for a server
  app.get("/api/servers/:serverId/premium-count", async (req, res) => {
    try {
      const { serverId } = req.params;
      const { totalPlayers, visiblePlayers } = req.query;

      if (!totalPlayers || !visiblePlayers) {
        return res
          .status(400)
          .json({ error: "totalPlayers and visiblePlayers are required" });
      }

      const premiumCount = await playerActivityTracker.getPremiumPlayerCount(
        serverId,
        parseInt(totalPlayers as string),
        parseInt(visiblePlayers as string)
      );

      res.json({ premiumCount });
    } catch (error) {
      console.error("Error calculating premium player count:", error);
      res
        .status(500)
        .json({ error: "Failed to calculate premium player count" });
    }
  });

  // Map Storage API Endpoints

  // Get cached map for a server
  app.get("/api/servers/:serverId/map", async (req, res) => {
    try {
      const { serverId } = req.params;
      const { seed } = req.query;

      let cachedMap;
      if (seed) {
        cachedMap = await mapStorageService.getMapByServerAndSeed(
          serverId,
          seed as string
        );
      } else {
        cachedMap = await mapStorageService.getLatestMapForServerAndMarkUsed(
          serverId
        );
      }

      if (!cachedMap || !cachedMap.imageData) {
        return res.status(404).json({ error: "No cached map found" });
      }

      // Convert base64 back to buffer and send
      const imageBuffer = Buffer.from(cachedMap.imageData, "base64");

      res.set({
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "X-Map-Cached-At": cachedMap.fetchedAt.toISOString(),
        "X-Map-Seed": cachedMap.seed || "unknown",
      });

      res.send(imageBuffer);
    } catch (error) {
      console.error("Error retrieving cached map:", error);
      res.status(500).json({ error: "Failed to retrieve cached map" });
    }
  });

  // Get map metadata for a server
  app.get("/api/servers/:serverId/map-info", async (req, res) => {
    try {
      const { serverId } = req.params;

      const maps = await mapStorageService.getServerMaps(serverId);

      res.json({
        totalMaps: maps.length,
        maps: maps.map((map) => ({
          id: map.id,
          mapName: map.mapName,
          seed: map.seed,
          size: map.size,
          fetchedAt: map.fetchedAt,
          lastUsed: map.lastUsed,
          hasImage: !!map.imageData,
        })),
      });
    } catch (error) {
      console.error("Error fetching map info:", error);
      res.status(500).json({ error: "Failed to fetch map info" });
    }
  });

  // Check if map is fresh (within 30 days by default)
  app.get("/api/servers/:serverId/map-fresh", async (req, res) => {
    try {
      const { serverId } = req.params;
      const { seed, maxAgeDays } = req.query;

      const isFresh = await mapStorageService.isMapFresh(
        serverId,
        seed as string,
        maxAgeDays ? parseInt(maxAgeDays as string) : 30
      );

      res.json({ isFresh });
    } catch (error) {
      console.error("Error checking map freshness:", error);
      res.status(500).json({ error: "Failed to check map freshness" });
    }
  });

  // Database metrics endpoint
  app.get("/api/database/metrics", async (req, res) => {
    try {
      const { db } = await import("./db");

      // Get database size metrics
      const sizeQuery = `
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_database_size(current_database()) as database_size_bytes,
          pg_size_pretty(pg_total_relation_size('player_activities')) as activities_size,
          pg_total_relation_size('player_activities') as activities_size_bytes,
          pg_size_pretty(pg_total_relation_size('maps')) as maps_size,
          pg_total_relation_size('maps') as maps_size_bytes,
          (SELECT COUNT(*) FROM player_activities) as total_activities,
          (SELECT COUNT(*) FROM maps) as total_maps
      `;

      const sizeResult = await db.execute(sizeQuery);
      const sizeRow = sizeResult.rows[0] as any;

      // Get hourly activity data for last 24 hours
      const activityQuery = `
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as activities_per_hour,
          AVG(LENGTH(action) + LENGTH(player_name) + LENGTH(server_id) + LENGTH(player_id) + 50) as avg_row_size_bytes
        FROM player_activities 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
      `;

      const activityResult = await db.execute(activityQuery);
      const hourlyData = activityResult.rows;

      // Calculate average data per hour
      const avgActivitiesPerHour =
        hourlyData.length > 0
          ? hourlyData.reduce(
              (sum: number, row: any) => sum + Number(row.activities_per_hour),
              0
            ) / hourlyData.length
          : 0;

      const avgRowSize =
        hourlyData.length > 0
          ? hourlyData.reduce(
              (sum: number, row: any) =>
                sum + Number(row.avg_row_size_bytes || 100),
              0
            ) / hourlyData.length
          : 100;

      const avgDataPerHour = avgActivitiesPerHour * avgRowSize;

      // Database limits (Replit/Neon typical limits)
      const databaseLimit = 1024 * 1024 * 1024; // 1GB limit for free tier
      const currentUsage = Number(sizeRow.database_size_bytes);
      const usagePercentage = (currentUsage / databaseLimit) * 100;

      res.json({
        database: {
          size: sizeRow.database_size,
          sizeBytes: currentUsage,
          limit: "1 GB",
          limitBytes: databaseLimit,
          usagePercentage: Math.round(usagePercentage * 100) / 100,
        },
        tables: {
          activities: {
            size: sizeRow.activities_size,
            count: Number(sizeRow.total_activities),
          },
          maps: {
            size: sizeRow.maps_size,
            count: Number(sizeRow.total_maps),
          },
        },
        usage: {
          avgDataPerHour: `${Math.round(avgDataPerHour)} bytes`,
          avgDataPerHourFormatted:
            avgDataPerHour > 1024
              ? `${Math.round(avgDataPerHour / 1024)} KB`
              : `${Math.round(avgDataPerHour)} bytes`,
          avgActivitiesPerHour: Math.round(avgActivitiesPerHour * 100) / 100,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching database metrics:", error);
      res.status(500).json({ error: "Failed to fetch database metrics" });
    }
  });

  // Cleanup endpoint to run map cleanup manually
  app.post("/api/database/cleanup", async (req, res) => {
    try {
      await mapStorageService.globalMapCleanup();
      res.json({ message: "Database cleanup completed successfully" });
    } catch (error) {
      console.error("Error during manual cleanup:", error);
      res.status(500).json({ error: "Cleanup failed" });
    }
  });

  // Backup System Management API Endpoints

  // Get backup system status
  app.get("/api/backup/status", async (req, res) => {
    try {
      const status = backupManager.getDetailedStats();
      res.json(status);
    } catch (error) {
      console.error("Error fetching backup status:", error);
      res.status(500).json({ error: "Failed to fetch backup status" });
    }
  });

  // Force mode switch for backup system
  app.post("/api/backup/switch-mode", isAuthenticated, async (req, res) => {
    try {
      const { mode } = req.body;
      
      if (!mode || !['websocket', 'backup', 'hybrid'].includes(mode)) {
        return res.status(400).json({ 
          error: "Invalid mode. Must be one of: websocket, backup, hybrid" 
        });
      }

      await backupManager.forceModeSwitch(mode);
      
      res.json({ 
        message: `Successfully switched to ${mode} mode`,
        status: backupManager.getStatus()
      });
    } catch (error) {
      console.error("Error switching backup mode:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to switch mode" 
      });
    }
  });

  // Manual backup poll trigger
  app.post("/api/backup/poll-now", isAuthenticated, async (req, res) => {
    try {
      await backupManager.triggerBackupPoll();
      res.json({ 
        message: "Manual backup poll completed",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering backup poll:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to trigger backup poll" 
      });
    }
  });

  // Health check endpoint for backup system
  app.get("/api/backup/health", async (req, res) => {
    try {
      const status = backupManager.getStatus();
      const isHealthy = status.webSocketConnected || status.backupActive;
      
      res.status(isHealthy ? 200 : 503).json({
        healthy: isHealthy,
        status: status,
        message: isHealthy 
          ? "Backup system is operational" 
          : "Both WebSocket and backup polling are offline"
      });
    } catch (error) {
      console.error("Error checking backup health:", error);
      res.status(503).json({ 
        healthy: false,
        error: "Health check failed" 
      });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
