import { EventEmitter } from "events";
import { WebSocketServer } from "ws";
import type { IStorage } from "../storage";
import { MetaTraderClient, type MetaTraderTrade } from "./metatrader";
import { AvaFeaturesClient, type AvaFeaturesTrade } from "./avafeatures";
import type { Account, AccountConfiguration } from "@shared/schema";

export class TradeReplicatorService extends EventEmitter {
  private storage: IStorage;
  private wss: WebSocketServer;
  private masterMetaTraderClient: MetaTraderClient;
  private replicaClients: Map<number, { mt5?: MetaTraderClient; ava?: AvaFeaturesClient }> = new Map();
  private isRunning = false;

  constructor(storage: IStorage, wss: WebSocketServer) {
    super();
    this.storage = storage;
    this.wss = wss;
    this.masterMetaTraderClient = new MetaTraderClient();
    this.setupMasterTradeListener();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('Starting Trade Replicator Service...');
    this.isRunning = true;
    
    // Load and initialize all account connections
    await this.initializeAccountConnections();
    
    // Start monitoring for master account trades
    await this.startMasterConnection();
    
    this.emit('serviceStarted');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('Stopping Trade Replicator Service...');
    this.isRunning = false;
    
    // Disconnect master connection
    await this.masterMetaTraderClient.disconnect();
    
    // Disconnect all replica connections
    for (const [accountId, clients] of this.replicaClients) {
      if (clients.mt5) await clients.mt5.disconnect();
      if (clients.ava) await clients.ava.disconnect();
    }
    
    this.replicaClients.clear();
    this.emit('serviceStopped');
  }

  private async initializeAccountConnections(): Promise<void> {
    try {
      const accounts = await this.storage.getAllAccounts();
      
      // First, find and setup master account
      const masterAccount = accounts.find(acc => acc.isMaster && acc.isActive);
      if (masterAccount) {
        console.log(`Setting up master account: ${masterAccount.name}`);
        await this.startMasterConnection();
      } else {
        console.warn('No active master account found');
      }

      // Then setup slave accounts (non-master accounts)
      const slaveAccounts = accounts.filter(acc => !acc.isMaster && acc.isActive);
      for (const account of slaveAccounts) {
        console.log(`Setting up slave account: ${account.name}`);
        await this.setupAccountConnection(account);
      }
      
      console.log(`Initialized master account and ${slaveAccounts.length} slave accounts`);
    } catch (error) {
      console.error('Failed to initialize account connections:', error);
    }
  }

  private async setupAccountConnection(account: Account): Promise<void> {
    try {
      const config = await this.storage.getAccountConfiguration(account.id);
      if (!config) return;

      const clients = this.replicaClients.get(account.id) || {};

      if (account.platform === 'MetaTrader' && config.mt5Server && config.mt5Login && config.mt5Password) {
        const mtClient = new MetaTraderClient();
        
        // Update connection status to connecting
        await this.storage.upsertConnection({
          accountId: account.id,
          platform: account.platform,
          status: 'Connecting',
          server: config.mt5Server,
          account: config.mt5Login,
          lastPing: Date.now()
        });

        try {
          await mtClient.connect({
            server: config.mt5Server,
            login: config.mt5Login,
            password: config.mt5Password
          });
          
          clients.mt5 = mtClient;
          
          // Update connection status to connected
          await this.storage.upsertConnection({
            accountId: account.id,
            platform: account.platform,
            status: 'Connected',
            server: config.mt5Server,
            account: config.mt5Login,
            lastPing: Date.now()
          });
          
          console.log(`✓ MetaTrader connection established for account: ${account.name}`);
        } catch (error) {
          await this.storage.upsertConnection({
            accountId: account.id,
            platform: account.platform,
            status: 'Disconnected',
            server: config.mt5Server,
            account: config.mt5Login,
            lastPing: null
          });
          throw error;
        }
        
      } else if (account.platform === 'AvaFeatures' && config.avaEndpoint && config.avaAccountId && config.avaApiKey) {
        const avaClient = new AvaFeaturesClient();
        
        // Update connection status to connecting
        await this.storage.upsertConnection({
          accountId: account.id,
          platform: account.platform,
          status: 'Connecting',
          server: config.avaEndpoint,
          account: config.avaAccountId,
          lastPing: Date.now()
        });

        try {
          await avaClient.connect({
            endpoint: config.avaEndpoint,
            accountId: config.avaAccountId,
            apiKey: config.avaApiKey
          });
          
          clients.ava = avaClient;
          
          // Update connection status to connected
          await this.storage.upsertConnection({
            accountId: account.id,
            platform: account.platform,
            status: 'Connected',
            server: config.avaEndpoint,
            account: config.avaAccountId,
            lastPing: Date.now()
          });
          
          console.log(`✓ AvaFeatures connection established for account: ${account.name}`);
        } catch (error) {
          await this.storage.upsertConnection({
            accountId: account.id,
            platform: account.platform,
            status: 'Disconnected',
            server: config.avaEndpoint,
            account: config.avaAccountId,
            lastPing: null
          });
          throw error;
        }
      } else {
        console.warn(`Account ${account.name} has incomplete configuration, skipping connection`);
        
        await this.storage.upsertConnection({
          accountId: account.id,
          platform: account.platform,
          status: 'Disconnected',
          server: null,
          account: null,
          lastPing: null
        });
      }

      this.replicaClients.set(account.id, clients);
      
    } catch (error) {
      console.error(`Failed to setup connection for account ${account.id}:`, error);
      
      // Update connection status to failed
      await this.storage.upsertConnection({
        accountId: account.id,
        platform: account.platform,
        status: 'Disconnected',
        server: null,
        account: null,
        lastPing: null
      });
    }
  }

  private async startMasterConnection(): Promise<void> {
    // Connect to master MetaTrader account (this would be the desktop MT5)
    // For simulation, we'll use the first MetaTrader account as master
    const accounts = await this.storage.getAllAccounts();
    const masterAccount = accounts.find(acc => acc.platform === 'MetaTrader');
    
    if (masterAccount) {
      const config = await this.storage.getAccountConfiguration(masterAccount.id);
      if (config?.mt5Server && config.mt5Login && config.mt5Password) {
        try {
          await this.masterMetaTraderClient.connect({
            server: config.mt5Server,
            login: config.mt5Login,
            password: config.mt5Password
          });
          
          console.log('Master MetaTrader connection established');
        } catch (error) {
          console.error('Failed to connect to master MetaTrader:', error);
        }
      }
    }
  }

  private setupMasterTradeListener(): void {
    this.masterMetaTraderClient.on('trade', async (masterTrade: MetaTraderTrade) => {
      console.log('Master trade detected:', masterTrade);
      await this.replicateTradeToAllAccounts(masterTrade);
    });
  }

  private async replicateTradeToAllAccounts(masterTrade: MetaTraderTrade): Promise<void> {
    const accounts = await this.storage.getAllAccounts();
    const globalConfig = await this.storage.getConfiguration();
    
    if (!globalConfig?.isMirrorActive) {
      console.log('Mirror is not active, skipping replication');
      return;
    }

    const replicationPromises = accounts.map(async (account) => {
      // Skip the master account
      if (account.platform === 'MetaTrader') return;
      
      try {
        await this.replicateTradeToAccount(account, masterTrade);
      } catch (error) {
        console.error(`Failed to replicate trade to account ${account.id}:`, error);
      }
    });

    await Promise.allSettled(replicationPromises);
  }

  private async replicateTradeToAccount(account: Account, masterTrade: MetaTraderTrade): Promise<void> {
    const clients = this.replicaClients.get(account.id);
    const accountConfig = await this.storage.getAccountConfiguration(account.id);
    const globalConfig = await this.storage.getConfiguration();
    
    if (!clients || !accountConfig) return;

    // Calculate adjusted volume based on risk multiplier
    const riskMultiplier = parseFloat(accountConfig.riskMultiplier || "1.0");
    const adjustedVolume = masterTrade.volume * riskMultiplier;

    // Calculate TP/SL levels if enabled
    let takeProfit: number | undefined;
    let stopLoss: number | undefined;
    let trailingStop: number | undefined;

    if (globalConfig?.enableTakeProfit && globalConfig.takeProfitPoints) {
      const pointValue = this.getPointValue(masterTrade.symbol);
      takeProfit = masterTrade.type === 'BUY' 
        ? masterTrade.price + (globalConfig.takeProfitPoints * pointValue)
        : masterTrade.price - (globalConfig.takeProfitPoints * pointValue);
    }

    if (globalConfig?.enableStopLoss && globalConfig.stopLossPoints) {
      const pointValue = this.getPointValue(masterTrade.symbol);
      stopLoss = masterTrade.type === 'BUY'
        ? masterTrade.price - (globalConfig.stopLossPoints * pointValue)
        : masterTrade.price + (globalConfig.stopLossPoints * pointValue);
    }

    if (globalConfig?.enableTrailingStop && globalConfig.trailingStopPoints) {
      trailingStop = globalConfig.trailingStopPoints;
    }

    const startTime = Date.now();

    try {
      if (account.platform === 'AvaFeatures' && clients.ava) {
        const avaFeaturesTrade: AvaFeaturesTrade = {
          symbol: masterTrade.symbol,
          type: masterTrade.type,
          volume: adjustedVolume,
          price: masterTrade.price,
          takeProfit,
          stopLoss,
          trailingStop,
          maxSlippage: globalConfig?.maxSlippage
        };

        const result = await clients.ava.executeTrade(avaFeaturesTrade);
        const latency = Date.now() - startTime;

        // Log the replicated trade
        await this.storage.createTrade({
          accountId: account.id,
          symbol: masterTrade.symbol,
          type: masterTrade.type,
          volume: adjustedVolume.toFixed(2),
          price: masterTrade.price.toFixed(5),
          takeProfit: takeProfit?.toFixed(5) || null,
          stopLoss: stopLoss?.toFixed(5) || null,
          status: result.success ? 'SUCCESS' : 'FAILED',
          latency,
          sourcePlatform: 'MetaTrader',
          targetPlatform: account.platform,
          errorMessage: result.error || null
        });

        // Update daily stats
        await this.updateDailyStats(result.success, latency);

        // Broadcast to clients
        this.broadcastToClients('tradeReplicated', {
          accountId: account.id,
          accountName: account.name,
          trade: avaFeaturesTrade,
          result,
          latency
        });

        console.log(`Trade replicated to ${account.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Log failed trade
      await this.storage.createTrade({
        accountId: account.id,
        symbol: masterTrade.symbol,
        type: masterTrade.type,
        volume: adjustedVolume.toFixed(2),
        price: masterTrade.price.toFixed(5),
        takeProfit: takeProfit?.toFixed(5) || null,
        stopLoss: stopLoss?.toFixed(5) || null,
        status: 'FAILED',
        latency,
        sourcePlatform: 'MetaTrader',
        targetPlatform: account.platform,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      await this.updateDailyStats(false, latency);

      console.error(`Failed to replicate trade to ${account.name}:`, error);
    }
  }

  private async updateDailyStats(success: boolean, latency: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentStats = await this.storage.getStatsByDate(today);
      
      const newStats = {
        tradesCount: (currentStats?.tradesCount || 0) + 1,
        successfulTrades: (currentStats?.successfulTrades || 0) + (success ? 1 : 0),
        failedTrades: (currentStats?.failedTrades || 0) + (success ? 0 : 1),
        avgLatency: currentStats ? 
          Math.round(((currentStats.avgLatency * currentStats.tradesCount) + latency) / (currentStats.tradesCount + 1)) : 
          latency
      };

      await this.storage.updateStats(today, newStats);
      this.broadcastToClients('statsUpdate', { date: today, ...newStats });
    } catch (error) {
      console.error('Failed to update daily stats:', error);
    }
  }

  private getPointValue(symbol: string): number {
    // Standard point values for common forex pairs
    const pointValues: { [key: string]: number } = {
      'EURUSD': 0.00001,
      'GBPUSD': 0.00001,
      'USDJPY': 0.001,
      'USDCHF': 0.00001,
      'AUDUSD': 0.00001,
      'USDCAD': 0.00001,
      'NZDUSD': 0.00001,
      'EURGBP': 0.00001,
      'EURJPY': 0.001,
      'GBPJPY': 0.001
    };

    return pointValues[symbol] || 0.00001; // Default to 5 digits
  }

  private broadcastToClients(type: string, data: any): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type, data }));
      }
    });
  }

  // Public methods for external control
  async addAccount(account: Account): Promise<void> {
    await this.setupAccountConnection(account);
    console.log(`Added account ${account.name} to replication service`);
  }

  async removeAccount(accountId: number): Promise<void> {
    const clients = this.replicaClients.get(accountId);
    if (clients) {
      if (clients.mt5) await clients.mt5.disconnect();
      if (clients.ava) await clients.ava.disconnect();
      this.replicaClients.delete(accountId);
      console.log(`Removed account ${accountId} from replication service`);
    }
  }

  async updateAccountConfiguration(accountId: number): Promise<void> {
    console.log(`Updating configuration for account ${accountId}...`);
    
    // Disconnect existing connection
    await this.removeAccount(accountId);
    
    // Get updated account and reconnect
    const account = await this.storage.getAccount(accountId);
    if (account && account.isActive) {
      console.log(`Reconnecting account: ${account.name} (${account.platform})`);
      await this.setupAccountConnection(account);
      
      // If this is the master account, also restart master connection
      if (account.isMaster) {
        await this.masterMetaTraderClient.disconnect();
        await this.startMasterConnection();
      }
    }
  }

  async getConnectionStatus(): Promise<{ accountId: number; status: string }[]> {
    const accounts = await this.storage.getAllAccounts();
    const status: { accountId: number; status: string }[] = [];
    
    for (const account of accounts) {
      // Check stored connection status first
      const connection = await this.storage.getConnectionByAccount(account.id);
      let connectionStatus = connection?.status || 'Disconnected';
      
      // Override with real-time status if available
      if (account.isMaster && this.masterMetaTraderClient.isConnected()) {
        connectionStatus = 'Connected';
      } else {
        const clients = this.replicaClients.get(account.id);
        if (clients) {
          if (account.platform === 'MetaTrader' && clients.mt5?.isConnected()) {
            connectionStatus = 'Connected';
          } else if (account.platform === 'AvaFeatures' && clients.ava?.isConnected()) {
            connectionStatus = 'Connected';
          }
        }
      }
      
      status.push({
        accountId: account.id,
        status: connectionStatus
      });
    }
    
    return status;
  }
}