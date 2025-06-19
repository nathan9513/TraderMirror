import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, Target, Shield, Clock, MousePointer2 } from 'lucide-react';

interface EnhancedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  clickPrice?: number;
  onTradeExecute?: (trade: any) => void;
}

export function EnhancedChartModal({ 
  isOpen, 
  onClose, 
  symbol, 
  clickPrice,
  onTradeExecute 
}: EnhancedChartModalProps) {
  const [tradeData, setTradeData] = useState({
    type: 'BUY' as 'BUY' | 'SELL',
    volume: '0.10',
    price: '',
    takeProfit: '',
    stopLoss: '',
    trailingStop: '',
    maxSlippage: '3'
  });
  const [loading, setLoading] = useState(false);
  const [priceCalculations, setPriceCalculations] = useState({
    tpDistance: 0,
    slDistance: 0,
    risk: 0,
    reward: 0,
    riskReward: 0
  });
  const { toast } = useToast();

  // Update price when modal opens with click price
  useEffect(() => {
    if (clickPrice && isOpen) {
      setTradeData(prev => ({ 
        ...prev, 
        price: clickPrice.toFixed(5) 
      }));
    }
  }, [clickPrice, isOpen]);

  // Calculate risk/reward when prices change
  useEffect(() => {
    const price = parseFloat(tradeData.price) || 0;
    const tp = parseFloat(tradeData.takeProfit) || 0;
    const sl = parseFloat(tradeData.stopLoss) || 0;
    const volume = parseFloat(tradeData.volume) || 0;

    if (price > 0 && volume > 0) {
      let tpDistance = 0;
      let slDistance = 0;

      if (tradeData.type === 'BUY') {
        tpDistance = tp > price ? (tp - price) * 10000 : 0; // pips
        slDistance = sl < price ? (price - sl) * 10000 : 0; // pips
      } else {
        tpDistance = tp < price ? (price - tp) * 10000 : 0; // pips
        slDistance = sl > price ? (sl - price) * 10000 : 0; // pips
      }

      const pipValue = volume * 1; // Simplified pip value calculation
      const risk = slDistance * pipValue;
      const reward = tpDistance * pipValue;
      const riskReward = risk > 0 ? reward / risk : 0;

      setPriceCalculations({
        tpDistance,
        slDistance,
        risk,
        reward,
        riskReward
      });
    }
  }, [tradeData.price, tradeData.takeProfit, tradeData.stopLoss, tradeData.volume, tradeData.type]);

  const calculateSuggestedLevels = () => {
    const price = parseFloat(tradeData.price) || 0;
    if (price === 0) return;

    const atr = 0.0020; // Simplified ATR for demonstration
    
    if (tradeData.type === 'BUY') {
      const suggestedTP = price + (atr * 1.5);
      const suggestedSL = price - atr;
      setTradeData(prev => ({
        ...prev,
        takeProfit: suggestedTP.toFixed(5),
        stopLoss: suggestedSL.toFixed(5)
      }));
    } else {
      const suggestedTP = price - (atr * 1.5);
      const suggestedSL = price + atr;
      setTradeData(prev => ({
        ...prev,
        takeProfit: suggestedTP.toFixed(5),
        stopLoss: suggestedSL.toFixed(5)
      }));
    }
  };

  const executeTrade = async () => {
    if (!tradeData.volume || !tradeData.price) {
      toast({
        title: "Errore",
        description: "Inserisci volume e prezzo",
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
          symbol: symbol,
          type: tradeData.type,
          volume: parseFloat(tradeData.volume),
          price: parseFloat(tradeData.price),
          takeProfit: tradeData.takeProfit ? parseFloat(tradeData.takeProfit) : undefined,
          stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined,
          maxSlippage: parseFloat(tradeData.maxSlippage),
          targetAccounts: ['all'],
          skipTradingView: true,
          isChartTrade: true,
          clickPrice: clickPrice
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Trade Replicato su Account Slave",
          description: `${symbol} ${tradeData.type} ${tradeData.volume} su ${result.executedAccounts?.length || 0} account`,
        });

        if (onTradeExecute) {
          onTradeExecute({
            symbol,
            type: tradeData.type,
            volume: tradeData.volume,
            price: tradeData.price,
            success: true,
            riskReward: priceCalculations.riskReward
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointer2 className="h-5 w-5" />
            Trade da Grafico - {symbol}
          </DialogTitle>
          <DialogDescription>
            {clickPrice ? `Prezzo cliccato: ${clickPrice.toFixed(5)}` : 'Configura il trade dai dati del grafico'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informazioni Click */}
          {clickPrice && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dati dal Grafico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Simbolo</Label>
                    <Badge variant="outline">{symbol}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prezzo Click</Label>
                    <Badge variant="secondary">{clickPrice.toFixed(5)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parametri Trade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo Operazione</Label>
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
                      BUY - Long
                    </div>
                  </SelectItem>
                  <SelectItem value="SELL">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      SELL - Short
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Volume</Label>
              <Select value={tradeData.volume} onValueChange={(value) => 
                setTradeData(prev => ({ ...prev, volume: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">0.01 - Micro</SelectItem>
                  <SelectItem value="0.10">0.10 - Mini</SelectItem>
                  <SelectItem value="0.50">0.50 - Standard</SelectItem>
                  <SelectItem value="1.00">1.00 - Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prezzi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prezzo Entry</Label>
              <Input
                type="number"
                step="0.00001"
                value={tradeData.price}
                onChange={(e) => setTradeData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="1.08000"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Slippage (pips)</Label>
              <Input
                type="number"
                step="0.1"
                value={tradeData.maxSlippage}
                onChange={(e) => setTradeData(prev => ({ ...prev, maxSlippage: e.target.value }))}
                placeholder="3"
              />
            </div>
          </div>

          {/* Take Profit e Stop Loss */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Livelli di Protezione</Label>
              <Button 
                onClick={calculateSuggestedLevels}
                variant="outline" 
                size="sm"
              >
                <Target className="h-3 w-3 mr-1" />
                Calcola ATR
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  Take Profit
                </Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={tradeData.takeProfit}
                  onChange={(e) => setTradeData(prev => ({ ...prev, takeProfit: e.target.value }))}
                  placeholder="1.08500"
                />
                {priceCalculations.tpDistance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{priceCalculations.tpDistance.toFixed(1)} pips
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-red-600" />
                  Stop Loss
                </Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={tradeData.stopLoss}
                  onChange={(e) => setTradeData(prev => ({ ...prev, stopLoss: e.target.value }))}
                  placeholder="1.07500"
                />
                {priceCalculations.slDistance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    -{priceCalculations.slDistance.toFixed(1)} pips
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Risk/Reward Analysis */}
          {priceCalculations.riskReward > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-700">Analisi Rischio/Rendimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Rischio</Label>
                    <p className="font-medium text-red-600">${priceCalculations.risk.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rendimento</Label>
                    <p className="font-medium text-green-600">${priceCalculations.reward.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">R:R Ratio</Label>
                    <p className={`font-medium ${priceCalculations.riskReward >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                      1:{priceCalculations.riskReward.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Account di Replicazione */}
          <div>
            <Label className="text-sm font-medium">Replicazione Trade</Label>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">Account Slave 1</Badge>
              <Badge variant="secondary">Account Slave 2</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trade eseguito su TradingView e replicato automaticamente
            </p>
          </div>

          {/* Pulsanti Azione */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={executeTrade}
              disabled={loading || !tradeData.volume || !tradeData.price}
              className="flex-1"
              variant={tradeData.type === 'BUY' ? 'default' : 'destructive'}
            >
              {loading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : tradeData.type === 'BUY' ? (
                <TrendingUp className="h-4 w-4 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Esecuzione...' : `${tradeData.type} ${tradeData.volume} ${symbol}`}
            </Button>
            <Button onClick={onClose} variant="outline">
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}