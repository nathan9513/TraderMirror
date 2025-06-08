import { 
  trades, 
  connections, 
  configurations, 
  stats,
  type Trade, 
  type InsertTrade,
  type Connection,
  type InsertConnection,
  type Configuration,
  type InsertConfiguration,
  type Stats,
  type InsertStats
} from "@shared/schema";

export interface IStorage {
  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(limit?: number, offset?: number): Promise<Trade[]>;
  getTradesByDate(date: string): Promise<Trade[]>;
  
  // Connections
  upsertConnection(connection: InsertConnection): Promise<Connection>;
  getConnection(platform: string): Promise<Connection | undefined>;
  getAllConnections(): Promise<Connection[]>;
  
  // Configuration
  getConfiguration(): Promise<Configuration | undefined>;
  updateConfiguration(config: Partial<InsertConfiguration>): Promise<Configuration>;
  
  // Stats
  getStatsByDate(date: string): Promise<Stats | undefined>;
  updateStats(date: string, stats: Partial<InsertStats>): Promise<Stats>;
  
  // Utilities
  clearTrades(): Promise<void>;
  
  // Users (inherited from existing schema)
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private trades: Map<number, Trade> = new Map();
  private connections: Map<string, Connection> = new Map();
  private configuration: Configuration | undefined;
  private stats: Map<string, Stats> = new Map();
  private users: Map<number, any> = new Map();
  
  private currentTradeId = 1;
  private currentConnectionId = 1;
  private currentStatsId = 1;
  private currentUserId = 1;

  constructor() {
    // Initialize default configuration
    this.configuration = {
      id: 1,
      isMirrorActive: false,
      isAutoReconnectEnabled: true,
      riskMultiplier: "1.0",
      
      // Trading Features
      enableTakeProfit: false,
      takeProfitPoints: 100,
      enableStopLoss: false,
      stopLossPoints: 50,
      enableTrailingStop: false,
      trailingStopPoints: 30,
      maxSlippage: 3,
      
      // Connection Settings
      mt5Server: null,
      mt5Login: null,
      mt5Password: null,
      avaEndpoint: null,
      avaAccountId: null,
      avaApiKey: null,
      updatedAt: new Date(),
    };

    // Initialize default connections
    this.connections.set("MetaTrader", {
      id: 1,
      platform: "MetaTrader",
      status: "Disconnected",
      server: null,
      account: null,
      lastPing: null,
      lastUpdate: new Date(),
    });

    this.connections.set("AvaFeatures", {
      id: 2,
      platform: "AvaFeatures",
      status: "Disconnected",
      server: null,
      account: null,
      lastPing: null,
      lastUpdate: new Date(),
    });
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const trade: Trade = {
      id: this.currentTradeId++,
      symbol: insertTrade.symbol,
      type: insertTrade.type,
      volume: insertTrade.volume,
      price: insertTrade.price,
      status: insertTrade.status,
      latency: insertTrade.latency ?? null,
      sourcePlatform: insertTrade.sourcePlatform || 'MetaTrader',
      targetPlatform: insertTrade.targetPlatform || 'AvaFeatures',
      errorMessage: insertTrade.errorMessage ?? null,
      timestamp: new Date(),
    };
    this.trades.set(trade.id, trade);
    return trade;
  }

  async getTrades(limit: number = 50, offset: number = 0): Promise<Trade[]> {
    const allTrades = Array.from(this.trades.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allTrades.slice(offset, offset + limit);
  }

  async getTradesByDate(date: string): Promise<Trade[]> {
    const targetDate = new Date(date);
    return Array.from(this.trades.values()).filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      return tradeDate.toDateString() === targetDate.toDateString();
    });
  }

  async upsertConnection(insertConnection: InsertConnection): Promise<Connection> {
    const existing = this.connections.get(insertConnection.platform);
    const connection: Connection = {
      id: existing?.id || this.currentConnectionId++,
      platform: insertConnection.platform,
      status: insertConnection.status,
      server: insertConnection.server ?? null,
      account: insertConnection.account ?? null,
      lastPing: insertConnection.lastPing ?? null,
      lastUpdate: new Date(),
    };
    this.connections.set(insertConnection.platform, connection);
    return connection;
  }

  async getConnection(platform: string): Promise<Connection | undefined> {
    return this.connections.get(platform);
  }

  async getAllConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async getConfiguration(): Promise<Configuration | undefined> {
    return this.configuration;
  }

  async updateConfiguration(config: Partial<InsertConfiguration>): Promise<Configuration> {
    this.configuration = {
      ...this.configuration!,
      ...config,
      updatedAt: new Date(),
    };
    return this.configuration;
  }

  async getStatsByDate(date: string): Promise<Stats | undefined> {
    return this.stats.get(date);
  }

  async updateStats(date: string, updateStats: Partial<InsertStats>): Promise<Stats> {
    const existing = this.stats.get(date);
    const stats: Stats = {
      id: existing?.id || this.currentStatsId++,
      date,
      tradesCount: 0,
      successfulTrades: 0,
      failedTrades: 0,
      avgLatency: 0,
      ...existing,
      ...updateStats,
    };
    this.stats.set(date, stats);
    return stats;
  }

  // Inherited user methods
  async getUser(id: number): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: any): Promise<any> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async clearTrades(): Promise<void> {
    this.trades.clear();
    this.currentTradeId = 1;
  }
}

export const storage = new MemStorage();
