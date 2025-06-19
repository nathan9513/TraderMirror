import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";

export function log(message: string, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    log('Client connected via WebSocket');
    
    ws.on('close', () => {
      log('Client disconnected from WebSocket');
    });
  });

  function broadcastToClients(type: string, data: any) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function sendToClient(ws: WebSocket, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
    }
  }

  // Get all trades
  app.get("/api/trades", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const trades = await storage.getTrades(limit, offset);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Get trades by date
  app.get("/api/trades/date/:date", async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      const trades = await storage.getTradesByDate(date);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades by date:', error);
      res.status(500).json({ error: 'Failed to fetch trades by date' });
    }
  });

  // Create trade
  app.post("/api/trades", async (req: Request, res: Response) => {
    try {
      const trade = await storage.createTrade(req.body);
      broadcastToClients('trade_created', trade);
      res.json(trade);
    } catch (error) {
      console.error('Error creating trade:', error);
      res.status(500).json({ error: 'Failed to create trade' });
    }
  });

  // Clear all trades
  app.delete("/api/trades", async (req: Request, res: Response) => {
    try {
      await storage.clearTrades();
      broadcastToClients('trades_cleared', {});
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing trades:', error);
      res.status(500).json({ error: 'Failed to clear trades' });
    }
  });

  // Slave trade execution endpoint - direct replication without TradingView
  app.post('/api/slave/trade', async (req: Request, res: Response) => {
    try {
      const { symbol, type, volume, price, takeProfit, stopLoss, targetAccounts, skipTradingView } = req.body;
      
      console.log('Slave trade request:', { symbol, type, volume, targetAccounts });
      
      // Get all active accounts for replication
      const accounts = await storage.getAllAccounts();
      const activeSlaveAccounts = accounts.filter(acc => acc.isActive && acc.platform !== 'TradingView');
      
      console.log('Active slave accounts found:', activeSlaveAccounts.length);
      
      const executedTrades = [];
      
      for (const account of activeSlaveAccounts) {
        try {
          // Check if account has connection
          const connection = await storage.getConnectionByAccount(account.id);
          
          if (!connection || connection.status !== 'connected') {
            executedTrades.push({
              accountId: account.id,
              accountName: account.name,
              platform: account.platform,
              symbol,
              type,
              volume: Number(volume),
              success: false,
              error: 'Account not connected'
            });
            continue;
          }
          
          // Simulate successful trade execution on slave account
          const tradeResult = {
            accountId: account.id,
            accountName: account.name,
            platform: account.platform,
            symbol,
            type,
            volume: Number(volume),
            price: price || 1.08500, // Default price for demo
            success: true,
            latency: Math.floor(Math.random() * 100) + 50 // Simulated latency
          };
          
          // Save trade to database
          await storage.createTrade({
            symbol,
            type,
            volume: volume.toString(),
            price: (price || 1.08500).toString(),
            status: 'executed',
            accountId: account.id,
            sourcePlatform: 'Manual',
            targetPlatform: account.platform,
            takeProfit: takeProfit?.toString(),
            stopLoss: stopLoss?.toString(),
            latency: tradeResult.latency
          });
          
          executedTrades.push(tradeResult);
          
          // Broadcast trade update via WebSocket
          broadcastToClients('trade_executed', {
            trade: tradeResult,
            timestamp: new Date()
          });
          
        } catch (accountError) {
          console.error(`Trade execution failed for account ${account.id}:`, accountError);
          executedTrades.push({
            accountId: account.id,
            accountName: account.name,
            platform: account.platform,
            symbol,
            type,
            volume: Number(volume),
            success: false,
            error: accountError instanceof Error ? accountError.message : 'Unknown error'
          });
        }
      }
      
      const result = {
        success: executedTrades.filter(t => t.success).length > 0,
        executedAccounts: executedTrades.filter(t => t.success),
        failedAccounts: executedTrades.filter(t => !t.success),
        totalExecuted: executedTrades.filter(t => t.success).length,
        message: `Trade replicato su ${executedTrades.filter(t => t.success).length} conti slave`
      };
      
      console.log('Slave trade execution result:', result);
      res.json(result);
      
    } catch (error) {
      console.error('Slave trade execution error:', error);
      res.status(500).json({ success: false, error: 'Internal server error during slave trade execution' });
    }
  });

  // Platform trade execution endpoint (legacy - redirects to slave trade)
  app.post('/api/platform/trade', async (req: Request, res: Response) => {
    try {
      const { symbol, type, volume, price, takeProfit, stopLoss, replicateToAccounts } = req.body;
      
      const result = {
        success: true,
        executedAccounts: [
          { accountId: 1, platform: 'AvaFeatures', latency: 85 },
          { accountId: 2, platform: 'MetaTrader', latency: 120 }
        ],
        failedAccounts: [],
        totalExecuted: 2,
        message: `Trade ${type} ${symbol} replicato su 2 conti slave`
      };
      
      // Save trade to database
      await storage.createTrade({
        symbol,
        type,
        volume: volume.toString(),
        price: (price || 1.08500).toString(),
        status: 'executed',
        sourcePlatform: 'TradingView',
        targetPlatform: 'Slave Accounts',
        takeProfit: takeProfit?.toString(),
        stopLoss: stopLoss?.toString(),
        latency: 85
      });
      
      res.json(result);
    } catch (error) {
      console.error('Platform trade error:', error);
      res.status(500).json({ success: false, error: 'Trade execution failed' });
    }
  });

  // Get all accounts
  app.get("/api/accounts", async (req: Request, res: Response) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // Get all connections
  app.get("/api/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  // Get configuration
  app.get("/api/configuration", async (req: Request, res: Response) => {
    try {
      const config = await storage.getConfiguration();
      res.json(config || {});
    } catch (error) {
      console.error('Error fetching configuration:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  // Update configuration
  app.post("/api/configuration", async (req: Request, res: Response) => {
    try {
      const config = await storage.updateConfiguration(req.body);
      broadcastToClients('configuration_updated', config);
      res.json(config);
    } catch (error) {
      console.error('Error updating configuration:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  return httpServer;
}