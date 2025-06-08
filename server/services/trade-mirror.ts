import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import { IStorage } from '../storage';
import { MetaTraderClient, type MetaTraderTrade } from './metatrader';
import { AvaFeaturesClient, type AvaFeaturesTrade } from './avafeatures';

export class TradeMirrorService extends EventEmitter {
  private storage: IStorage;
  private wss: WebSocketServer;
  private metaTraderClient: MetaTraderClient;
  private avaFeaturesClient: AvaFeaturesClient;
  private isRunning = false;

  constructor(storage: IStorage, wss: WebSocketServer) {
    super();
    this.storage = storage;
    this.wss = wss;
    this.metaTraderClient = new MetaTraderClient();
    this.avaFeaturesClient = new AvaFeaturesClient();

    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const config = await this.storage.getConfiguration();
    if (!config || !config.isMirrorActive) {
      throw new Error('Mirror service is not configured or not active');
    }

    try {
      // Connect to MetaTrader if configured
      if (config.mt5Server && config.mt5Login && config.mt5Password) {
        await this.metaTraderClient.connect({
          server: config.mt5Server,
          login: config.mt5Login,
          password: config.mt5Password,
        });
      }

      // Connect to AvaFeatures if configured
      if (config.avaEndpoint && config.avaAccountId && config.avaApiKey) {
        await this.avaFeaturesClient.connect({
          endpoint: config.avaEndpoint,
          accountId: config.avaAccountId,
          apiKey: config.avaApiKey,
        });
      }

      this.isRunning = true;
      console.log('Trade mirror service started');
      
    } catch (error) {
      console.error('Failed to start trade mirror service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    await this.metaTraderClient.disconnect();
    await this.avaFeaturesClient.disconnect();
    
    this.isRunning = false;
    console.log('Trade mirror service stopped');
  }

  async testMetaTraderConnection(): Promise<void> {
    const config = await this.storage.getConfiguration();
    if (!config || !config.mt5Server || !config.mt5Login || !config.mt5Password) {
      throw new Error('MetaTrader configuration is incomplete');
    }

    await this.storage.upsertConnection({
      platform: 'MetaTrader',
      status: 'Connecting',
      server: config.mt5Server,
      account: null,
      lastPing: null,
    });

    try {
      await this.metaTraderClient.connect({
        server: config.mt5Server,
        login: config.mt5Login,
        password: config.mt5Password,
      });
    } catch (error) {
      await this.storage.upsertConnection({
        platform: 'MetaTrader',
        status: 'Disconnected',
        server: config.mt5Server,
        account: null,
        lastPing: null,
      });
      throw error;
    }
  }

  async testAvaFeaturesConnection(): Promise<void> {
    const config = await this.storage.getConfiguration();
    if (!config || !config.avaEndpoint || !config.avaAccountId || !config.avaApiKey) {
      throw new Error('AvaFeatures configuration is incomplete');
    }

    await this.storage.upsertConnection({
      platform: 'AvaFeatures',
      status: 'Connecting',
      server: config.avaEndpoint,
      account: null,
      lastPing: null,
    });

    try {
      await this.avaFeaturesClient.connect({
        endpoint: config.avaEndpoint,
        accountId: config.avaAccountId,
        apiKey: config.avaApiKey,
      });
    } catch (error) {
      await this.storage.upsertConnection({
        platform: 'AvaFeatures',
        status: 'Disconnected',
        server: config.avaEndpoint,
        account: null,
        lastPing: null,
      });
      throw error;
    }
  }

  async reconnectMetaTrader(): Promise<void> {
    await this.metaTraderClient.reconnect();
  }

  async reconnectAvaFeatures(): Promise<void> {
    await this.avaFeaturesClient.reconnect();
  }

  private setupEventHandlers(): void {
    // MetaTrader events
    this.metaTraderClient.on('connected', async (data) => {
      await this.storage.upsertConnection({
        platform: 'MetaTrader',
        status: 'Connected',
        server: data.server,
        account: data.account,
        lastPing: null,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });

    this.metaTraderClient.on('disconnected', async () => {
      await this.storage.upsertConnection({
        platform: 'MetaTrader',
        status: 'Disconnected',
        server: null,
        account: null,
        lastPing: null,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });

    this.metaTraderClient.on('ping', async (data) => {
      await this.storage.upsertConnection({
        platform: 'MetaTrader',
        status: 'Connected',
        server: null,
        account: null,
        lastPing: data.latency,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });

    this.metaTraderClient.on('trade', async (trade: MetaTraderTrade) => {
      await this.handleIncomingTrade(trade);
    });

    // AvaFeatures events
    this.avaFeaturesClient.on('connected', async (data) => {
      await this.storage.upsertConnection({
        platform: 'AvaFeatures',
        status: 'Connected',
        server: data.server,
        account: data.account,
        lastPing: null,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });

    this.avaFeaturesClient.on('disconnected', async () => {
      await this.storage.upsertConnection({
        platform: 'AvaFeatures',
        status: 'Disconnected',
        server: null,
        account: null,
        lastPing: null,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });

    this.avaFeaturesClient.on('ping', async (data) => {
      await this.storage.upsertConnection({
        platform: 'AvaFeatures',
        status: 'Connected',
        server: null,
        account: null,
        lastPing: data.latency,
      });
      this.emit('connectionUpdate', await this.storage.getAllConnections());
    });
  }

  private async handleIncomingTrade(metaTrade: MetaTraderTrade): Promise<void> {
    if (!this.isRunning || !this.avaFeaturesClient.isConnected()) {
      return;
    }

    const config = await this.storage.getConfiguration();
    if (!config || !config.isMirrorActive) {
      return;
    }

    // Apply risk multiplier
    const riskMultiplier = parseFloat(config.riskMultiplier || "1.0");
    
    // Calculate TP/SL levels based on points
    const pointValue = this.getPointValue(metaTrade.symbol);
    let takeProfit: number | undefined;
    let stopLoss: number | undefined;
    let trailingStop: number | undefined;

    if (config.enableTakeProfit && config.takeProfitPoints) {
      if (metaTrade.type === 'BUY') {
        takeProfit = metaTrade.price + (config.takeProfitPoints * pointValue);
      } else {
        takeProfit = metaTrade.price - (config.takeProfitPoints * pointValue);
      }
    }

    if (config.enableStopLoss && config.stopLossPoints) {
      if (metaTrade.type === 'BUY') {
        stopLoss = metaTrade.price - (config.stopLossPoints * pointValue);
      } else {
        stopLoss = metaTrade.price + (config.stopLossPoints * pointValue);
      }
    }

    if (config.enableTrailingStop && config.trailingStopPoints) {
      trailingStop = config.trailingStopPoints;
    }
    
    const avaFeaturesTrade: AvaFeaturesTrade = {
      symbol: metaTrade.symbol,
      type: metaTrade.type,
      volume: metaTrade.volume * riskMultiplier,
      price: metaTrade.price,
      takeProfit,
      stopLoss,
      trailingStop,
      maxSlippage: config.maxSlippage || 3,
    };

    try {
      const result = await this.avaFeaturesClient.executeTrade(avaFeaturesTrade);
      
      // Store trade record
      const trade = await this.storage.createTrade({
        symbol: metaTrade.symbol,
        type: metaTrade.type,
        volume: metaTrade.volume.toString(),
        price: metaTrade.price.toString(),
        status: result.success ? 'SUCCESS' : 'FAILED',
        latency: result.latency,
        sourcePlatform: 'MetaTrader',
        targetPlatform: 'AvaFeatures',
        errorMessage: result.error || null,
      });

      this.emit('trade', trade);

      // Update daily stats
      await this.updateDailyStats(result.success, result.latency);

    } catch (error) {
      console.error('Failed to execute mirror trade:', error);
      
      const trade = await this.storage.createTrade({
        symbol: metaTrade.symbol,
        type: metaTrade.type,
        volume: metaTrade.volume.toString(),
        price: metaTrade.price.toString(),
        status: 'FAILED',
        latency: null,
        sourcePlatform: 'MetaTrader',
        targetPlatform: 'AvaFeatures',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      this.emit('trade', trade);
      await this.updateDailyStats(false, 0);
    }
  }

  private async updateDailyStats(success: boolean, latency: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const currentStats = await this.storage.getStatsByDate(today);
    
    const newTradesCount = (currentStats?.tradesCount || 0) + 1;
    const newSuccessfulTrades = (currentStats?.successfulTrades || 0) + (success ? 1 : 0);
    const newFailedTrades = (currentStats?.failedTrades || 0) + (success ? 0 : 1);
    
    // Calculate new average latency
    const oldAvgLatency = currentStats?.avgLatency || 0;
    const oldCount = currentStats?.tradesCount || 0;
    const newAvgLatency = success 
      ? Math.round(((oldAvgLatency * oldCount) + latency) / newTradesCount)
      : oldAvgLatency;

    const updatedStats = await this.storage.updateStats(today, {
      tradesCount: newTradesCount,
      successfulTrades: newSuccessfulTrades,
      failedTrades: newFailedTrades,
      avgLatency: newAvgLatency,
    });

    this.emit('statsUpdate', updatedStats);
  }
}
