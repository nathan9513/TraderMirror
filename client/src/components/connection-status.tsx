import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import type { Connection } from "@/lib/types";

interface ConnectionStatusProps {
  connections: Connection[];
  onReconnect: (platform: string) => void;
  isReconnecting: boolean;
}

export function ConnectionStatus({ connections, onReconnect, isReconnecting }: ConnectionStatusProps) {
  const getConnection = (platform: string) => 
    connections.find(conn => conn.platform === platform);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected':
        return <Wifi className="w-3 h-3" />;
      case 'Connecting':
        return <Clock className="w-3 h-3 animate-spin" />;
      default:
        return <WifiOff className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected':
        return 'bg-green-100 text-green-800';
      case 'Connecting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const renderConnectionCard = (platform: string) => {
    const connection = getConnection(platform);
    if (!connection) return null;

    return (
      <Card key={platform}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            {platform}
            <Badge className={`${getStatusColor(connection.status)} flex items-center gap-1`}>
              {getStatusIcon(connection.status)}
              {connection.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Server:</span>
            <span className="font-medium">{connection.server || 'Not configured'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account:</span>
            <span className="font-medium">{connection.account || 'Not configured'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Ping:</span>
            <span className={`font-medium ${connection.lastPing ? 'text-green-600' : 'text-muted-foreground'}`}>
              {connection.lastPing ? `${connection.lastPing}ms` : 'N/A'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => onReconnect(platform)}
            disabled={isReconnecting || connection.status === 'Connecting'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isReconnecting ? 'animate-spin' : ''}`} />
            Reconnect
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {renderConnectionCard('MetaTrader')}
      {renderConnectionCard('AvaFeatures')}
    </div>
  );
}
