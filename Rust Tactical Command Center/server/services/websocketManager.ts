import WebSocket from 'ws';
import { PlayerActivityTracker } from './playerActivityTracker.js';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private subscribedServers: Set<string> = new Set();
  private playerActivityTracker: PlayerActivityTracker;
  private processedEvents: Set<string> = new Set(); // Track processed events to prevent duplicates

  constructor() {
    this.playerActivityTracker = new PlayerActivityTracker();
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to BattleMetrics WebSocket for persistent tracking...');
      
      this.ws = new WebSocket('wss://ws.battlemetrics.com/cable', {
        headers: {
          'Origin': 'https://battlemetrics.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      this.ws.on('open', () => {
        console.log('✓ Connected to BattleMetrics WebSocket (persistent)');
        this.scheduleHeartbeat();
        
        // Re-subscribe to all servers that were previously subscribed
        this.subscribedServers.forEach(serverId => {
          this.subscribeToServer(serverId);
        });
      });

      this.ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket disconnected: ${code} - ${reason}`);
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleHeartbeat(): void {
    // Send periodic pings to keep connection alive
    const heartbeat = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Every 30 seconds
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    this.reconnectInterval = setTimeout(() => {
      console.log('Attempting to reconnect to BattleMetrics WebSocket...');
      this.connect();
    }, 5000); // Reconnect after 5 seconds
  }

  subscribeToServer(serverId: string): void {
    this.subscribedServers.add(serverId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        command: 'subscribe',
        identifier: JSON.stringify({
          channel: 'ServerEventsChannel',
          id: serverId
        })
      };

      console.log(`Subscribing to server events for server ${serverId} (persistent)`);
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  unsubscribeFromServer(serverId: string): void {
    this.subscribedServers.delete(serverId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        command: 'unsubscribe',
        identifier: JSON.stringify({
          channel: 'ServerEventsChannel',
          id: serverId
        })
      };

      console.log(`Unsubscribing from server events for server ${serverId}`);
      this.ws.send(JSON.stringify(unsubscribeMessage));
    }
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      if (message.type === 'ping') {
        // Respond to ping
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      if (message.type === 'welcome') {
        console.log('WebSocket welcomed - ready for subscriptions');
        return;
      }

      if (message.type === 'confirm_subscription') {
        console.log('Subscription confirmed for channel:', message.identifier);
        return;
      }

      // Handle server events
      if (message.message && message.message.type === 'SERVER_EVENT') {
        const event = message.message;
        const eventId = `${event.serverId}-${event.timestamp}-${event.playerId}-${event.type}`;
        
        // Check for duplicate events
        if (this.processedEvents.has(eventId)) {
          return; // Skip duplicate
        }
        this.processedEvents.add(eventId);
        
        // Clean up old processed events (keep only last 1000)
        if (this.processedEvents.size > 1000) {
          const eventsArray = Array.from(this.processedEvents);
          eventsArray.slice(0, 500).forEach(id => this.processedEvents.delete(id));
        }

        await this.handleServerEvent(event);
      }

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private async handleServerEvent(event: any): Promise<void> {
    try {
      const { type, serverId, playerId, name: playerName, timestamp } = event;

      // Validate player data before processing
      if (!playerName || typeof playerName !== 'string') {
        console.warn(`⚠️ [WebSocket] Invalid player name for event: ${JSON.stringify({ type, serverId, playerId, playerName })}`);
        return; // Skip events with invalid player names
      }

      if (type === 'addPlayer') {
        await this.playerActivityTracker.recordPlayerJoin(serverId, playerName, playerId);
        console.log(`[Persistent] Player ${playerName} joined server ${serverId}`);
      } else if (type === 'removePlayer') {
        await this.playerActivityTracker.recordPlayerLeave(serverId, playerName, playerId);
        console.log(`[Persistent] Player ${playerName} left server ${serverId}`);
      }

    } catch (error) {
      console.error('Error processing server event:', error);
    }
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedServers.clear();
    console.log('WebSocket disconnected and cleaned up');
  }

  getSubscribedServers(): string[] {
    return Array.from(this.subscribedServers);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Provide access to the player activity tracker for external use
  getPlayerActivityTracker(): PlayerActivityTracker {
    return this.playerActivityTracker;
  }
}

export const webSocketManager = new WebSocketManager();