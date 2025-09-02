import WebSocket from 'ws';
import { playerActivityTracker } from './playerActivityTracker';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private subscribedServers: Set<string> = new Set();
  private processedEvents: Set<string> = new Set();

  connect(): void {
    try {
      this.ws = new WebSocket('wss://ws.battlemetrics.com/cable', {
        headers: {
          'Origin': 'https://battlemetrics.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      this.ws.on('open', () => {
        console.log('✓ Connected to BattleMetrics WebSocket');

        // Re-subscribe to all previously subscribed servers
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

      this.ws.on('close', () => {
        console.log('WebSocket connection closed, attempting to reconnect in 5 seconds...');
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

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    this.reconnectInterval = setTimeout(() => {
      console.log('Attempting to reconnect to BattleMetrics WebSocket...');
      this.connect();
    }, 5000);
  }

  subscribeToServer(serverId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        type: 'subscribe',
        channels: [`server:${serverId}`]
      };

      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedServers.add(serverId);
      playerActivityTracker.setActiveServer(serverId);
      console.log(`📡 Subscribed to server ${serverId} for player tracking`);
    } else {
      console.warn('WebSocket not connected, cannot subscribe to server');
    }
  }

  unsubscribeFromServer(serverId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        channels: [`server:${serverId}`]
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.subscribedServers.delete(serverId);
      console.log(`Unsubscribed from server ${serverId}`);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      if (message.type === 'player_activity') {
        const { player, server, action, timestamp } = message.data;

        // Create unique event ID to prevent duplicate processing
        const eventId = `${server.id}_${player.id}_${action}_${timestamp}`;

        if (this.processedEvents.has(eventId)) {
          return; // Skip duplicate event
        }

        this.processedEvents.add(eventId);

        // Clean up old processed events (keep only last 1000)
        if (this.processedEvents.size > 1000) {
          const eventsArray = Array.from(this.processedEvents);
          this.processedEvents = new Set(eventsArray.slice(-1000));
        }

        if (action === 'joined') {
          await playerActivityTracker.handlePlayerJoin(player.name, player.id, server.id);
        } else if (action === 'left') {
          await playerActivityTracker.handlePlayerLeave(player.name, player.id, server.id);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  getSubscribedServers(): string[] {
    return Array.from(this.subscribedServers);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
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

    console.log('WebSocket disconnected');
  }
}

export const webSocketManager = new WebSocketManager();