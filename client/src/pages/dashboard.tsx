import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/connection-status";
import { ControlPanel } from "@/components/control-panel";
import { TradeLog } from "@/components/trade-log";
import { ConfigurationModal } from "@/components/configuration-modal";
import { AccountManager } from "@/components/account-manager";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { Settings, RotateCcw, Users, Cable, TrendingUp } from "lucide-react";
import type { Trade, Connection, Configuration, Stats, WebSocketMessage } from "@/lib/types";

export default function Dashboard() {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected: wsConnected, lastMessage } = useWebSocket();

  // Queries
  const { data: trades = [], isLoading: tradesLoading, refetch: refetchTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
  });

  const { data: configuration } = useQuery<Configuration>({
    queryKey: ['/api/configuration'],
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['/api/stats/today'],
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<Configuration>) => {
      const response = await apiRequest('POST', '/api/configuration', config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configuration'] });
      toast({
        title: "Configuration Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update configuration.",
        variant: "destructive",
      });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest('POST', '/api/connections/reconnect', { platform });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      toast({
        title: "Reconnection Initiated",
        description: "Attempting to reconnect to the platform.",
      });
    },
    onError: () => {
      toast({
        title: "Reconnection Failed",
        description: "Unable to reconnect to the platform.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest('POST', '/api/connections/test', { platform });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      toast({
        title: "Connection Test Complete",
        description: "Connection test finished successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Connection test failed.",
        variant: "destructive",
      });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const message: WebSocketMessage = lastMessage;

    switch (message.type) {
      case 'newTrade':
        queryClient.setQueryData(['/api/trades'], (oldTrades: Trade[] = []) => {
          return [message.data, ...oldTrades.slice(0, 49)]; // Keep only 50 most recent
        });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/today'] });
        break;

      case 'connections':
        queryClient.setQueryData(['/api/connections'], message.data);
        break;

      case 'configuration':
        queryClient.setQueryData(['/api/configuration'], message.data);
        break;

      case 'stats':
        queryClient.setQueryData(['/api/stats/today'], message.data);
        break;

      case 'tradesCleared':
        queryClient.setQueryData(['/api/trades'], []);
        break;

      default:
        break;
    }
  }, [lastMessage, queryClient]);

  const handleConfigurationChange = async (config: Partial<Configuration>) => {
    updateConfigMutation.mutate(config);
  };

  const handleReconnect = async (platform: string) => {
    setIsReconnecting(true);
    try {
      await reconnectMutation.mutateAsync(platform);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleTestConnection = async (platform: string) => {
    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync(platform);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshTrades = () => {
    refetchTrades();
  };

  const clearTradesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/trades');
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/trades'], []);
      toast({
        title: "Trades Cleared",
        description: "All trade records have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear trades.",
        variant: "destructive",
      });
    },
  });

  const handleClearTrades = () => {
    clearTradesMutation.mutate();
  };

  const systemStatus = connections && connections.length > 0 && connections.every(conn => conn.status === 'Connected') ? 'System Online' : 'System Issues';
  const systemStatusColor = connections && connections.length > 0 && connections.every(conn => conn.status === 'Connected') ? 'text-green-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                <RotateCcw className="inline w-5 h-5 text-primary mr-2" />
                TradeSync Pro
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected && connections.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${systemStatusColor}`}>{systemStatus}</span>
              </div>
              <Button onClick={() => setShowConfigModal(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Cable className="h-4 w-4" />
              Connessioni
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Impostazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Connection Status Cards */}
            <ConnectionStatus
              connections={connections}
              onReconnect={handleReconnect}
              onTestConnection={handleTestConnection}
              isReconnecting={isReconnecting}
              isTesting={isTesting}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Control Panel */}
              <div className="lg:col-span-1">
                <ControlPanel
                  configuration={configuration || null}
                  stats={stats || null}
                  onConfigurationChange={handleConfigurationChange}
                />
              </div>

              {/* Trade Log */}
              <div className="lg:col-span-2">
                <TradeLog
                  trades={trades}
                  onRefresh={handleRefreshTrades}
                  onClear={handleClearTrades}
                  isLoading={tradesLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <AccountManager />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionStatus
              connections={connections}
              onReconnect={handleReconnect}
              onTestConnection={handleTestConnection}
              isReconnecting={isReconnecting}
              isTesting={isTesting}
            />
          </TabsContent>

          <TabsContent value="settings">
            <ControlPanel
              configuration={configuration || null}
              stats={stats || null}
              onConfigurationChange={handleConfigurationChange}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        configuration={configuration || null}
        onSave={handleConfigurationChange}
      />
    </div>
  );
}
