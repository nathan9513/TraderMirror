import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Clock, Zap, Activity } from 'lucide-react';

interface TradeEvent {
  id: string;
  type: 'platform_trade' | 'slave_trade' | 'replication' | 'conflict';
  timestamp: string;
  data: any;
}

export function LiveTradeFeed() {
  const [events, setEvents] = useState<TradeEvent[]>([]);

  useEffect(() => {
    // Connect to WebSocket for live updates
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Convert WebSocket messages to trade events
          if (message.type === 'platform_trade_executed') {
            setEvents(prev => [{
              id: Date.now().toString(),
              type: 'platform_trade',
              timestamp: message.data.timestamp,
              data: message.data
            }, ...prev.slice(0, 19)]); // Keep only last 20 events
          }
          
          if (message.type === 'slave_trade_executed') {
            setEvents(prev => [{
              id: Date.now().toString(),
              type: 'slave_trade', 
              timestamp: message.data.timestamp,
              data: message.data
            }, ...prev.slice(0, 19)]);
          }
          
          if (message.type === 'manual_trade_detected') {
            setEvents(prev => [{
              id: Date.now().toString(),
              type: 'conflict',
              timestamp: message.data.timestamp,
              data: message.data
            }, ...prev.slice(0, 19)]);
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'platform_trade':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'slave_trade':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      case 'replication':
        return <Zap className="h-4 w-4 text-purple-600" />;
      case 'conflict':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'platform_trade':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Platform</Badge>;
      case 'slave_trade':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Slave</Badge>;
      case 'replication':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Replica</Badge>;
      case 'conflict':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Conflitto</Badge>;
      default:
        return <Badge variant="outline">Evento</Badge>;
    }
  };

  const formatEventDescription = (event: TradeEvent) => {
    switch (event.type) {
      case 'platform_trade':
        return `Trade eseguito su TradingView - ${event.data.replicationResults?.length || 0} repliche`;
      case 'slave_trade':
        return `Trade diretto su Account ${event.data.accountId}`;
      case 'conflict':
        return `Attività manuale rilevata su Account ${event.data.accountId}`;
      default:
        return 'Evento sistema';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Feed Operazioni Live
        </CardTitle>
        <CardDescription>
          Monitoraggio in tempo reale di tutte le attività trading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessuna attività recente</p>
              <p className="text-sm">I trade appariranno qui in tempo reale</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50/50">
                  <div className="mt-0.5">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getEventBadge(event.type)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">
                      {formatEventDescription(event)}
                    </p>
                    {event.data.trade && (
                      <p className="text-xs text-muted-foreground">
                        {event.data.trade.symbol} {event.data.trade.type} {event.data.trade.volume}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}