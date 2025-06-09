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
      
      // If mirror status changed, update service
      if ('isMirrorActive' in validatedData) {
        if (validatedData.isMirrorActive) {
          await tradeMirrorService.start();
        } else {
          await tradeMirrorService.stop();
        }
      }
      
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
      const status = tradeReplicatorService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get replication status' });
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
      await storage.deleteAccount(accountId);
      
      broadcastToClients('accountDeleted', { id: accountId });
      res.json({ success: true });
    } catch (error) {
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

  return httpServer;
}
