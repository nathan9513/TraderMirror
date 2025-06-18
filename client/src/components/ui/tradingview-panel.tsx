import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Wifi, WifiOff, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TradingViewStatus {
  connected: boolean;
  timestamp: string;
}

export function TradingViewPanel() {
  const [status, setStatus] = useState<TradingViewStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    broker: 'default'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/tradingview/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching TradingView status:', error);
    }
  };

  const connect = async () => {
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Errore",
        description: "Username e password sono richiesti",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tradingview/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Connesso a TradingView",
        });
        fetchStatus();
      } else {
        toast({
          title: "Errore",
          description: result.error || "Connessione fallita",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tradingview/disconnect', {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Disconnesso da TradingView",
        });
        fetchStatus();
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di disconnessione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const executePlatformTrade = async (tradeData: any) => {
    try {
      const response = await fetch('/api/platform/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Trade Eseguito",
          description: `${tradeData.symbol} ${tradeData.type} ${tradeData.volume}`,
        });
      } else {
        toast({
          title: "Errore Trade",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore esecuzione trade",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          TradingView Integration
        </CardTitle>
        <CardDescription>
          Connessione diretta alla piattaforma TradingView per esecuzione trade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connesso
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Disconnesso
                </Badge>
              </>
            )}
          </div>
          {status?.timestamp && (
            <span className="text-sm text-muted-foreground">
              {new Date(status.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Connection Form */}
        {!status?.connected && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username TradingView</Label>
                  <Input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Il tuo username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="La tua password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker">Broker (opzionale)</Label>
                <Input
                  id="broker"
                  type="text"
                  value={credentials.broker}
                  onChange={(e) => setCredentials(prev => ({ ...prev, broker: e.target.value }))}
                  placeholder="Nome del broker"
                />
              </div>
              <Button 
                onClick={connect} 
                disabled={loading}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Connessione...' : 'Connetti a TradingView'}
              </Button>
            </div>
          </>
        )}

        {/* Disconnect Button */}
        {status?.connected && (
          <>
            <Separator />
            <Button 
              onClick={disconnect} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Square className="h-4 w-4 mr-2" />
              {loading ? 'Disconnessione...' : 'Disconnetti'}
            </Button>
          </>
        )}

        {/* Quick Trade Buttons */}
        {status?.connected && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Test Trade Platform</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => executePlatformTrade({
                    symbol: 'EURUSD',
                    type: 'BUY',
                    volume: 0.1,
                    replicateToAccounts: [1, 2]
                  })}
                  size="sm"
                  variant="outline"
                >
                  EURUSD BUY
                </Button>
                <Button
                  onClick={() => executePlatformTrade({
                    symbol: 'EURUSD',
                    type: 'SELL',
                    volume: 0.1,
                    replicateToAccounts: [1, 2]
                  })}
                  size="sm"
                  variant="outline"
                >
                  EURUSD SELL
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Funzionamento:</strong> I trade vengono eseguiti direttamente su TradingView 
            e poi automaticamente replicati su tutti gli account slave attivi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}