import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Send, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TradingPanelProps {
  onTradeExecute?: (trade: any) => void;
}

export function TradingPanel({ onTradeExecute }: TradingPanelProps) {
  const [tradeData, setTradeData] = useState({
    symbol: 'EURUSD',
    type: 'BUY' as 'BUY' | 'SELL',
    volume: '0.1',
    price: '',
    takeProfit: '',
    stopLoss: '',
    replicateToAccounts: [1, 2]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'NZDUSD'
  ];

  const executeTrade = async () => {
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
      const response = await fetch('/api/platform/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: tradeData.symbol,
          type: tradeData.type,
          volume: parseFloat(tradeData.volume),
          price: tradeData.price ? parseFloat(tradeData.price) : undefined,
          takeProfit: tradeData.takeProfit ? parseFloat(tradeData.takeProfit) : undefined,
          stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined,
          replicateToAccounts: tradeData.replicateToAccounts
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Trade Eseguito",
          description: `${tradeData.symbol} ${tradeData.type} ${tradeData.volume} - Replicato su ${result.replicationResults?.length || 0} account`,
        });

        if (onTradeExecute) {
          onTradeExecute({
            ...tradeData,
            success: true,
            originTradeId: result.originTradeId,
            replicationResults: result.replicationResults
          });
        }

        // Reset form
        setTradeData(prev => ({
          ...prev,
          price: '',
          takeProfit: '',
          stopLoss: ''
        }));
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
        description: "Errore di connessione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const executeSlaveAccountTrade = async (accountId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: tradeData.symbol,
          type: tradeData.type,
          volume: parseFloat(tradeData.volume),
          price: tradeData.price ? parseFloat(tradeData.price) : undefined,
          takeProfit: tradeData.takeProfit ? parseFloat(tradeData.takeProfit) : undefined,
          stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Trade Slave Eseguito",
          description: `Account ${accountId}: ${tradeData.symbol} ${tradeData.type} ${tradeData.volume}`,
        });
      } else {
        toast({
          title: "Errore Trade Slave",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore esecuzione trade slave",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Pannello Trading
        </CardTitle>
        <CardDescription>
          Esecuzione trade su piattaforma con replicazione automatica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Replication Status */}
        <div className="space-y-2">
          <Label>Account di Replicazione</Label>
          <div className="flex gap-2">
            <Badge variant="outline">Account Slave 1</Badge>
            <Badge variant="outline">Account Slave 2</Badge>
          </div>
        </div>

        <Separator />

        {/* Trade Execution Buttons */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Esecuzione Platform (TradingView)</h4>
            <Button
              onClick={executeTrade}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Esecuzione...' : `Esegui ${tradeData.type} ${tradeData.symbol}`}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Esegue su TradingView e replica automaticamente su tutti gli account slave
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Esecuzione Diretta Account Slave</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                onClick={() => executeSlaveAccountTrade(1)}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Settings className="h-3 w-3 mr-1" />
                Account Slave 1
              </Button>
              <Button
                onClick={() => executeSlaveAccountTrade(2)}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Settings className="h-3 w-3 mr-1" />
                Account Slave 2
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Esegue trade direttamente sull'account selezionato (operazione manuale)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}