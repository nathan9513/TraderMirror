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
import { ReplicationStatus } from "@/components/replication-status";
import { Watermark } from "@/components/watermark";
import { PreAlphaWarning } from "@/components/pre-alpha-warning";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { Settings, RotateCcw, Users, Cable, TrendingUp, LogOut } from "lucide-react";
import { InlineWatermark } from "@/components/watermark";
import type { Trade, Connection, Configuration, Stats, WebSocketMessage } from "@/lib/types";

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreAlphaWarning, setShowPreAlphaWarning] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected: wsConnected, lastMessage } = useWebSocket();

  // Check if pre-alpha warning should be shown on component mount
  useEffect(() => {
    const warningShown = localStorage.getItem('preAlphaWarningShown');
    if (!warningShown) {
      setShowPreAlphaWarning(true);
    }
  }, []);

  // Queries
  const { data: trades = [], isLoading: tradesLoading, refetch: refetchTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const { data: connections = [], error: connectionsError } = useQuery<Connection[]>({
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
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                <RotateCcw className="inline w-5 h-5 text-primary mr-2" />
                Lantea
              </h1>
              <InlineWatermark />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected && connections.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${systemStatusColor}`}>{systemStatus}</span>
              </div>
              {onLogout && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="replication" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Replica
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
            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* System Status */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sistema</p>
                    <p className="text-lg font-semibold">{wsConnected ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              </div>

              {/* Active Connections */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <Cable className="w-6 h-6 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connessioni</p>
                    <p className="text-lg font-semibold">{Array.isArray(connections) ? connections.filter(c => c.status === 'Connected').length : 0}/{Array.isArray(connections) ? connections.length : 0}</p>
                  </div>
                </div>
              </div>

              {/* Today's Trades */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trade Oggi</p>
                    <p className="text-lg font-semibold">{stats?.tradesCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <RotateCcw className="w-6 h-6 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Successo</p>
                    <p className="text-lg font-semibold">
                      {stats?.tradesCount ? Math.round((stats.successfulTrades || 0) / stats.tradesCount * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <ConnectionStatus
              connections={Array.isArray(connections) ? connections : []}
              onReconnect={handleReconnect}
              onTestConnection={handleTestConnection}
              isReconnecting={isReconnecting}
              isTesting={isTesting}
            />

            {/* Trade Log */}
            <TradeLog
              trades={trades}
              onRefresh={handleRefreshTrades}
              onClear={handleClearTrades}
              isLoading={tradesLoading}
            />
          </TabsContent>

          <TabsContent value="accounts">
            <AccountManager />
          </TabsContent>

          <TabsContent value="replication">
            <ReplicationStatus />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionStatus
              connections={Array.isArray(connections) ? connections : []}
              onReconnect={handleReconnect}
              onTestConnection={handleTestConnection}
              isReconnecting={isReconnecting}
              isTesting={isTesting}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configurazione Sistema
              </h2>
              <ControlPanel
                configuration={configuration || null}
                stats={stats || null}
                onConfigurationChange={handleConfigurationChange}
              />
            </div>
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
      
      {/* Pre-Alpha Warning Popup */}
      <PreAlphaWarning 
        isOpen={showPreAlphaWarning}
        onClose={() => setShowPreAlphaWarning(false)}
      />
      
      {/* Global Watermark */}
      <Watermark position="bottom-right" />
    </div>
  );
}
