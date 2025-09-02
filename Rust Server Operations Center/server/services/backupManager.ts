import { WebSocketManager } from './websocketManager.js';
import { BackupPollingService } from './backupPollingService.js';

export type SystemMode = 'websocket' | 'backup' | 'hybrid';

export class BackupManager {
  private webSocketManager: WebSocketManager;
  private backupPollingService: BackupPollingService;
  private currentMode: SystemMode = 'websocket';
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private failureCount: number = 0;
  private readonly MAX_FAILURES = 3;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
    this.backupPollingService = new BackupPollingService();
    
    console.log('🔧 [BackupManager] Initialized backup management system');
  }

  // Start the backup management system
  start(): void {
    console.log('🚀 [BackupManager] Starting backup management system...');
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Initially try WebSocket mode
    this.switchToWebSocketMode();
  }

  // Stop the backup management system
  stop(): void {
    console.log('⏹️ [BackupManager] Stopping backup management system...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.backupPollingService.stop();
    this.webSocketManager.disconnect();
  }

  // Subscribe to a server (routes to appropriate system)
  subscribeToServer(serverId: string): void {
    console.log(`📡 [BackupManager] Subscribing to server ${serverId} in ${this.currentMode} mode`);
    
    if (this.currentMode === 'websocket' || this.currentMode === 'hybrid') {
      this.webSocketManager.subscribeToServer(serverId);
    }
    
    if (this.currentMode === 'backup' || this.currentMode === 'hybrid') {
      this.backupPollingService.subscribeToServer(serverId);
    }
  }

  // Unsubscribe from a server
  unsubscribeFromServer(serverId: string): void {
    console.log(`📡 [BackupManager] Unsubscribing from server ${serverId}`);
    
    this.webSocketManager.unsubscribeFromServer(serverId);
    this.backupPollingService.unsubscribeFromServer(serverId);
  }

  // Switch to WebSocket mode
  private async switchToWebSocketMode(): Promise<void> {
    console.log('🔄 [BackupManager] Switching to WebSocket mode...');
    
    try {
      // Stop backup polling if running
      this.backupPollingService.stop();
      
      // Start or reconnect WebSocket
      await this.webSocketManager.connect();
      
      this.currentMode = 'websocket';
      this.failureCount = 0;
      
      console.log('✅ [BackupManager] Successfully switched to WebSocket mode');
    } catch (error) {
      console.error('❌ [BackupManager] Failed to switch to WebSocket mode:', error);
      this.handleWebSocketFailure();
    }
  }

  // Switch to backup polling mode
  private switchToBackupMode(): void {
    console.log('🔄 [BackupManager] Switching to backup polling mode...');
    
    // Disconnect WebSocket
    this.webSocketManager.disconnect();
    
    // Start backup polling
    this.backupPollingService.start();
    
    // Subscribe backup service to all servers that WebSocket was monitoring
    const subscribedServers = this.webSocketManager.getSubscribedServers();
    for (const serverId of subscribedServers) {
      this.backupPollingService.subscribeToServer(serverId);
    }
    
    this.currentMode = 'backup';
    
    console.log('✅ [BackupManager] Successfully switched to backup polling mode');
  }

  // Switch to hybrid mode (both systems running)
  private switchToHybridMode(): void {
    console.log('🔄 [BackupManager] Switching to hybrid mode...');
    
    // Start backup polling as secondary system
    this.backupPollingService.start();
    
    // Subscribe backup service to all servers
    const subscribedServers = this.webSocketManager.getSubscribedServers();
    for (const serverId of subscribedServers) {
      this.backupPollingService.subscribeToServer(serverId);
    }
    
    this.currentMode = 'hybrid';
    
    console.log('✅ [BackupManager] Successfully switched to hybrid mode');
  }

  // Handle WebSocket failures
  private handleWebSocketFailure(): void {
    this.failureCount++;
    
    console.log(`⚠️ [BackupManager] WebSocket failure #${this.failureCount}/${this.MAX_FAILURES}`);
    
    if (this.failureCount >= this.MAX_FAILURES) {
      console.log('🚨 [BackupManager] Max WebSocket failures reached, switching to backup mode');
      this.switchToBackupMode();
    } else {
      // Try hybrid mode after first failure
      if (this.failureCount === 1 && this.currentMode === 'websocket') {
        console.log('🔀 [BackupManager] First failure detected, switching to hybrid mode');
        this.switchToHybridMode();
      }
    }
  }

  // Start health monitoring
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
    
    console.log('❤️ [BackupManager] Started health monitoring');
  }

  // Perform health check
  private performHealthCheck(): void {
    const wsConnected = this.webSocketManager.isConnected();
    const backupActive = this.backupPollingService.isPollingActive();
    
    console.log(`❤️ [BackupManager] Health check: WebSocket=${wsConnected}, Backup=${backupActive}, Mode=${this.currentMode}`);
    
    if (this.currentMode === 'websocket' && !wsConnected) {
      this.handleWebSocketFailure();
    } else if (this.currentMode === 'backup' && !backupActive) {
      console.log('⚠️ [BackupManager] Backup polling stopped, attempting to restart...');
      this.backupPollingService.start();
    } else if (this.currentMode === 'websocket' && wsConnected && this.failureCount > 0) {
      // WebSocket recovered
      console.log('🎉 [BackupManager] WebSocket connection recovered, resetting failure count');
      this.failureCount = 0;
    }

    // Try to recover to WebSocket mode if we're in backup mode and WebSocket is healthy
    if (this.currentMode === 'backup' && this.failureCount >= this.MAX_FAILURES) {
      // Periodically try to restore WebSocket connection
      if (Date.now() % (5 * 60 * 1000) < this.HEALTH_CHECK_INTERVAL) { // Every 5 minutes
        console.log('🔄 [BackupManager] Attempting to restore WebSocket connection...');
        this.switchToWebSocketMode();
      }
    }
  }

  // Force mode switch (for manual control or testing)
  async forceModeSwitch(mode: SystemMode): Promise<void> {
    console.log(`🔧 [BackupManager] Force switching to ${mode} mode`);
    
    this.failureCount = 0; // Reset failure count for manual switches
    
    switch (mode) {
      case 'websocket':
        await this.switchToWebSocketMode();
        break;
      case 'backup':
        this.switchToBackupMode();
        break;
      case 'hybrid':
        this.switchToHybridMode();
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  // Get current system status
  getStatus(): {
    currentMode: SystemMode;
    webSocketConnected: boolean;
    backupActive: boolean;
    failureCount: number;
    subscribedServers: string[];
    lastHealthCheck: Date;
  } {
    return {
      currentMode: this.currentMode,
      webSocketConnected: this.webSocketManager.isConnected(),
      backupActive: this.backupPollingService.isPollingActive(),
      failureCount: this.failureCount,
      subscribedServers: this.webSocketManager.getSubscribedServers(),
      lastHealthCheck: new Date(),
    };
  }

  // Get detailed statistics
  getDetailedStats(): {
    backupManager: ReturnType<BackupManager['getStatus']>;
    backupPolling: ReturnType<BackupPollingService['getStats']>;
  } {
    return {
      backupManager: this.getStatus(),
      backupPolling: this.backupPollingService.getStats(),
    };
  }

  // Manual trigger for backup polling (useful for testing)
  async triggerBackupPoll(): Promise<void> {
    console.log('🔄 [BackupManager] Manual backup poll triggered');
    await this.backupPollingService.pollNow();
  }
}