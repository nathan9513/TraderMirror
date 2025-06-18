import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Play, Square } from 'lucide-react';

interface TradingViewEmbedProps {
  symbol?: string;
  width?: string | number;
  height?: string | number;
  onTradeClick?: (type: 'BUY' | 'SELL') => void;
}

export function TradingViewEmbed({ 
  symbol = 'EURUSD', 
  width = '100%', 
  height = 400,
  onTradeClick 
}: TradingViewEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Create TradingView widget script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    
    // Widget configuration
    const config = {
      autosize: true,
      symbol: `FX_IDC:${symbol}`,
      interval: "15",
      timezone: "Europe/Rome",
      theme: "light",
      style: "1",
      locale: "it",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      withdateranges: true,
      range: "YTD",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      details: true,
      hotlist: true,
      calendar: true,
      studies: [
        "STD;SMA"
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      no_referral_id: true
    };

    script.innerHTML = JSON.stringify(config);

    if (containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
      
      // Mark as loaded after a delay
      setTimeout(() => setIsLoaded(true), 2000);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            TradingView Chart - {symbol}
          </CardTitle>
          <Badge variant={isLoaded ? "outline" : "secondary"}>
            {isLoaded ? "Caricato" : "Caricamento..."}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TradingView Widget Container */}
        <div 
          ref={containerRef}
          style={{ width, height }}
          className="tradingview-widget-container bg-white rounded-lg border"
        >
          {/* Fallback content while loading */}
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Caricamento grafico TradingView...</p>
            </div>
          </div>
        </div>

        {/* Quick Trade Controls */}
        {isLoaded && onTradeClick && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium">Esecuzione Rapida</h4>
              <p className="text-xs text-muted-foreground">
                Trade diretti su {symbol}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onTradeClick('BUY')}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-3 w-3 mr-1" />
                BUY
              </Button>
              <Button
                onClick={() => onTradeClick('SELL')}
                size="sm"
                variant="destructive"
              >
                <Square className="h-3 w-3 mr-1" />
                SELL
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}