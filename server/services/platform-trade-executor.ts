import { EventEmitter } from 'events';
import { tradingViewClient, TradingViewTrade, TradingViewTradeResult } from './tradingview-client';
import { conflictManager } from './conflict-manager';
import { IStorage } from '../storage';

export interface PlatformTradeRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
  replicateToAccounts?: number[]; // Account IDs to replicate to
}

export interface PlatformTradeResult {
  success: boolean;
  originTradeId?: number;
  replicationResults?: Array<{
    accountId: number;
    success: boolean;
    tradeId?: number;
    error?: string;
  }>;
  error?: string;
}

export class PlatformTradeExecutor extends EventEmitter {
  private storage: IStorage;

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for trades executed on TradingView
    tradingViewClient.on('trade_executed', (tradeData) => {
      this.handlePlatformTradeExecution(tradeData);
    });
  }

  async executePlatformTrade(request: PlatformTradeRequest): Promise<PlatformTradeResult> {
    try {
      console.log(`Executing platform trade: ${request.symbol} ${request.type} ${request.volume}`);

      // Step 1: Execute trade on TradingView platform
      const tvTrade: TradingViewTrade = {
        symbol: request.symbol,
        type: request.type,
        volume: request.volume,
        price: request.price,
        takeProfit: request.takeProfit,
        stopLoss: request.stopLoss,
        timestamp: new Date()
      };

      const tvResult = await tradingViewClient.executeTrade(tvTrade);

      if (!tvResult.success) {
        return {
          success: false,
          error: `Platform execution failed: ${tvResult.error}`
        };
      }

      // Step 2: Store origin trade in database
      const originTrade = await this.storage.createTrade({
        symbol: request.symbol,
        type: request.type,
        volume: request.volume.toString(),
        price: tvResult.executionPrice?.toString() || request.price?.toString() || '0',
        takeProfit: request.takeProfit?.toString(),
        stopLoss: request.stopLoss?.toString(),
        status: 'executed',
        latency: tvResult.latency,
        sourcePlatform: 'TradingView',
        targetPlatform: 'TradingView',
        isOriginTrade: true
      });

      // Step 3: Replicate to slave accounts if specified
      const replicationResults = [];
      if (request.replicateToAccounts && request.replicateToAccounts.length > 0) {
        for (const accountId of request.replicateToAccounts) {
          try {
            const replicationResult = await this.replicateToAccount(accountId, originTrade, tvResult);
            replicationResults.push(replicationResult);
          } catch (error) {
            replicationResults.push({
              accountId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Emit event for real-time updates
      this.emit('platform_trade_executed', {
        originTrade,
        replicationResults
      });

      return {
        success: true,
        originTradeId: originTrade.id,
        replicationResults
      };

    } catch (error) {
      console.error('Error executing platform trade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async replicateToAccount(accountId: number, originTrade: any, tvResult: TradingViewTradeResult) {
    try {
      const account = await this.storage.getAccount(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      if (!account.isActive) {
        throw new Error(`Account ${accountId} is not active`);
      }

      // Check for conflicts
      const conflictSettings = {
        strategy: account.conflictResolution || 'pause_replication',
        detectionWindow: 5, // minutes
        autoResumeAfter: 5, // minutes
        maxQueueSize: 10
      };

      const conflictResult = await conflictManager.handleReplicationRequest(
        accountId,
        originTrade,
        conflictSettings
      );

      if (conflictResult === 'blocked') {
        throw new Error('Replication blocked due to manual trading activity');
      }

      if (conflictResult === 'queued') {
        return {
          accountId,
          success: true,
          message: 'Trade queued for later execution'
        };
      }

      // Calculate adjusted volume based on risk multiplier
      const riskMultiplier = parseFloat(account.riskMultiplier || "1.0");
      const adjustedVolume = parseFloat(originTrade.volume) * riskMultiplier;

      // Create replicated trade
      const replicatedTrade = await this.storage.createTrade({
        accountId,
        symbol: originTrade.symbol,
        type: originTrade.type,
        volume: adjustedVolume.toString(),
        price: originTrade.price,
        takeProfit: originTrade.takeProfit,
        stopLoss: originTrade.stopLoss,
        status: 'executed',
        latency: 50 + Math.random() * 100, // Simulate replication latency
        sourcePlatform: 'TradingView',
        targetPlatform: account.platform,
        isOriginTrade: false,
        originTradeId: originTrade.id
      });

      console.log(`Trade replicated to account ${accountId}: ${replicatedTrade.id}`);

      return {
        accountId,
        success: true,
        tradeId: replicatedTrade.id
      };

    } catch (error) {
      console.error(`Error replicating trade to account ${accountId}:`, error);
      throw error;
    }
  }

  private async handlePlatformTradeExecution(tradeData: any): Promise<void> {
    // This handles trades that are executed directly on the platform
    console.log('Handling platform trade execution:', tradeData);
    
    // Get all active accounts for replication
    const accounts = await this.storage.getAllAccounts();
    const activeAccounts = accounts.filter(account => account.isActive);

    // Replicate to all active accounts
    for (const account of activeAccounts) {
      try {
        await this.replicateToAccount(account.id, tradeData, {
          success: true,
          executionPrice: tradeData.executionPrice,
          latency: tradeData.latency
        });
      } catch (error) {
        console.error(`Failed to replicate to account ${account.id}:`, error);
      }
    }
  }

  async executeSlaveAccountTrade(accountId: number, request: PlatformTradeRequest): Promise<any> {
    try {
      const account = await this.storage.getAccount(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Report manual trade activity
      conflictManager.reportManualTrade(accountId, request);

      // Execute trade directly on slave account
      const trade = await this.storage.createTrade({
        accountId,
        symbol: request.symbol,
        type: request.type,
        volume: request.volume.toString(),
        price: request.price?.toString() || '0',
        takeProfit: request.takeProfit?.toString(),
        stopLoss: request.stopLoss?.toString(),
        status: 'executed',
        latency: 80 + Math.random() * 120,
        sourcePlatform: account.platform,
        targetPlatform: account.platform,
        isOriginTrade: false
      });

      console.log(`Direct trade executed on slave account ${accountId}: ${trade.id}`);

      this.emit('slave_trade_executed', {
        accountId,
        trade
      });

      return {
        success: true,
        tradeId: trade.id
      };

    } catch (error) {
      console.error(`Error executing trade on slave account ${accountId}:`, error);
      throw error;
    }
  }
}

export const platformTradeExecutor = new PlatformTradeExecutor(
  // Storage will be injected when imported
  {} as IStorage
);