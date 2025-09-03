import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import {
  createTeamSchema,
  createUserSchema,
  addTeamMemberSchema,
  insertReportSchema,
  insertReportTemplateSchema,
  insertPremiumPlayerSchema,
  insertPlayerBaseTagSchema,
  insertPlayerProfileSchema,
  insertGeneticDataSchema,
} from "@shared/schema";
import { battleMetricsService } from "./services/battlemetrics";
import { webSocketManager } from "./services/websocketManager";

// Authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// TEMPORARY FAKE DATA FUNCTIONS - TO BE DELETED LATER
function getTempFakePlayers() {
  const onlinePlayers = ["timtom", "billybob", "123", "jack56", "deeznutz yomumma", "IaMyOuRdAdDy", "stimsack", "bobthebuilder", "chax"];
  const offlinePlayers = ["Fanbo", "Rickybobby", "elflord", "i8urmomsbutt", "rockstar", "scubasteffan"];

  const players = [];
  let id = 1;

  // Add online players
  onlinePlayers.forEach(name => {
    players.push({
      id: id++,
      playerName: name,
      isOnline: true,
      totalSessions: Math.floor(Math.random() * (100 - 30) + 30) // Random 30-100 hours
    });
  });

  // Add offline players
  offlinePlayers.forEach(name => {
    players.push({
      id: id++,
      playerName: name,
      isOnline: false,
      totalSessions: Math.floor(Math.random() * (100 - 30) + 30) // Random 30-100 hours
    });
  });

  return players;
}

function generateFakeSessionHistory(playerName: string) {
  const sessions = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Generate 5-15 random sessions over the last week
  const sessionCount = Math.floor(Math.random() * 11) + 5;

  for (let i = 0; i < sessionCount; i++) {
    // Random date within the last week
    const sessionDate = new Date(oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime()));

    // Random session duration between 1-8 hours
    const durationHours = Math.floor(Math.random() * 8) + 1;

    sessions.push({
      id: i + 1,
      playerName,
      startTime: sessionDate.toISOString(),
      endTime: new Date(sessionDate.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
      durationHours,
      server: "US West",
      status: "completed"
    });
  }

  // Sort by most recent first
  return sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}
// END TEMPORARY FAKE DATA FUNCTIONS

export async function registerRoutes(app: Express): Promise<Server> {
  // Reports API routes

  // Get all reports
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Get reports by type
  app.get("/api/reports/type/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const reports = await storage.getReportsByType(type);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports by type" });
    }
  });

  // Get reports by player tag
  app.get("/api/reports/player/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const reports = await storage.getReportsByPlayerTag(playerId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports by player" });
    }
  });

  // Get reports by base tag
  app.get("/api/reports/base/:baseId", async (req, res) => {
    try {
      const { baseId } = req.params;
      const { baseOwners } = req.query;

      // If baseOwners provided, use enhanced method that includes player-matched reports
      if (baseOwners && typeof baseOwners === 'string') {
        const reports = await storage.getReportsForBaseWithPlayers(baseId, baseOwners);
        res.json(reports);
      } else {
        // Fall back to original method
        const reports = await storage.getReportsByBaseTag(baseId);
        res.json(reports);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports by base" });
    }
  });

  // Get specific report
  app.get("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getReport(id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertReportSchema.parse(req.body);

      // If this is a task report, check for duplicates and limits
      if (validatedData.type === 'task' && validatedData.status === 'pending') {
        const allReports = await storage.getAllReports();

        // Get base tags for this report
        const baseTags = validatedData.baseTags || [];

        for (const baseId of baseTags) {
          // Check for existing task report based on task type
          let existingTask = null;

          if (validatedData.taskType === 'needs_pickup') {
            // For pickup tasks, check by pickup type
            existingTask = allReports.find(report => 
              report.type === 'task' && 
              report.status === 'pending' && 
              report.baseTags.includes(baseId) &&
              report.taskType === 'needs_pickup' &&
              report.taskData?.pickupType === validatedData.taskData?.pickupType
            );
          } else if (validatedData.taskType === 'repair_upgrade') {
            // For repair/upgrade tasks, check by repair type
            existingTask = allReports.find(report => 
              report.type === 'task' && 
              report.status === 'pending' && 
              report.baseTags.includes(baseId) &&
              report.taskType === 'repair_upgrade' &&
              report.taskData?.repairUpgradeType === validatedData.taskData?.repairUpgradeType
            );
          } else if (validatedData.taskType === 'request_resources') {
            // For resource requests, allow multiple requests (they're different resource amounts)
            // Don't block duplicate resource requests as they can have different amounts
            existingTask = null;
          }

          if (existingTask) {
            const errorMessage = validatedData.taskType === 'needs_pickup' 
              ? "Task report already exists for this pickup type on this base"
              : "Task report already exists for this repair/upgrade type on this base";
            return res.status(400).json({ 
              error: errorMessage
            });
          }

          // Check total pending task reports for this base (limit to 5)
          const pendingTasksForBase = allReports.filter(report => 
            report.type === 'task' && 
            report.status === 'pending' && 
            report.baseTags.includes(baseId)
          );

          if (pendingTasksForBase.length >= 5) {
            return res.status(400).json({ 
              error: "Maximum task reports reached for this base (5)" 
            });
          }
        }
      }

      const report = await storage.createReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ error: "Invalid report data" });
    }
  });

  // Update report
  app.put("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertReportSchema.partial().parse(req.body);
      const report = await storage.updateReport(id, validatedData);
      res.json(report);
    } catch (error) {
      res.status(400).json({ error: "Failed to update report" });
    }
  });

  // Delete report
  app.delete("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteReport(id);
      if (!success) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete report" });
    }
  });

  // Report Templates API routes

  // Get all templates
  app.get("/api/report-templates", async (req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get template by type
  app.get("/api/report-templates/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const template = await storage.getReportTemplateByType(type);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Create new template
  app.post("/api/report-templates", async (req, res) => {
    try {
      const validatedData = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  // Players API routes

  // Get all players from external API
  app.get("/api/players", async (req, res) => {
    try {
      // Fetch from your external API
      const response = await fetch('https://3de60948-f8d7-4a5d-9537-2286d058f7c0-00-2uooy61mnqc4.janeway.replit.dev/api/public/servers/2933470/profiles');

      if (!response.ok) {
        console.log(`External API temporarily unavailable: ${response.status}`);
        // TEMPORARY FAKE DATA - TO BE DELETED LATER
        // Return fake player data while external API is down
        return res.json(getTempFakePlayers());
      }

      const externalPlayers = await response.json();

      // Transform external data to match our interface
      const players = externalPlayers.map((player: any, index: number) => ({
        id: index + 1, // Generate temporary ID for UI
        playerName: player.playerName,
        isOnline: player.isOnline,
        totalSessions: player.totalSessions,
        // Add any other fields you want to display
      }));

      res.json(players);
    } catch (error) {
      console.log('External API temporarily unavailable, returning fake data');
      // TEMPORARY FAKE DATA - TO BE DELETED LATER
      // Return fake player data instead of empty array to keep app functional
      res.json(getTempFakePlayers());
    }
  });

  // TEMPORARY: Get player session history - TO BE DELETED LATER
  app.get("/api/players/:playerName/sessions", async (req, res) => {
    const { playerName } = req.params;
    // Generate fake session history (30-100 hours over last week)
    const sessions = generateFakeSessionHistory(playerName);
    res.json(sessions);
  });

  // Premium Players API routes

  // Get all premium players
  app.get("/api/premium-players", async (req, res) => {
    try {
      const premiumPlayers = await storage.getAllPremiumPlayers();
      res.json(premiumPlayers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium players" });
    }
  });

  // Create premium player
  app.post("/api/premium-players", async (req, res) => {
    try {
      const validatedData = insertPremiumPlayerSchema.parse(req.body);
      const premiumPlayer = await storage.createPremiumPlayer(validatedData);
      res.status(201).json(premiumPlayer);
    } catch (error) {
      res.status(400).json({ error: "Invalid premium player data" });
    }
  });

  // Get premium player by name
  app.get("/api/premium-players/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const player = await storage.getPremiumPlayerByName(name);
      if (!player) {
        return res.status(404).json({ error: "Premium player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium player" });
    }
  });

  // Delete premium player
  app.delete("/api/premium-players/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePremiumPlayer(id);
      if (!success) {
        return res.status(404).json({ error: "Premium player not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete premium player" });
    }
  });

  // Player Base Tags API routes

  // Get all player base tags
  app.get("/api/player-base-tags", async (req, res) => {
    try {
      const tags = await storage.getAllPlayerBaseTags();
      res.json(tags);
    } catch (error) {
      console.error("Error getting player base tags:", error);
      res.status(500).json({ error: "Failed to get player base tags" });
    }
  });

  // Get tags for a specific player
  app.get("/api/player-base-tags/player/:playerName", async (req, res) => {
    try {
      const tags = await storage.getPlayerBaseTags(req.params.playerName);
      res.json(tags);
    } catch (error) {
      console.error("Error getting player tags:", error);
      res.status(500).json({ error: "Failed to get player tags" });
    }
  });

  // Get tags for a specific base
  app.get("/api/player-base-tags/base/:baseId", async (req, res) => {
    try {
      const tags = await storage.getBasePlayerTags(req.params.baseId);
      res.json(tags);
    } catch (error) {
      console.error("Error getting base tags:", error);
      res.status(500).json({ error: "Failed to get base tags" });
    }
  });

  // Create player base tag
  app.post("/api/player-base-tags", async (req, res) => {
    try {
      const validatedTag = insertPlayerBaseTagSchema.parse(req.body);
      const tag = await storage.createPlayerBaseTag(validatedTag);
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating player base tag:", error);
      res.status(400).json({ error: "Failed to create player base tag" });
    }
  });

  // Delete player base tag
  app.delete("/api/player-base-tags/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlayerBaseTag(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Player base tag not found" });
      }
    } catch (error) {
      console.error("Error deleting player base tag:", error);
      res.status(500).json({ error: "Failed to delete player base tag" });
    }
  });

  // Delete all tags for a specific base (used when base is deleted)
  app.delete("/api/player-base-tags/base/:baseId", async (req, res) => {
    try {
      const success = await storage.deletePlayerBaseTagsByBaseId(req.params.baseId);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting base tags:", error);
      res.status(500).json({ error: "Failed to delete base tags" });
    }
  });

  // Player Profile API routes

  // Get player profile
  app.get("/api/player-profiles/:playerName", async (req, res) => {
    try {
      const profile = await storage.getPlayerProfile(req.params.playerName);
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ error: "Player profile not found" });
      }
    } catch (error) {
      console.error("Error getting player profile:", error);
      res.status(500).json({ error: "Failed to get player profile" });
    }
  });

  // Create or update player profile
  app.post("/api/player-profiles", async (req, res) => {
    try {
      const validatedProfile = insertPlayerProfileSchema.parse(req.body);

      // Check if profile exists
      const existingProfile = await storage.getPlayerProfile(validatedProfile.playerName);

      let profile;
      if (existingProfile) {
        // Update existing profile
        profile = await storage.updatePlayerProfile(validatedProfile.playerName, validatedProfile);
      } else {
        // Create new profile
        profile = await storage.createPlayerProfile(validatedProfile);
      }

      res.json(profile);
    } catch (error) {
      console.error("Error creating/updating player profile:", error);
      res.status(400).json({ error: "Failed to create/update player profile" });
    }
  });

  // Update player profile
  app.patch("/api/player-profiles/:playerName", async (req, res) => {
    try {
      const profile = await storage.updatePlayerProfile(req.params.playerName, req.body);
      res.json(profile);
    } catch (error) {
      console.error("Error updating player profile:", error);
      res.status(500).json({ error: "Failed to update player profile" });
    }
  });

  // Delete player profile
  app.delete("/api/player-profiles/:playerName", async (req, res) => {
    try {
      const success = await storage.deletePlayerProfile(req.params.playerName);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Player profile not found" });
      }
    } catch (error) {
      console.error("Error deleting player profile:", error);
      res.status(500).json({ error: "Failed to delete player profile" });
    }
  });

  // Teammates API routes

  // Get all teammates
  app.get("/api/teammates", async (req, res) => {
    try {
      const teammates = await storage.getAllTeammates();
      res.json(teammates);
    } catch (error) {
      console.error("Error getting teammates:", error);
      res.status(500).json({ error: "Failed to get teammates" });
    }
  });

  // Add a teammate
  app.post("/api/teammates", async (req, res) => {
    try {
      const { playerName } = req.body;
      if (!playerName) {
        return res.status(400).json({ error: "Player name is required" });
      }

      const teammate = await storage.addTeammate(playerName);
      res.json(teammate);
    } catch (error) {
      console.error("Error adding teammate:", error);
      res.status(500).json({ error: "Failed to add teammate" });
    }
  });

  // Remove a teammate
  app.delete("/api/teammates/:playerName", async (req, res) => {
    try {
      const { playerName } = req.params;
      const success = await storage.removeTeammate(playerName);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Teammate not found" });
      }
    } catch (error) {
      console.error("Error removing teammate:", error);
      res.status(500).json({ error: "Failed to remove teammate" });
    }
  });

  // Genetic Data API routes

  // Get all genetic data
  app.get("/api/genetic-data", async (req, res) => {
    try {
      const data = await storage.getAllGeneticData();
      res.json(data);
    } catch (error) {
      console.error("Error getting genetic data:", error);
      res.status(500).json({ error: "Failed to get genetic data" });
    }
  });

  // Get genetic data for a specific plant type
  app.get("/api/genetic-data/:plantType", async (req, res) => {
    try {
      const data = await storage.getGeneticData(req.params.plantType);
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ error: "Genetic data not found for plant type" });
      }
    } catch (error) {
      console.error("Error getting genetic data:", error);
      res.status(500).json({ error: "Failed to get genetic data" });
    }
  });

  // Create or update genetic data for a plant type
  app.post("/api/genetic-data", async (req, res) => {
    try {
      const validatedData = insertGeneticDataSchema.parse(req.body);
      const data = await storage.upsertGeneticData(validatedData);
      res.json(data);
    } catch (error) {
      console.error("Error upserting genetic data:", error);
      res.status(400).json({ error: "Failed to save genetic data" });
    }
  });

  // Delete genetic data for a specific plant type
  app.delete("/api/genetic-data/:plantType", async (req, res) => {
    try {
      const success = await storage.deleteGeneticData(req.params.plantType);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Genetic data not found for plant type" });
      }
    } catch (error) {
      console.error("Error deleting genetic data:", error);
      res.status(500).json({ error: "Failed to delete genetic data" });
    }
  });

  // Clear all genetic data
  app.delete("/api/genetic-data", async (req, res) => {
    try {
      const success = await storage.clearAllGeneticData();
      res.json({ success });
    } catch (error) {
      console.error("Error clearing genetic data:", error);
      res.status(500).json({ error: "Failed to clear genetic data" });
    }
  });

  // BattleMetrics Integration Routes

  // Get tracked servers
  app.get("/api/battlemetrics/servers", async (req, res) => {
    try {
      const servers = await storage.getBattlemetricsServers()
      res.json(servers)
    } catch (error) {
      console.error("Error getting tracked servers:", error)
      res.status(500).json({ error: "Failed to get tracked servers" })
    }
  })

  // Search for servers to add
  app.get("/api/battlemetrics/search", async (req, res) => {
    try {
      const { query } = req.query
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query required" })
      }

      const servers = await battleMetricsService.searchServers(query)
      res.json(servers)
    } catch (error) {
      console.error("Error searching servers:", error)
      res.status(500).json({ error: "Failed to search servers" })
    }
  })

  // Add a server for tracking
  app.post("/api/battlemetrics/servers", async (req, res) => {
    try {
      const { serverId } = req.body
      if (!serverId) {
        return res.status(400).json({ error: "Server ID required" })
      }

      // Get server info from BattleMetrics
      const serverInfo = await battleMetricsService.getServer(serverId)

      // Add to database
      const server = await storage.addBattlemetricsServer({
        id: serverInfo.id,
        name: serverInfo.name,
        game: serverInfo.game,
        region: serverInfo.region,
        isSelected: false,
        isActive: true,
      })

      res.status(201).json(server)
    } catch (error) {
      console.error("Error adding server:", error)
      res.status(500).json({ error: "Failed to add server" })
    }
  })

  // Select a server for tracking (sets as active)
  app.post("/api/battlemetrics/servers/:serverId/select", async (req, res) => {
    try {
      const { serverId } = req.params

      // Unselect all other servers and select this one
      await storage.selectBattlemetricsServer(serverId)

      // Subscribe to WebSocket for this server
      webSocketManager.subscribeToServer(serverId)

      res.json({ success: true, selectedServer: serverId })
    } catch (error) {
      console.error("Error selecting server:", error)
      res.status(500).json({ error: "Failed to select server" })
    }
  })

  // Get current server info
  app.get("/api/battlemetrics/servers/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params
      const serverInfo = await battleMetricsService.getServer(serverId)
      res.json(serverInfo)
    } catch (error) {
      console.error("Error getting server info:", error)
      res.status(500).json({ error: "Failed to get server info" })
    }
  })

  // Get live players for selected server
  app.get("/api/battlemetrics/servers/:serverId/players", async (req, res) => {
    try {
      const { serverId } = req.params
      const players = await battleMetricsService.getPlayers(serverId)

      // Enhance with local profile data if available
      const enhancedPlayers = await Promise.all(players.map(async (player) => {
        const profile = await storage.getPlayerProfileByBattlemetricsId(player.id)
        return {
          ...player,
          profile: profile || null, // Include local profile data for aliases, notes, etc.
        }
      }))

      res.json(enhancedPlayers)
    } catch (error) {
      console.error("Error getting server players:", error)
      res.status(500).json({ error: "Failed to get server players" })
    }
  })

  // Get player profiles from local database
  app.get("/api/player-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllPlayerProfiles()
      res.json(profiles)
    } catch (error) {
      console.error("Error getting player profiles:", error)
      res.status(500).json({ error: "Failed to get player profiles" })
    }
  })

  // Admin routes for monitoring tracking status
  app.get("/api/admin/tracking-status", async (req, res) => {
    try {
      let selectedServer = null;
      let totalProfiles = 0;

      // Safely get selected server
      try {
        selectedServer = await storage.getSelectedBattlemetricsServer();
      } catch (error) {
        console.warn("Could not get selected server:", error);
      }

      // Safely get player profile count
      try {
        totalProfiles = await storage.getPlayerProfileCount();
      } catch (error) {
        console.warn("Could not get player profile count:", error);
      }

      const subscribedServers = webSocketManager.getSubscribedServers();

      res.json({
        selectedServer: selectedServer?.id || null,
        selectedServerName: selectedServer?.name || null,
        subscribedServers,
        totalPlayerProfiles: totalProfiles,
        websocketConnected: webSocketManager.isConnected(),
        trackingActive: selectedServer !== null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting tracking status:", error);
      res.status(500).json({ 
        error: "Failed to get tracking status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add admin API routes for user and team management
  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create a new user
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/admin/teams', isAuthenticated, async (req: any, res) => {
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

  // =========================================
  // TEAM-SCOPED SERVER & PLAYER INTELLIGENCE API ENDPOINTS
  // =========================================

  // Get team's tracked servers
  app.get('/api/teams/servers/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const servers = await storage.getTeamTrackedServers(teamId);
      res.json(servers);
    } catch (error) {
      console.error("Error fetching team servers:", error);
      res.status(500).json({ message: "Failed to fetch team servers" });
    }
  });

  // Get team's active server
  app.get('/api/teams/active-server/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const activeServer = await storage.getTeamActiveServer(teamId);
      res.json(activeServer);
    } catch (error) {
      console.error("Error fetching team active server:", error);
      res.status(500).json({ message: "Failed to fetch team active server" });
    }
  });

  // Set team's active server and start tracking
  app.post('/api/teams/:teamId/select-server', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { serverId } = req.body;
      const userId = req.user.claims.sub;

      // Set team's selected server
      await storage.setTeamActiveServer(teamId, serverId, userId);
      
      // Start WebSocket tracking for this server
      if (webSocketManager.isConnected()) {
        webSocketManager.subscribeToServer(serverId);
        console.log(`🎯 Team ${teamId} now tracking server ${serverId}`);
      }

      res.json({ success: true, message: `Server ${serverId} selected for team tracking` });
    } catch (error) {
      console.error("Error selecting team server:", error);
      res.status(500).json({ message: "Failed to select team server" });
    }
  });

  // Add server to team tracking
  app.post('/api/teams/:teamId/servers', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { serverId } = req.body;
      const userId = req.user.claims.sub;

      // Add server to team's tracking list
      await storage.addServerToTeam(teamId, serverId, userId);
      
      // Optionally get server info from BattleMetrics
      try {
        const serverInfo = await battleMetricsService.getServer(serverId);
        console.log(`📡 Added server ${serverInfo.name} to team ${teamId}`);
      } catch (apiError) {
        console.log(`📡 Added server ${serverId} to team ${teamId} (no BM data)`);
      }

      res.json({ success: true, message: "Server added to team tracking" });
    } catch (error) {
      console.error("Error adding server to team:", error);
      res.status(500).json({ message: "Failed to add server to team" });
    }
  });

  // Get team's player intelligence data
  app.get('/api/teams/players/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const playerData = await storage.getTeamPlayerIntelligence(teamId);
      res.json(playerData);
    } catch (error) {
      console.error("Error fetching team player data:", error);
      res.status(500).json({ message: "Failed to fetch team player data" });
    }
  });

  // Update team player intelligence
  app.post('/api/teams/:teamId/player-intelligence', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { playerName, aliases, notes, threatLevel, relationship } = req.body;
      const userId = req.user.claims.sub;

      const updatedPlayer = await storage.updateTeamPlayerIntelligence({
        teamId,
        playerName,
        aliases: aliases || '',
        notes: notes || '',
        threatLevel: threatLevel || 'unknown',
        relationship: relationship || 'unknown',
        updatedBy: userId,
      });

      res.json(updatedPlayer);
    } catch (error) {
      console.error("Error updating team player intelligence:", error);
      res.status(500).json({ message: "Failed to update player intelligence" });
    }
  });

  // Get team's player profiles for selected server
  app.get('/api/teams/:teamId/server-players', isAuthenticated, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      
      // Get team's active server
      const activeServer = await storage.getTeamActiveServer(teamId);
      if (!activeServer) {
        return res.json([]);
      }

      // Get player profiles for that server using the tracker
      const tracker = webSocketManager.getPlayerActivityTracker();
      const serverPlayers = await tracker.getPlayerProfiles(activeServer.id);
      
      // Merge with team intelligence data
      const teamIntelligence = await storage.getTeamPlayerIntelligence(teamId);
      const intelligenceMap = new Map(teamIntelligence.map(intel => [intel.playerName, intel]));

      const enrichedPlayers = serverPlayers.map(player => ({
        ...player,
        teamIntelligence: intelligenceMap.get(player.playerName) || null
      }));

      res.json(enrichedPlayers);
    } catch (error) {
      console.error("Error fetching team server players:", error);
      res.status(500).json({ message: "Failed to fetch team server players" });
    }
  });

  // BattleMetrics Admin Routes
  
  // Get available servers from BattleMetrics API
  app.get('/api/admin/bm/servers/available', isAuthenticated, async (req: any, res) => {
    try {
      const { page = 1, limit = 20, query = '' } = req.query;
      
      let servers = [];
      if (query && typeof query === 'string') {
        servers = await battleMetricsService.searchServers(query);
      } else {
        // Get a default list of popular Rust servers
        servers = await battleMetricsService.searchServers('rust');
      }
      
      // Paginate results
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedServers = servers.slice(startIndex, endIndex);
      
      const response = {
        servers: paginatedServers.map(server => ({
          id: server.id,
          name: server.name,
          region: server.region,
          online: server.status === 'online',
          playerCount: server.players,
          maxPlayers: server.maxPlayers,
          game: server.game
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: servers.length,
          hasMore: endIndex < servers.length
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching available servers:", error);
      res.status(500).json({ message: "Failed to fetch available servers" });
    }
  });

  // Get tracked servers
  app.get('/api/admin/bm/servers/tracked', isAuthenticated, async (req: any, res) => {
    try {
      const trackedServers = await storage.getBattlemetricsServers();
      
      // Get detailed info for each tracked server
      const detailedServers = await Promise.all(
        trackedServers.map(async (server) => {
          try {
            const serverInfo = await battleMetricsService.getServer(server.id);
            return {
              id: server.id,
              name: serverInfo.name,
              region: serverInfo.region,
              online: serverInfo.status === 'online',
              playerCount: serverInfo.players,
              maxPlayers: serverInfo.maxPlayers,
              game: serverInfo.game,
              isSelected: server.isSelected,
              addedAt: server.addedAt,
              lastChecked: server.lastChecked
            };
          } catch (error) {
            return {
              id: server.id,
              name: server.name,
              region: 'Unknown',
              online: false,
              playerCount: 0,
              maxPlayers: 0,
              game: server.game,
              isSelected: server.isSelected,
              addedAt: server.addedAt,
              lastChecked: server.lastChecked,
              error: 'Failed to fetch server info'
            };
          }
        })
      );
      
      res.json(detailedServers);
    } catch (error) {
      console.error("Error fetching tracked servers:", error);
      res.status(500).json({ message: "Failed to fetch tracked servers" });
    }
  });

  // Add server to tracking
  app.post('/api/admin/bm/servers/tracked', isAuthenticated, async (req: any, res) => {
    try {
      const { bmServerId } = req.body;
      
      if (!bmServerId) {
        return res.status(400).json({ message: "Server ID is required" });
      }
      
      // Check if server is already tracked
      const existingServers = await storage.getBattlemetricsServers();
      const existing = existingServers.find(s => s.id === bmServerId);
      
      if (existing) {
        return res.status(400).json({ message: "Server is already being tracked" });
      }
      
      // Get server info from BattleMetrics
      const serverInfo = await battleMetricsService.getServer(bmServerId);
      
      // Add to database
      const server = await storage.addBattlemetricsServer({
        id: serverInfo.id,
        name: serverInfo.name,
        game: serverInfo.game,
        region: serverInfo.region,
        isSelected: false,
        isActive: true
      });
      
      res.status(201).json({
        id: server.id,
        name: serverInfo.name,
        region: serverInfo.region,
        online: serverInfo.status === 'online',
        playerCount: serverInfo.players,
        maxPlayers: serverInfo.maxPlayers,
        game: serverInfo.game,
        isSelected: server.isSelected,
        addedAt: server.addedAt
      });
    } catch (error) {
      console.error("Error adding tracked server:", error);
      res.status(500).json({ message: "Failed to add server to tracking" });
    }
  });

  // Remove server from tracking
  app.delete('/api/admin/bm/servers/tracked/:bmServerId', isAuthenticated, async (req: any, res) => {
    try {
      const { bmServerId } = req.params;
      
      const success = await storage.removeBattlemetricsServer(bmServerId);
      
      if (!success) {
        return res.status(404).json({ message: "Server not found in tracking list" });
      }
      
      res.json({ success: true, message: "Server removed from tracking" });
    } catch (error) {
      console.error("Error removing tracked server:", error);
      res.status(500).json({ message: "Failed to remove server from tracking" });
    }
  });

  // Get system status and diagnostics
  app.get('/api/admin/bm/status', isAuthenticated, async (req: any, res) => {
    try {
      const status = {
        battlemetricsApi: { healthy: true },
        websocket: { 
          connected: webSocketManager.isConnected(),
          subscribedServers: webSocketManager.getSubscribedServers()
        },
        database: { healthy: true },
        errors: []
      };
      
      // Test BattleMetrics API health
      try {
        await battleMetricsService.searchServers('test');
        status.battlemetricsApi.healthy = true;
      } catch (error) {
        status.battlemetricsApi.healthy = false;
        status.errors.push({
          time: new Date().toISOString(),
          scope: 'battlemetrics_api',
          message: error instanceof Error ? error.message : 'API connection failed'
        });
      }
      
      // Test database health
      try {
        const testQuery = await storage.getAllUsers();
        status.database.healthy = true;
      } catch (error) {
        status.database.healthy = false;
        status.errors.push({
          time: new Date().toISOString(),
          scope: 'database',
          message: error instanceof Error ? error.message : 'Database connection failed'
        });
      }
      
      // Get selected server info
      try {
        const selectedServer = await storage.getSelectedBattlemetricsServer();
        status.selectedServer = selectedServer ? {
          id: selectedServer.id,
          name: selectedServer.name,
          region: selectedServer.region
        } : null;
      } catch (error) {
        status.errors.push({
          time: new Date().toISOString(),
          scope: 'selected_server',
          message: 'Could not retrieve selected server info'
        });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error getting system status:", error);
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // Map Storage API Endpoints

  // Get cached map for a server
  app.get("/api/map/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params;
      const mapData = await storage.getMapData(serverId);
      if (mapData) {
        res.json(mapData);
      } else {
        res.status(404).json({ error: "Map data not found for server" });
      }
    } catch (error) {
      console.error("Error getting map data:", error);
      res.status(500).json({ error: "Failed to get map data" });
    }
  });

  // Save map data for a server
  app.post("/api/map/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params;
      const mapData = req.body; // Assume mapData is sent in the request body
      const savedMapData = await storage.saveMapData(serverId, mapData);
      res.status(201).json(savedMapData);
    } catch (error) {
      console.error("Error saving map data:", error);
      res.status(400).json({ error: "Failed to save map data" });
    }
  });

  // Delete map data for a server
  app.delete("/api/map/:serverId", async (req, res) => {
    try {
      const { serverId } = req.params;
      const success = await storage.deleteMapData(serverId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Map data not found for server" });
      }
    } catch (error) {
      console.error("Error deleting map data:", error);
      res.status(500).json({ error: "Failed to delete map data" });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket connection on server start
  webSocketManager.connect();

  return httpServer;
}