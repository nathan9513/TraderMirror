import { EventEmitter } from 'events';

export interface MetaTraderConfig {
  server: string;
  login: string;
  password: string;
}

export interface MetaTraderTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  timestamp: Date;
}

export class MetaTraderClient extends EventEmitter {
  private config: MetaTraderConfig | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: NodeJS.Timeout | null = null;

  async connect(config: MetaTraderConfig): Promise<void> {
    this.config = config;
    
    try {
      // Simulate connection process
      console.log(`Connecting to MetaTrader server: ${config.server}`);
      
      // In a real implementation, this would connect to MT5 API
      // For now, we'll simulate a successful connection
      await this.simulateConnection();
      
      this.connected = true;
      this.reconnectAttempts = 0;
      this.startPinging();
      
      this.emit('connected', {
        platform: 'MetaTrader',
        server: config.server,
        account: this.maskAccount(config.login),
      });
      
      // Start simulating incoming trades for demo purposes
      this.startTradeSimulation();
      
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
    this.emit('disconnected', { platform: 'MetaTrader' });
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
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.connect(this.config);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<{ success: boolean; latency: number }> {
    if (!this.connected) {
      throw new Error('Not connected to MetaTrader');
    }

    const startTime = Date.now();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
    
    const latency = Date.now() - startTime;
    
    return { success: true, latency };
  }

  private async simulateConnection(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional connection failures
    if (Math.random() < 0.1) {
      throw new Error('Connection failed: Invalid credentials');
    }
  }

  private startPinging(): void {
    this.pingInterval = setInterval(async () => {
      try {
        const { latency } = await this.testConnection();
        this.emit('ping', { platform: 'MetaTrader', latency });
      } catch (error) {
        this.emit('connectionLost', { platform: 'MetaTrader', error });
        this.connected = false;
      }
    }, 30000); // Ping every 30 seconds
  }

  private startTradeSimulation(): void {
    // Simulate incoming trades every 10-60 seconds
    const scheduleNextTrade = () => {
      const delay = 10000 + Math.random() * 50000; // 10-60 seconds
      setTimeout(() => {
        if (this.connected) {
          this.simulateIncomingTrade();
          scheduleNextTrade();
        }
      }, delay);
    };

    scheduleNextTrade();
  }

  private simulateIncomingTrade(): void {
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'AUDCAD', 'EURJPY', 'GBPJPY'];
    const types: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];
    
    const trade: MetaTraderTrade = {
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      type: types[Math.floor(Math.random() * types.length)],
      volume: Math.round((Math.random() * 2 + 0.1) * 100) / 100, // 0.1 - 2.1
      price: Math.round((Math.random() * 2 + 1) * 10000) / 10000, // Random price
      timestamp: new Date(),
    };

    console.log(`Master generating trade: ${trade.symbol} ${trade.type} ${trade.volume} at ${trade.price}`);
    this.emit('trade', trade);
  }

  private maskAccount(account: string): string {
    if (account.length <= 4) return account;
    return '****' + account.slice(-4);
  }
}
