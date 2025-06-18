import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartTradeModal } from '@/components/ui/chart-trade-modal';
import { TrendingUp, Play, Square, MousePointer } from 'lucide-react';

interface TradingViewEmbedProps {
  symbol?: string;
  width?: string | number;
  height?: string | number;
  onTradeClick?: (type: 'BUY' | 'SELL') => void;
  onTradeExecute?: (trade: any) => void;
}

export function TradingViewEmbed({ 
  symbol = 'EURUSD', 
  width = '100%', 
  height = 600,
  onTradeClick,
  onTradeExecute 
}: TradingViewEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [clickedPrice, setClickedPrice] = useState<number | undefined>();

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
        "STD;SMA",
        "RSI@tv-basicstudies"
      ],
      show_popup_button: true,
      popup_width: "1200",
      popup_height: "800",
      no_referral_id: true,
      enabled_features: [
        'study_templates',
        'side_toolbar_in_fullscreen_mode',
        'trading_signals',
        'header_saveload',
        'chart_crosshair_menu'
      ],
      disabled_features: [
        'use_localstorage_for_settings',
        'volume_force_overlay'
      ]
    };

    script.innerHTML = JSON.stringify(config);

    if (containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
      
      // Widget loaded successfully with chart interaction
      setTimeout(() => {
        setIsLoaded(true);
        
        // Setup chart interaction for trade execution
        if (containerRef.current) {
          const chartContainer = containerRef.current.querySelector('iframe');
          if (chartContainer) {
            // Add click event listener to chart area
            chartContainer.addEventListener('click', (event) => {
              // Simulate price extraction from chart click
              const rect = chartContainer.getBoundingClientRect();
              const y = event.clientY - rect.top;
              const chartHeight = rect.height;
              
              // Simple price estimation based on click position
              const priceRange = 0.1; // Assume 0.1 price range for demonstration
              const estimatedPrice = 1.0800 + (1 - y / chartHeight) * priceRange;
              
              setClickedPrice(estimatedPrice);
              setShowTradeModal(true);
            });
          }
        }
      }, 3000);
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

        {/* Trading Controls */}
        {isLoaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Quick Trade Controls */}
            {onTradeClick && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium">Esecuzione Rapida</h4>
                  <p className="text-xs text-muted-foreground">
                    Trade istantanei su {symbol}
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

            {/* Chart Click Trade */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium">Trade da Grafico</h4>
                <p className="text-xs text-muted-foreground">
                  Clicca direttamente sul grafico o usa il pulsante
                </p>
              </div>
              <Button
                onClick={() => {
                  setClickedPrice(undefined);
                  setShowTradeModal(true);
                }}
                size="sm"
                variant="outline"
              >
                <MousePointer className="h-3 w-3 mr-1" />
                Apri Trade
              </Button>
            </div>
          </div>
        )}

        {/* Chart Trade Modal */}
        <ChartTradeModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          symbol={symbol}
          price={clickedPrice}
          onTradeExecute={onTradeExecute}
        />
      </CardContent>
    </Card>
  );
}