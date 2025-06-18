import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Play, Square } from 'lucide-react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  onTradeExecute?: (trade: any) => void;
}

export function TradingViewWidget({ 
  symbol = 'EURUSD', 
  interval = '15',
  theme = 'light',
  onTradeExecute 
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Load TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      setIsLoaded(true);
      initializeTradingView();
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initializeTradingView = () => {
    if (!window.TradingView || !containerRef.current) return;

    try {
      widgetRef.current = new window.TradingView.widget({
        width: '100%',
        height: 600,
        symbol: `FX_IDC:${symbol}`,
        interval: interval,
        timezone: 'Europe/Rome',
        theme: theme,
        style: '1',
        locale: 'it',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerRef.current.id,
        studies: [
          'MAExp@tv-basicstudies',
          'RSI@tv-basicstudies'
        ],
        overrides: {
          'paneProperties.background': theme === 'dark' ? '#1e1e1e' : '#ffffff',
          'paneProperties.vertGridProperties.color': theme === 'dark' ? '#363c4e' : '#e6e6e6',
          'paneProperties.horzGridProperties.color': theme === 'dark' ? '#363c4e' : '#e6e6e6',
        },
        studies_overrides: {},
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'header_symbol_search',
          'header_resolutions'
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode'
        ]
      });

      // Widget loaded successfully
      setTimeout(() => {
        setIsConnected(true);
      }, 2000);

    } catch (error) {
      console.error('Error initializing TradingView widget:', error);
    }
  };

  const executeQuickTrade = async (type: 'BUY' | 'SELL') => {
    try {
      const response = await fetch('/api/platform/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          type: type,
          volume: 0.1,
          replicateToAccounts: [1, 2] // Replica su tutti gli account slave
        })
      });

      const result = await response.json();
      
      if (result.success && onTradeExecute) {
        onTradeExecute({
          symbol,
          type,
          volume: 0.1,
          success: true,
          originTradeId: result.originTradeId
        });
      }
    } catch (error) {
      console.error('Error executing trade:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingView className="h-5 w-5" />
              TradingView Live Chart
            </CardTitle>
            <CardDescription>
              Grafico in tempo reale con esecuzione trade diretta
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connesso
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                {isLoaded ? 'Caricamento...' : 'Disconnesso'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TradingView Widget Container */}
        <div 
          ref={containerRef}
          id={`tradingview-widget-${Math.random().toString(36).substr(2, 9)}`}
          className="w-full bg-white rounded-lg overflow-hidden border"
        />

        {/* Quick Trade Controls */}
        {isConnected && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium mb-1">Esecuzione Rapida</h4>
              <p className="text-xs text-muted-foreground">
                Trade eseguiti su piattaforma e replicati automaticamente
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => executeQuickTrade('BUY')}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-3 w-3 mr-1" />
                BUY 0.1
              </Button>
              <Button
                onClick={() => executeQuickTrade('SELL')}
                size="sm"
                variant="destructive"
              >
                <Square className="h-3 w-3 mr-1" />
                SELL 0.1
              </Button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isLoaded && (
          <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Caricamento TradingView...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Fix per il componente TrendingView
function TrendingView({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}