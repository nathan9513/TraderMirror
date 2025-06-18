import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertTradeSchema, 
  insertConfigurationSchema,
  insertAccountSchema,
  insertAccountConfigurationSchema
} from "@shared/schema";
import { TradeReplicatorService } from "./services/trade-replicator";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize trade replicator service
  const tradeReplicatorService = new TradeReplicatorService(storage, wss);
  
  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Send initial data
    sendToClient(ws, 'connections', storage.getAllConnections());
    sendToClient(ws, 'configuration', storage.getConfiguration());
    sendToClient(ws, 'trades', storage.getTrades(10));
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  function broadcastToClients(type: string, data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, data }));
      }
    });
  }

  function sendToClient(ws: WebSocket, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  // API Routes
  
  // Get trades
  app.get('/api/trades', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const trades = await storage.getTrades(limit, offset);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Create trade (for testing/simulation)
  app.post('/api/trades', async (req, res) => {
    try {
      const { accountId, symbol, type, volume, price, takeProfit, stopLoss } = req.body;
      
      if (!accountId || !symbol || !type || !volume || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const trade = await storage.createTrade({
        accountId: parseInt(accountId),
        symbol,
        type: type.toUpperCase(),
        volume: volume.toString(),
        price: price.toString(),
        takeProfit: takeProfit ? takeProfit.toString() : null,
        stopLoss: stopLoss ? stopLoss.toString() : null,
        status: 'executed',
        latency: Math.floor(Math.random() * 100) + 50,
        sourcePlatform: 'MetaTrader',
        targetPlatform: 'MetaTrader',
        errorMessage: null,
        timestamp: new Date()
      });

      // Broadcast via WebSocket
      broadcastToClients('trade_executed', {
        trade,
        timestamp: new Date().toISOString()
      });

      res.json(trade);
    } catch (error) {
      console.error('Error creating trade:', error);
      res.status(500).json({ error: 'Failed to create trade' });
    }
  });

  // Get connections
  app.get('/api/connections', async (req, res) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  // Get configuration
  app.get('/api/configuration', async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  // Update configuration
  app.post('/api/configuration', async (req, res) => {
    try {
      const validatedData = insertConfigurationSchema.parse(req.body);
      const config = await storage.updateConfiguration(validatedData);
      
      // Broadcast configuration update
      broadcastToClients('configuration', config);
      
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: 'Invalid configuration data' });
    }
  });

  // Start/Stop replication service
  app.post('/api/replication/start', async (req, res) => {
    try {
      await tradeReplicatorService.start();
      res.json({ success: true, message: 'Trade replication started' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start replication service' });
    }
  });

  app.post('/api/replication/stop', async (req, res) => {
    try {
      await tradeReplicatorService.stop();
      res.json({ success: true, message: 'Trade replication stopped' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop replication service' });
    }
  });

  // Get replication status
  app.get('/api/replication/status', async (req, res) => {
    try {
      const status = await tradeReplicatorService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get replication status' });
    }
  });

  // Reconnect specific account
  app.post('/api/replication/reconnect-account', async (req, res) => {
    try {
      const { accountId } = req.body;
      await tradeReplicatorService.updateAccountConfiguration(accountId);
      res.json({ success: true, message: 'Account reconnection initiated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reconnect account' });
    }
  });

  // Get today's stats
  app.get('/api/stats/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await storage.getStatsByDate(today);
      res.json(stats || { date: today, tradesCount: 0, successfulTrades: 0, failedTrades: 0, avgLatency: 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Clear all trades
  app.delete('/api/trades', async (req, res) => {
    try {
      await storage.clearTrades();
      broadcastToClients('tradesCleared', {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear trades' });
    }
  });

  // Endpoint per ricevere trade dall'Expert Advisor MT5
  app.post('/api/mt5/trade', async (req: Request, res: Response) => {
    try {
      const { symbol, type, volume, price, timestamp } = req.body;
      
      if (!symbol || !type || !volume || !price) {
        return res.status(400).json({ error: 'Missing required trade data' });
      }

      // Crea il trade dal master MetaTrader
      const masterTrade = {
        symbol,
        type: type.toUpperCase(),
        volume: parseFloat(volume),
        price: parseFloat(price),
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };

      console.log(`Trade ricevuto da MT5 EA: ${symbol} ${type} ${volume} at ${price}`);

      // Invia il trade al sistema di replicazione se attivo
      if (tradeReplicator && tradeReplicator.isRunning) {
        tradeReplicator.handleMasterTrade(masterTrade);
      }

      res.json({ success: true, message: 'Trade ricevuto e replicato' });
    } catch (error) {
      console.error('Errore elaborazione trade MT5:', error);
      res.status(500).json({ error: 'Errore elaborazione trade' });
    }
  });

  // Account Management APIs
  
  // Get all accounts
  app.get('/api/accounts', async (req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // Update account conflict resolution settings
  app.put('/api/accounts/:id/conflict-settings', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { conflictResolution, allowManualTrading } = req.body;
      
      const account = await storage.updateAccount(accountId, {
        conflictResolution,
        allowManualTrading
      });
      
      res.json(account);
    } catch (error) {
      console.error('Error updating account conflict settings:', error);
      res.status(500).json({ error: 'Failed to update account settings' });
    }
  });

  // Resume replication for account
  app.post('/api/accounts/:id/resume-replication', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Implementation would use the trade replicator service
      // tradeReplicatorService.resumeReplication(accountId);
      
      await storage.updateAccount(accountId, { 
        isReplicationLocked: false 
      });
      
      broadcastToClients('replication_resumed', {
        accountId,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true, message: 'Replication resumed' });
    } catch (error) {
      console.error('Error resuming replication:', error);
      res.status(500).json({ error: 'Failed to resume replication' });
    }
  });

  // Report manual trade on slave account
  app.post('/api/accounts/:id/manual-trade', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const trade = req.body;
      
      // Import conflict manager
      const { conflictManager } = await import('./services/conflict-manager');
      
      // Report to conflict manager
      conflictManager.reportManualTrade(accountId, trade);
      
      await storage.updateAccount(accountId, { 
        lastManualTrade: new Date() 
      });
      
      broadcastToClients('manual_trade_detected', {
        accountId,
        trade,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true, message: 'Manual trade reported' });
    } catch (error) {
      console.error('Error reporting manual trade:', error);
      res.status(500).json({ error: 'Failed to report manual trade' });
    }
  });

  // Get conflict status for account
  app.get('/api/accounts/:id/conflict-status', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { conflictManager } = await import('./services/conflict-manager');
      
      const status = conflictManager.getConflictStats(accountId);
      res.json(status);
    } catch (error) {
      console.error('Error getting conflict status:', error);
      res.status(500).json({ error: 'Failed to get conflict status' });
    }
  });

  // Unlock account manually
  app.post('/api/accounts/:id/unlock', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { conflictManager } = await import('./services/conflict-manager');
      
      conflictManager.unlockAccount(accountId);
      
      broadcastToClients('account_unlocked', {
        accountId,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true, message: 'Account unlocked' });
    } catch (error) {
      console.error('Error unlocking account:', error);
      res.status(500).json({ error: 'Failed to unlock account' });
    }
  });

  // This endpoint is handled below with replicator integration

  // Update account
  app.patch('/api/accounts/:id', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const validatedData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(accountId, validatedData);
      
      broadcastToClients('accountUpdated', account);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: 'Invalid account data' });
    }
  });

  // Delete account
  app.delete('/api/accounts/:id', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Remove from replication service first
      await tradeReplicatorService.removeAccount(accountId);
      
      // Then delete from database
      await storage.deleteAccount(accountId);
      
      broadcastToClients('accountDeleted', { id: accountId });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Get account configuration
  app.get('/api/accounts/:id/configuration', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const config = await storage.getAccountConfiguration(accountId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch account configuration' });
    }
  });

  // Update account configuration
  app.patch('/api/accounts/:id/configuration', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const validatedData = insertAccountConfigurationSchema.partial().parse(req.body);
      const config = await storage.updateAccountConfiguration(accountId, validatedData);
      
      // Update replicator service with new configuration
      await tradeReplicatorService.updateAccountConfiguration(accountId);
      
      broadcastToClients('accountConfigurationUpdated', { accountId, config });
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: 'Invalid configuration data' });
    }
  });

  // Get trades by account
  app.get('/api/accounts/:id/trades', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = await storage.getTradesByAccount(accountId, limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Clear trades by account
  app.delete('/api/accounts/:id/trades', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      await storage.clearTradesByAccount(accountId);
      
      broadcastToClients('accountTradesCleared', { accountId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear account trades' });
    }
  });

  // Get connections by account
  app.get('/api/accounts/:id/connections', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const connections = await storage.getConnectionsByAccount(accountId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch account connections' });
    }
  });

  // Set up trade replicator service event handlers
  tradeReplicatorService.on('tradeReplicated', (data: any) => {
    broadcastToClients('tradeReplicated', data);
  });

  tradeReplicatorService.on('serviceStarted', () => {
    broadcastToClients('replicationStarted', { status: 'active' });
  });

  tradeReplicatorService.on('serviceStopped', () => {
    broadcastToClients('replicationStopped', { status: 'inactive' });
  });

  // Hook into account management events
  app.post('/api/accounts', async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validatedData);
      
      // Create default configuration for the new account
      await storage.updateAccountConfiguration(account.id, {
        riskMultiplier: "1.0"
      });
      
      // Add account to replicator service
      await tradeReplicatorService.addAccount(account);
      
      broadcastToClients('accountCreated', account);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: 'Invalid account data' });
    }
  });

  // Override the previous account creation endpoint
  app.delete('/api/accounts/:id', async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Remove from replicator service first
      await tradeReplicatorService.removeAccount(accountId);
      
      await storage.deleteAccount(accountId);
      
      broadcastToClients('accountDeleted', { id: accountId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Endpoint to receive real trades from MetaTrader Desktop
  app.post('/api/mt5/trade', async (req, res) => {
    try {
      const { symbol, type, volume, price, timestamp } = req.body;
      
      // Validate the trade data
      if (!symbol || !type || !volume || !price) {
        return res.status(400).json({ error: 'Missing required trade data' });
      }

      // Create trade object
      const trade = {
        symbol: symbol.toString(),
        type: type.toString() as 'BUY' | 'SELL',
        volume: parseFloat(volume.toString()),
        price: parseFloat(price.toString()),
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };

      console.log(`Real MT5 trade received: ${trade.symbol} ${trade.type} ${trade.volume} at ${trade.price}`);
      
      // Find the master MetaTrader client and emit the trade
      const accounts = await storage.getAllAccounts();
      const masterAccount = accounts.find(acc => acc.isMaster && acc.isActive);
      
      if (masterAccount) {
        // Emit the trade to the replication service
        tradeReplicatorService.handleMasterTrade(trade);
        res.json({ success: true, message: 'Trade received and replicated' });
      } else {
        res.status(404).json({ error: 'Master account not found' });
      }
    } catch (error) {
      console.error('Error processing MT5 trade:', error);
      res.status(500).json({ error: 'Failed to process trade' });
    }
  });

  return httpServer;
}
