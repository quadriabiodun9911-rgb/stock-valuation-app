// Real-time WebSocket service for stock price updates and alerts
import { API_URL as API_BASE_URL } from './api';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: string;
  change: number;
  change_percent: number;
  volume: number;
  bid: number;
  ask: number;
}

export interface Alert {
  alert_id: string;
  symbol: string;
  alert_type: string;
  message: string;
  timestamp: string;
  current_value: number;
  threshold: number;
}

export interface StockAlert {
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'volume_spike' | 'rsi_overbought' | 'rsi_oversold';
  threshold: number;
  enabled?: boolean;
}

type MessageHandler = (data: PriceUpdate | Alert | any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private symbol: string | null = null;
  private priceHandlers: Set<MessageHandler> = new Set();
  private alertHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Convert HTTP to WS protocol
    this.url = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  }

  /**
   * Connect to WebSocket for a specific stock symbol
   */
  connect(symbol: string, onOpen?: () => void, onError?: (error: Event) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log(`Already connected to ${this.symbol}`);
          resolve();
          return;
        }

        this.symbol = symbol.toUpperCase();
        const wsUrl = `${this.url}/realtime/ws/price/${this.symbol}`;

        console.log(`[WebSocket] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`[WebSocket] Connected to ${this.symbol}`);
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
          onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event: WebSocketMessageEvent) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'price_update') {
              console.log(`[WebSocket] Price update for ${message.data.symbol}:`, message.data.price);
              this.priceHandlers.forEach(handler => handler(message.data));
            } else if (message.type === 'alert') {
              console.log(`[WebSocket] Alert received:`, message.data.message);
              this.alertHandlers.forEach(handler => handler(message.data));
            } else if (message.type === 'pong') {
              console.log('[WebSocket] Pong received');
            }
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.error(`[WebSocket] Error:`, error);
          onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(`[WebSocket] Connection closed for ${this.symbol}`);
          this.clearHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WebSocket] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.symbol = null;
    this.priceHandlers.clear();
    this.alertHandlers.clear();
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Subscribe to price updates
   */
  onPriceUpdate(handler: MessageHandler): () => void {
    this.priceHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.priceHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to alerts
   */
  onAlert(handler: MessageHandler): () => void {
    this.alertHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.alertHandlers.delete(handler);
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current symbol
   */
  getCurrentSymbol(): string | null {
    return this.symbol;
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws?.send('ping');
        } catch (error) {
          console.error('[WebSocket] Failed to send heartbeat:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.symbol) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        if (this.symbol) {
          this.connect(this.symbol).catch(error => {
            console.error('[WebSocket] Reconnection failed:', error);
          });
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();

/**
 * Alert Management Service
 */
export class AlertService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
  }

  /**
   * Set a price alert
   */
  async setPriceAlert(alert: StockAlert): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/alerts/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Failed to set alert: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to set alert:', error);
      throw error;
    }
  }

  /**
   * Get all alerts for a symbol
   */
  async getAlerts(symbol: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/alerts/${symbol}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to get alerts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to get alerts:', error);
      throw error;
    }
  }

  /**
   * Get latest price
   */
  async getLatestPrice(symbol: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/price/latest/${symbol}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to get price: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to get price:', error);
      throw error;
    }
  }

  /**
   * Start streaming a stock
   */
  async startStreaming(symbol: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/stream/start/${symbol}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to start streaming: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to start streaming:', error);
      throw error;
    }
  }

  /**
   * Stop streaming a stock
   */
  async stopStreaming(symbol: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/stream/stop/${symbol}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to stop streaming: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to stop streaming:', error);
      throw error;
    }
  }

  /**
   * Get active streams
   */
  async getActiveStreams(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/realtime/streams/active`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to get active streams: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AlertService] Failed to get active streams:', error);
      throw error;
    }
  }
}

export const alertService = new AlertService();
