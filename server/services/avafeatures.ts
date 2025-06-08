import { EventEmitter } from 'events';

export interface AvaFeaturesConfig {
  endpoint: string;
  accountId: string;
  apiKey: string;
}

export interface AvaFeaturesTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
}

export class AvaFeaturesClient extends EventEmitter {
  private config: AvaFeaturesConfig | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: NodeJS.Timeout | null = null;

  async connect(config: AvaFeaturesConfig): Promise<void> {
    this.config = config;
    
    try {
      console.log(`Connecting to AvaFeatures: ${config.endpoint}`);
      
      // Simulate API connection
      await this.simulateConnection();
      
      this.connected = true;
      this.reconnectAttempts = 0;
      this.startPinging();
      
      this.emit('connected', {
        platform: 'AvaFeatures',
        server: this.extractServerName(config.endpoint),
        account: this.maskAccount(config.accountId),
      });
      
    } catch (error) {
      this.connected = false;
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.emit('disconnected', { platform: 'AvaFeatures' });
  }

  async reconnect(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration available for reconnection');
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Maximum reconnection attempts reached');
    }

    this.reconnectAttempts++;
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.connect(this.config);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async executeTrade(trade: AvaFeaturesTrade): Promise<{ success: boolean; latency: number; error?: string }> {
    if (!this.connected) {
      throw new Error('Not connected to AvaFeatures');
    }

    const startTime = Date.now();
    
    try {
      // Simulate API call to execute trade
      await this.simulateTradeExecution(trade);
      
      const latency = Date.now() - startTime;
      return { success: true, latency };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        success: false, 
        latency, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; latency: number }> {
    if (!this.connected) {
      throw new Error('Not connected to AvaFeatures');
    }

    const startTime = Date.now();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    
    const latency = Date.now() - startTime;
    
    return { success: true, latency };
  }

  private async simulateConnection(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
    
    // Simulate occasional connection failures
    if (Math.random() < 0.1) {
      throw new Error('Connection failed: Invalid API key');
    }
  }

  private async simulateTradeExecution(trade: AvaFeaturesTrade): Promise<void> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Simulate occasional trade failures (5% failure rate)
    if (Math.random() < 0.05) {
      const errors = [
        'Insufficient margin',
        'Market closed',
        'Invalid symbol',
        'Price moved too much',
        'Connection timeout'
      ];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
  }

  private startPinging(): void {
    this.pingInterval = setInterval(async () => {
      try {
        const { latency } = await this.testConnection();
        this.emit('ping', { platform: 'AvaFeatures', latency });
      } catch (error) {
        this.emit('connectionLost', { platform: 'AvaFeatures', error });
        this.connected = false;
      }
    }, 30000);
  }

  private extractServerName(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      return url.hostname.replace('api.', '').replace('.com', '');
    } catch {
      return 'unknown';
    }
  }

  private maskAccount(account: string): string {
    if (account.length <= 4) return account;
    return '****' + account.slice(-4);
  }
}
