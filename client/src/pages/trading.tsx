import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { TradingViewEmbed } from "@/components/ui/tradingview-embed";
import { Navigation } from "@/components/navigation";
import { TrendingUp, Play, Square, Send, Activity, Clock, Zap } from "lucide-react";
import type { Trade } from "@/lib/types";

export default function TradingPage() {
  const [tradeData, setTradeData] = useState({
    symbol: 'EURUSD',
    type: 'BUY' as 'BUY' | 'SELL',
    volume: '0.1',
    price: '',
    takeProfit: '',
    stopLoss: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'NZDUSD'
  ];

  const executePlatformTrade = async () => {
    if (!tradeData.symbol || !tradeData.type || !tradeData.volume) {
      toast({
        title: "Errore",
        description: "Compila i campi obbligatori: Symbol, Type, Volume",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/slave/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: tradeData.symbol,
          type: tradeData.type,
          volume: parseFloat(tradeData.volume),
          price: tradeData.price ? parseFloat(tradeData.price) : undefined,
          takeProfit: tradeData.takeProfit ? parseFloat(tradeData.takeProfit) : undefined,
          stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined,
          targetAccounts: ['all'],
          skipTradingView: true
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Trade Replicato",
          description: `${tradeData.symbol} ${tradeData.type} ${tradeData.volume} su ${result.executedAccounts?.length || 0} account slave`,
        });

        queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
        
        // Reset form
        setTradeData(prev => ({
          ...prev,
          price: '',
          takeProfit: '',
          stopLoss: ''
        }));
      } else {
        toast({
          title: "Errore Replicazione",
          description: result.error || "Replicazione fallita sui conti slave",
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

  const executeQuickTrade = async (type: 'BUY' | 'SELL') => {
    setLoading(true);
    try {
      const response = await fetch('/api/slave/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: tradeData.symbol,
          type: type,
          volume: 0.1,
          targetAccounts: ['all'],
          skipTradingView: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Quick Trade Replicato",
          description: `${tradeData.symbol} ${type} 0.1 su ${result.executedAccounts?.length || 0} account slave`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore esecuzione quick trade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recentTrades = trades.slice(0, 10);

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trading Platform</h1>
        <p className="text-muted-foreground">
          Replicazione trade diretta sui conti slave AvaFeatures e MetaTrader
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* TradingView Chart - Wider and Taller */}
        <div className="xl:col-span-4 h-[1200px]">
          <TradingViewEmbed 
            symbol={tradeData.symbol}
            height={1200}
            onTradeClick={(type) => {
              setTradeData(prev => ({ ...prev, type }));
              executeQuickTrade(type);
            }}
            onTradeExecute={(trade) => {
              toast({
                title: "Trade da Grafico Eseguito",
                description: `${trade.symbol} ${trade.type} ${trade.volume}`,
              });
              queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
            }}
          />
        </div>

        {/* Trading Panel - Right Side */}
        <div className="xl:col-span-1">
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Pannello Trading
            </CardTitle>
            <CardDescription>
              Esecuzione trade personalizzata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Simbolo</Label>
              <Select value={tradeData.symbol} onValueChange={(value) => 
                setTradeData(prev => ({ ...prev, symbol: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={tradeData.type} onValueChange={(value: 'BUY' | 'SELL') => 
                  setTradeData(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume">Volume</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  value={tradeData.volume}
                  onChange={(e) => setTradeData(prev => ({ ...prev, volume: e.target.value }))}
                  placeholder="0.1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prezzo (opzionale)</Label>
              <Input
                id="price"
                type="number"
                step="0.00001"
                value={tradeData.price}
                onChange={(e) => setTradeData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Market price"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="takeProfit">Take Profit</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="0.00001"
                  value={tradeData.takeProfit}
                  onChange={(e) => setTradeData(prev => ({ ...prev, takeProfit: e.target.value }))}
                  placeholder="1.08500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.00001"
                  value={tradeData.stopLoss}
                  onChange={(e) => setTradeData(prev => ({ ...prev, stopLoss: e.target.value }))}
                  placeholder="1.08000"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Account di Replicazione</Label>
              <div className="flex gap-2">
                <Badge variant="outline">Account Slave 1</Badge>
                <Badge variant="outline">Account Slave 2</Badge>
              </div>
            </div>

            <Button
              onClick={executePlatformTrade}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Esecuzione...' : `Esegui ${tradeData.type} ${tradeData.symbol}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Replica direttamente sui conti slave AvaFeatures/MetaTrader
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Trade Recenti
          </CardTitle>
          <CardDescription>
            Ultime operazioni eseguite
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun trade recente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {trade.type === 'BUY' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <Square className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{trade.symbol}</span>
                    </div>
                    <Badge variant={trade.type === 'BUY' ? 'default' : 'destructive'}>
                      {trade.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Vol: {trade.volume}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {trade.price}
                    </span>
                    {trade.latency && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {trade.latency}ms
                        </span>
                      </div>
                    )}
                    <Badge variant={trade.status === 'SUCCESS' ? 'outline' : 'destructive'}>
                      {trade.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}