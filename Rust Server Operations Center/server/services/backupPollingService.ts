import { BattleMetricsService } from './battlemetrics.js';
import { PlayerActivityTracker } from './playerActivityTracker.js';

interface ServerPlayerState {
  serverId: string;
  players: Set<string>;
  lastUpdated: Date;
}

export class BackupPollingService {
  private battleMetricsService: BattleMetricsService;
  private playerActivityTracker: PlayerActivityTracker;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private serverStates: Map<string, ServerPlayerState> = new Map();
  private subscribedServers: Set<string> = new Set();

  // Default polling interval - can be adjusted based on API rate limits
  private readonly DEFAULT_POLLING_INTERVAL = 60000; // 60 seconds

  constructor() {
    this.battleMetricsService = new BattleMetricsService();
    this.playerActivityTracker = new PlayerActivityTracker();
  }

  // Start the backup polling system
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ [BackupPolling] Already running');
      return;
    }

    console.log('🚀 [BackupPolling] Starting backup polling service...');
    this.isRunning = true;
    
    this.pollingInterval = setInterval(async () => {
      await this.pollAllServers();
    }, this.DEFAULT_POLLING_INTERVAL);

    // Run initial poll immediately
    this.pollAllServers().catch(error => {
      console.error('❌ [BackupPolling] Initial poll failed:', error);
    });
  }

  // Stop the backup polling system
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('⏹️ [BackupPolling] Stopping backup polling service...');
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Subscribe to a server for backup monitoring
  subscribeToServer(serverId: string): void {
    this.subscribedServers.add(serverId);
    console.log(`📡 [BackupPolling] Subscribed to server ${serverId} for backup monitoring`);
    
    // Initialize server state if not exists
    if (!this.serverStates.has(serverId)) {
      this.serverStates.set(serverId, {
        serverId,
        players: new Set(),
        lastUpdated: new Date(0), // Initialize with epoch
      });
    }
  }

  // Unsubscribe from a server
  unsubscribeFromServer(serverId: string): void {
    this.subscribedServers.delete(serverId);
    this.serverStates.delete(serverId);
    console.log(`📡 [BackupPolling] Unsubscribed from server ${serverId} backup monitoring`);
  }

  // Get list of subscribed servers
  getSubscribedServers(): string[] {
    return Array.from(this.subscribedServers);
  }

  // Check if service is running
  isPollingActive(): boolean {
    return this.isRunning;
  }

  // Poll all subscribed servers for player changes
  private async pollAllServers(): Promise<void> {
    if (!this.isRunning || this.subscribedServers.size === 0) {
      return;
    }

    console.log(`🔄 [BackupPolling] Polling ${this.subscribedServers.size} servers for player changes...`);

    const pollPromises = Array.from(this.subscribedServers).map(serverId => 
      this.pollServer(serverId).catch(error => {
        console.error(`❌ [BackupPolling] Failed to poll server ${serverId}:`, error);
      })
    );

    await Promise.all(pollPromises);
  }

  // Poll a specific server and detect player changes
  private async pollServer(serverId: string): Promise<void> {
    try {
      // Get current players from API
      const currentPlayers = await this.battleMetricsService.getPlayers(serverId);
      const currentPlayerSet = new Set(currentPlayers.map(p => p.name));
      
      // Get previous state
      const previousState = this.serverStates.get(serverId);
      if (!previousState) {
        // First time polling this server - initialize state
        this.serverStates.set(serverId, {
          serverId,
          players: currentPlayerSet,
          lastUpdated: new Date(),
        });
        
        // Record all current players as joins (initial sync)
        for (const player of currentPlayers) {
          await this.playerActivityTracker.recordPlayerJoin(serverId, player.name, player.id);
        }
        
        console.log(`🆕 [BackupPolling] Initialized server ${serverId} with ${currentPlayers.length} players`);
        return;
      }

      const previousPlayers = previousState.players;
      
      // Detect new players (joins)
      const joinedPlayers = Array.from(currentPlayerSet).filter(name => !previousPlayers.has(name));
      
      // Detect left players (leaves)
      const leftPlayers = Array.from(previousPlayers).filter(name => !currentPlayerSet.has(name));

      // Process joins
      for (const playerName of joinedPlayers) {
        const player = currentPlayers.find(p => p.name === playerName);
        await this.playerActivityTracker.recordPlayerJoin(serverId, playerName, player?.id);
        console.log(`🟢 [BackupPolling] Detected join: ${playerName} on server ${serverId}`);
      }

      // Process leaves
      for (const playerName of leftPlayers) {
        await this.playerActivityTracker.recordPlayerLeave(serverId, playerName);
        console.log(`🔴 [BackupPolling] Detected leave: ${playerName} on server ${serverId}`);
      }

      // Update state
      this.serverStates.set(serverId, {
        serverId,
        players: currentPlayerSet,
        lastUpdated: new Date(),
      });

      // Reconcile player state to catch any missed events
      await this.playerActivityTracker.reconcilePlayerState(serverId, currentPlayers);

      if (joinedPlayers.length > 0 || leftPlayers.length > 0) {
        console.log(`📊 [BackupPolling] Server ${serverId}: +${joinedPlayers.length} joins, -${leftPlayers.length} leaves`);
      }

    } catch (error) {
      console.error(`❌ [BackupPolling] Error polling server ${serverId}:`, error);
      
      // If server is unreachable, we might want to mark all current players as offline
      // after a certain number of failed attempts, but for now we'll just log the error
    }
  }

  // Manual trigger for immediate polling (useful for testing)
  async pollNow(): Promise<void> {
    console.log('🔄 [BackupPolling] Manual poll triggered');
    await this.pollAllServers();
  }

  // Get polling statistics
  getStats(): {
    isRunning: boolean;
    subscribedServers: number;
    lastPolled: Date | null;
    pollingInterval: number;
  } {
    const lastPolled = this.serverStates.size > 0 
      ? new Date(Math.max(...Array.from(this.serverStates.values()).map(s => s.lastUpdated.getTime())))
      : null;

    return {
      isRunning: this.isRunning,
      subscribedServers: this.subscribedServers.size,
      lastPolled,
      pollingInterval: this.DEFAULT_POLLING_INTERVAL,
    };
  }
}