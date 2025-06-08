export interface Trade {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: string;
  price: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  latency: number | null;
  sourcePlatform: string;
  targetPlatform: string;
  errorMessage: string | null;
  timestamp: string;
}

export interface Connection {
  id: number;
  platform: string;
  status: 'Connected' | 'Disconnected' | 'Connecting';
  server: string | null;
  account: string | null;
  lastPing: number | null;
  lastUpdate: string;
}

export interface Configuration {
  id: number;
  isMirrorActive: boolean;
  isAutoReconnectEnabled: boolean;
  riskMultiplier: string;
  mt5Server: string | null;
  mt5Login: string | null;
  mt5Password: string | null;
  avaEndpoint: string | null;
  avaAccountId: string | null;
  avaApiKey: string | null;
  updatedAt: string;
}

export interface Stats {
  id: number;
  date: string;
  tradesCount: number;
  successfulTrades: number;
  failedTrades: number;
  avgLatency: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}
