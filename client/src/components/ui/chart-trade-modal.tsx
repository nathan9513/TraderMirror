import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChartTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  price?: number;
  onTradeExecute?: (trade: any) => void;
}

export function ChartTradeModal({ 
  isOpen, 
  onClose, 
  symbol, 
  price,
  onTradeExecute 
}: ChartTradeModalProps) {
  const [tradeData, setTradeData] = useState({
    type: 'BUY' as 'BUY' | 'SELL',
    volume: '0.1',
    takeProfit: '',
    stopLoss: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const executeTrade = async () => {
    if (!tradeData.volume) {
      toast({
        title: "Errore",
        description: "Inserisci il volume",
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
          symbol: symbol,
          type: tradeData.type,
          volume: parseFloat(tradeData.volume),
          price: price,
          takeProfit: tradeData.takeProfit ? parseFloat(tradeData.takeProfit) : undefined,
          stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined,
          replicateToAccounts: [1, 2]
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Trade Eseguito dal Grafico",
          description: `${symbol} ${tradeData.type} ${tradeData.volume} - Replicato su ${result.replicationResults?.length || 0} account`,
        });

        if (onTradeExecute) {
          onTradeExecute({
            symbol,
            type: tradeData.type,
            volume: tradeData.volume,
            price,
            success: true
          });
        }

        onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Nuovo Trade da Grafico
          </DialogTitle>
          <DialogDescription>
            Esegui un trade direttamente dai dati del grafico per {symbol}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Simbolo e Prezzo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Simbolo</Label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm font-medium">
                  {symbol}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Prezzo di Riferimento</Label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm font-medium">
                  {price ? price.toFixed(5) : 'Market'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Parametri Trade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo Operazione</Label>
              <Select value={tradeData.type} onValueChange={(value: 'BUY' | 'SELL') => 
                setTradeData(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      BUY
                    </div>
                  </SelectItem>
                  <SelectItem value="SELL">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      SELL
                    </div>
                  </SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="takeProfit">Take Profit</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.00001"
                value={tradeData.takeProfit}
                onChange={(e) => setTradeData(prev => ({ ...prev, takeProfit: e.target.value }))}
                placeholder="Opzionale"
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
                placeholder="Opzionale"
              />
            </div>
          </div>

          <Separator />

          {/* Account di Replicazione */}
          <div>
            <Label>Account di Replicazione</Label>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">Account Slave 1</Badge>
              <Badge variant="secondary">Account Slave 2</Badge>
            </div>
          </div>

          {/* Pulsanti Azione */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={executeTrade}
              disabled={loading}
              className="flex-1"
              variant={tradeData.type === 'BUY' ? 'default' : 'destructive'}
            >
              {loading ? 'Esecuzione...' : `${tradeData.type} ${symbol}`}
            </Button>
            <Button onClick={onClose} variant="outline">
              Annulla
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Trade eseguito su TradingView e replicato automaticamente
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}