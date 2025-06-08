import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertConfigurationSchema } from "@shared/schema";
import { TradeMirrorService } from "./services/trade-mirror";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize trade mirror service
  const tradeMirrorService = new TradeMirrorService(storage, wss);
  
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

  // Test connections
  app.post('/api/connections/test', async (req, res) => {
    try {
      const { platform } = req.body;
      
      if (platform === 'MetaTrader') {
        await tradeMirrorService.testMetaTraderConnection();
      } else if (platform === 'AvaFeatures') {
        await tradeMirrorService.testAvaFeaturesConnection();
      }
      
      const connections = await storage.getAllConnections();
      broadcastToClients('connections', connections);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Connection test failed' });
    }
  });

  // Reconnect to platform
  app.post('/api/connections/reconnect', async (req, res) => {
    try {
      const { platform } = req.body;
      
      if (platform === 'MetaTrader') {
        await tradeMirrorService.reconnectMetaTrader();
      } else if (platform === 'AvaFeatures') {
        await tradeMirrorService.reconnectAvaFeatures();
      }
      
      const connections = await storage.getAllConnections();
      broadcastToClients('connections', connections);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Reconnection failed' });
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

  // Set up trade mirror service event handlers
  tradeMirrorService.on('trade', (trade) => {
    broadcastToClients('newTrade', trade);
  });

  tradeMirrorService.on('connectionUpdate', (connections) => {
    broadcastToClients('connections', connections);
  });

  tradeMirrorService.on('statsUpdate', (stats) => {
    broadcastToClients('stats', stats);
  });

  return httpServer;
}
