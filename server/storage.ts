import { 
  trades, 
  connections, 
  configurations, 
  stats,
  accounts,
  accountConfigurations,
  type Trade, 
  type InsertTrade,
  type Connection,
  type InsertConnection,
  type Configuration,
  type InsertConfiguration,
  type Stats,
  type InsertStats,
  type Account,
  type InsertAccount,
  type AccountConfiguration,
  type InsertAccountConfiguration
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(limit?: number, offset?: number): Promise<Trade[]>;
  getTradesByDate(date: string): Promise<Trade[]>;
  getTradesByAccount(accountId: number, limit?: number): Promise<Trade[]>;
  
  // Accounts
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  getAllAccounts(): Promise<Account[]>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;
  
  // Connections
  upsertConnection(connection: InsertConnection): Promise<Connection>;
  getConnection(platform: string): Promise<Connection | undefined>;
  getConnectionByAccount(accountId: number): Promise<Connection | undefined>;
  getAllConnections(): Promise<Connection[]>;
  getConnectionsByAccount(accountId: number): Promise<Connection[]>;
  
  // Account Configurations
  getAccountConfiguration(accountId: number): Promise<AccountConfiguration | undefined>;
  updateAccountConfiguration(accountId: number, config: Partial<InsertAccountConfiguration>): Promise<AccountConfiguration>;
  
  // Global Configuration
  getConfiguration(): Promise<Configuration | undefined>;
  updateConfiguration(config: Partial<InsertConfiguration>): Promise<Configuration>;
  
  // Stats
  getStatsByDate(date: string): Promise<Stats | undefined>;
  updateStats(date: string, stats: Partial<InsertStats>): Promise<Stats>;
  
  // Utilities
  clearTrades(): Promise<void>;
  clearTradesByAccount(accountId: number): Promise<void>;
  
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
      takeProfit: insertTrade.takeProfit ?? null,
      stopLoss: insertTrade.stopLoss ?? null,
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

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<any> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any> {
    return undefined;
  }

  async createUser(user: any): Promise<any> {
    return user;
  }

  // Account management
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values(insertAccount)
      .returning();
    return account;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    return account;
  }

  async getAllAccounts(): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true));
  }

  async updateAccount(id: number, updateAccount: Partial<InsertAccount>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set(updateAccount)
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  async deleteAccount(id: number): Promise<void> {
    await db
      .update(accounts)
      .set({ isActive: false })
      .where(eq(accounts.id, id));
  }

  // Trades
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db
      .insert(trades)
      .values(insertTrade)
      .returning();
    return trade;
  }

  async getTrades(limit: number = 50, offset: number = 0): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .orderBy(desc(trades.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getTradesByDate(date: string): Promise<Trade[]> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    return await db
      .select()
      .from(trades)
      .where(eq(trades.timestamp, startDate));
  }

  async getTradesByAccount(accountId: number, limit: number = 50): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.accountId, accountId))
      .orderBy(desc(trades.timestamp))
      .limit(limit);
  }

  // Connections
  async upsertConnection(insertConnection: InsertConnection): Promise<Connection> {
    const existing = await db
      .select()
      .from(connections)
      .where(eq(connections.accountId, insertConnection.accountId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(connections)
        .set({
          ...insertConnection,
          lastUpdate: new Date(),
        })
        .where(eq(connections.accountId, insertConnection.accountId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(connections)
        .values({
          ...insertConnection,
          lastUpdate: new Date(),
        })
        .returning();
      return created;
    }
  }

  async getConnection(platform: string): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.platform, platform))
      .limit(1);
    return connection;
  }

  async getConnectionByAccount(accountId: number): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.accountId, accountId))
      .limit(1);
    return connection;
  }

  async getAllConnections(): Promise<Connection[]> {
    return await db.select().from(connections);
  }

  async getConnectionsByAccount(accountId: number): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(eq(connections.accountId, accountId));
  }

  // Account Configurations
  async getAccountConfiguration(accountId: number): Promise<AccountConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(accountConfigurations)
      .where(eq(accountConfigurations.accountId, accountId))
      .limit(1);
    
    if (!config) {
      // Create default configuration for the account
      const defaultConfig = {
        accountId,
        riskMultiplier: "1.0",
        mt5Server: null,
        mt5Login: null,
        mt5Password: null,
        avaEndpoint: null,
        avaAccountId: null,
        avaApiKey: null,
      };
      
      const [created] = await db
        .insert(accountConfigurations)
        .values(defaultConfig)
        .returning();
      return created;
    }
    
    return config;
  }

  async updateAccountConfiguration(accountId: number, config: Partial<InsertAccountConfiguration>): Promise<AccountConfiguration> {
    const existing = await this.getAccountConfiguration(accountId);
    
    if (existing) {
      const [updated] = await db
        .update(accountConfigurations)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(accountConfigurations.accountId, accountId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(accountConfigurations)
        .values({
          accountId,
          ...config,
        })
        .returning();
      return created;
    }
  }

  // Global Configuration
  async getConfiguration(): Promise<Configuration | undefined> {
    const [config] = await db
      .select()
      .from(configurations)
      .limit(1);
    
    if (!config) {
      const defaultConfig = {
        isMirrorActive: false,
        isAutoReconnectEnabled: true,
        riskMultiplier: "1.0",
        enableTakeProfit: false,
        takeProfitPoints: 100,
        enableStopLoss: false,
        stopLossPoints: 50,
        enableTrailingStop: false,
        trailingStopPoints: 30,
        maxSlippage: 3,
      };
      
      const [created] = await db
        .insert(configurations)
        .values(defaultConfig)
        .returning();
      return created;
    }
    
    return config;
  }

  async updateConfiguration(config: Partial<InsertConfiguration>): Promise<Configuration> {
    const existing = await this.getConfiguration();
    
    if (existing) {
      const [updated] = await db
        .update(configurations)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(configurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(configurations)
        .values(config)
        .returning();
      return created;
    }
  }

  async getStatsByDate(date: string): Promise<Stats | undefined> {
    const [stat] = await db
      .select()
      .from(stats)
      .where(eq(stats.date, date))
      .limit(1);
    return stat;
  }

  async updateStats(date: string, updateStats: Partial<InsertStats>): Promise<Stats> {
    const existing = await this.getStatsByDate(date);
    
    if (existing) {
      const [updated] = await db
        .update(stats)
        .set(updateStats)
        .where(eq(stats.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(stats)
        .values({
          date,
          tradesCount: 0,
          successfulTrades: 0,
          failedTrades: 0,
          avgLatency: 0,
          ...updateStats,
        })
        .returning();
      return created;
    }
  }

  async clearTrades(): Promise<void> {
    await db.delete(trades);
  }

  async clearTradesByAccount(accountId: number): Promise<void> {
    await db.delete(trades).where(eq(trades.accountId, accountId));
  }
}

export const storage = new DatabaseStorage();
