import { EventEmitter } from 'events';

export interface ConflictSettings {
  strategy: 'pause_replication' | 'block_manual' | 'allow_both' | 'queue_trades';
  detectionWindow: number; // minutes
  autoResumeAfter: number; // minutes
  maxQueueSize: number;
}

export interface TradeConflict {
  accountId: number;
  manualTrade: any;
  replicationTrade: any;
  timestamp: Date;
  resolved: boolean;
}

export class ConflictManager extends EventEmitter {
  private conflicts: Map<number, TradeConflict[]> = new Map();
  private lockedAccounts: Set<number> = new Set();
  private queuedTrades: Map<number, any[]> = new Map();
  private lastManualActivity: Map<number, Date> = new Map();

  constructor() {
    super();
    this.startConflictMonitoring();
  }

  // Detect if manual trading is active
  public isManualTradingActive(accountId: number, settings: ConflictSettings): boolean {
    const lastActivity = this.lastManualActivity.get(accountId);
    if (!lastActivity) return false;

    const windowMs = settings.detectionWindow * 60 * 1000;
    return (Date.now() - lastActivity.getTime()) < windowMs;
  }

  // Report manual trade activity
  public reportManualTrade(accountId: number, trade: any): void {
    this.lastManualActivity.set(accountId, new Date());
    
    console.log(`Manual trade detected on account ${accountId}: ${trade.symbol} ${trade.type}`);
    
    this.emit('manual_trade_detected', {
      accountId,
      trade,
      timestamp: new Date()
    });
  }

  // Handle replication request during potential conflict
  public async handleReplicationRequest(
    accountId: number, 
    replicationTrade: any, 
    settings: ConflictSettings
  ): Promise<'proceed' | 'blocked' | 'queued'> {
    
    if (!this.isManualTradingActive(accountId, settings)) {
      return 'proceed';
    }

    switch (settings.strategy) {
      case 'pause_replication':
        this.lockAccount(accountId);
        console.log(`Replication paused for account ${accountId} - manual trading active`);
        return 'blocked';

      case 'block_manual':
        // In production, would communicate with trading platform to block manual trades
        console.log(`Manual trading blocked for account ${accountId} - replication active`);
        return 'proceed';

      case 'allow_both':
        // Add delay to prevent order collision
        await this.addTradeDelay(accountId);
        return 'proceed';

      case 'queue_trades':
        return this.queueTrade(accountId, replicationTrade, settings);

      default:
        return 'blocked';
    }
  }

  // Queue trade for later execution
  private queueTrade(accountId: number, trade: any, settings: ConflictSettings): 'queued' | 'blocked' {
    if (!this.queuedTrades.has(accountId)) {
      this.queuedTrades.set(accountId, []);
    }

    const queue = this.queuedTrades.get(accountId)!;
    
    if (queue.length >= settings.maxQueueSize) {
      console.log(`Trade queue full for account ${accountId}, dropping trade`);
      return 'blocked';
    }

    queue.push({
      ...trade,
      queuedAt: new Date()
    });

    console.log(`Trade queued for account ${accountId}, queue size: ${queue.length}`);
    return 'queued';
  }

  // Process queued trades when manual trading stops
  public async processQueuedTrades(accountId: number): Promise<void> {
    const queue = this.queuedTrades.get(accountId);
    if (!queue || queue.length === 0) return;

    console.log(`Processing ${queue.length} queued trades for account ${accountId}`);

    for (const trade of queue) {
      try {
        // Add small delay between trades
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Emit trade for processing
        this.emit('process_queued_trade', {
          accountId,
          trade
        });
        
      } catch (error) {
        console.error(`Error processing queued trade for account ${accountId}:`, error);
      }
    }

    // Clear queue
    this.queuedTrades.set(accountId, []);
  }

  // Lock account from replication
  private lockAccount(accountId: number): void {
    this.lockedAccounts.add(accountId);
    
    this.emit('account_locked', {
      accountId,
      reason: 'manual_trading_conflict',
      timestamp: new Date()
    });
  }

  // Unlock account for replication
  public unlockAccount(accountId: number): void {
    this.lockedAccounts.delete(accountId);
    
    this.emit('account_unlocked', {
      accountId,
      timestamp: new Date()
    });

    // Process any queued trades
    this.processQueuedTrades(accountId);
  }

  // Check if account is locked
  public isAccountLocked(accountId: number): boolean {
    return this.lockedAccounts.has(accountId);
  }

  // Add intelligent delay to prevent trade collision
  private async addTradeDelay(accountId: number): Promise<void> {
    // Smart delay based on recent activity
    const recentActivity = this.getRecentTradeActivity(accountId);
    const delay = Math.min(2000, 200 + (recentActivity * 100)); // 200ms to 2s
    
    console.log(`Adding ${delay}ms delay for account ${accountId} to prevent collision`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Get recent trade activity count
  private getRecentTradeActivity(accountId: number): number {
    // This would query recent trades from storage
    // For now, return a simulated value
    return Math.floor(Math.random() * 5);
  }

  // Monitor for conflicts and auto-resolution
  private startConflictMonitoring(): void {
    setInterval(() => {
      this.checkForAutoResolution();
    }, 30000); // Check every 30 seconds
  }

  // Auto-resolve conflicts when manual trading stops
  private checkForAutoResolution(): void {
    for (const [accountId, lastActivity] of this.lastManualActivity.entries()) {
      if (!this.lockedAccounts.has(accountId)) continue;

      // Auto-unlock after 5 minutes of no manual activity
      const timeSinceActivity = Date.now() - lastActivity.getTime();
      if (timeSinceActivity > 5 * 60 * 1000) {
        console.log(`Auto-unlocking account ${accountId} - no manual activity for 5 minutes`);
        this.unlockAccount(accountId);
      }
    }
  }

  // Get conflict statistics
  public getConflictStats(accountId?: number): any {
    if (accountId) {
      return {
        isLocked: this.isAccountLocked(accountId),
        queueSize: this.queuedTrades.get(accountId)?.length || 0,
        lastManualActivity: this.lastManualActivity.get(accountId),
        conflicts: this.conflicts.get(accountId)?.length || 0
      };
    }

    return {
      totalLockedAccounts: this.lockedAccounts.size,
      totalQueuedTrades: Array.from(this.queuedTrades.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      activeConflicts: this.conflicts.size
    };
  }

  // Reset conflict state for account
  public resetAccount(accountId: number): void {
    this.lockedAccounts.delete(accountId);
    this.queuedTrades.delete(accountId);
    this.conflicts.delete(accountId);
    this.lastManualActivity.delete(accountId);
    
    console.log(`Conflict state reset for account ${accountId}`);
  }
}

export const conflictManager = new ConflictManager();