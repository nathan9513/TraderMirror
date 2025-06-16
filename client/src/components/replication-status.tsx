import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReplicationStatusData {
  accountId: number;
  status: string;
}

interface ReplicationStatusProps {
  className?: string;
}

export function ReplicationStatus({ className }: ReplicationStatusProps) {
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Fetch replication status
  const { data: replicationStatus = [], isLoading: statusLoading } = useQuery<ReplicationStatusData[]>({
    queryKey: ['/api/replication/status'],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Start replication mutation
  const startReplicationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/replication/start', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start replication');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/replication/status'] });
      toast({
        title: "Replica Avviata",
        description: "Il sistema di replica trade è ora attivo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile avviare il sistema di replica.",
        variant: "destructive",
      });
    },
  });

  // Stop replication mutation
  const stopReplicationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/replication/stop', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop replication');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/replication/status'] });
      toast({
        title: "Replica Fermata",
        description: "Il sistema di replica trade è stato arrestato.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile fermare il sistema di replica.",
        variant: "destructive",
      });
    },
  });

  const handleStartReplication = async () => {
    setIsStarting(true);
    try {
      await startReplicationMutation.mutateAsync();
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopReplication = async () => {
    setIsStopping(true);
    try {
      await stopReplicationMutation.mutateAsync();
    } finally {
      setIsStopping(false);
    }
  };

  const connectedAccounts = replicationStatus.filter(status => status.status === 'Connected').length;
  const totalAccounts = replicationStatus.length;
  const connectionProgress = totalAccounts > 0 ? (connectedAccounts / totalAccounts) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Connecting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'Connected' ? 'default' : status === 'Connecting' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sistema Replica Master-Slave
              </CardTitle>
              <CardDescription>
                Monitora e controlla la replica automatica dall'account Master agli account Slave
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleStartReplication}
                disabled={isStarting || startReplicationMutation.isPending}
                variant="default"
                size="sm"
              >
                {isStarting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Avvia Replica
              </Button>
              <Button
                onClick={handleStopReplication}
                disabled={isStopping || stopReplicationMutation.isPending}
                variant="outline"
                size="sm"
              >
                {isStopping ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Ferma Replica
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Account Connessi</span>
              <span className="font-medium">{connectedAccounts}/{totalAccounts}</span>
            </div>
            <Progress value={connectionProgress} className="h-2" />
          </div>

          {/* Status Alert */}
          {totalAccounts === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nessun Account Configurato</AlertTitle>
              <AlertDescription>
                Configura almeno un account nella sezione "Account" per iniziare la replica.
              </AlertDescription>
            </Alert>
          ) : connectedAccounts === totalAccounts ? (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-400">Sistema Operativo</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Tutti gli account sono connessi e pronti per la replica.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-400">Connessioni Parziali</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                Alcuni account non sono connessi. Verifica le configurazioni.
              </AlertDescription>
            </Alert>
          )}

          {/* Account Status List */}
          {replicationStatus.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Stato Account</h4>
              <div className="space-y-2">
                {replicationStatus.map((accountStatus) => (
                  <div key={accountStatus.accountId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(accountStatus.status)}
                      <span className="font-medium">Account {accountStatus.accountId}</span>
                    </div>
                    {getStatusBadge(accountStatus.status)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {statusLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Caricamento stato replica...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Come Funziona la Replica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary">1</span>
            </div>
            <p>Il sistema monitora costantemente MetaTrader Desktop per nuove operazioni</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary">2</span>
            </div>
            <p>Ogni trade viene automaticamente replicato su tutti gli account configurati</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary">3</span>
            </div>
            <p>I volumi vengono adattati in base al moltiplicatore di rischio di ogni account</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary">4</span>
            </div>
            <p>Take Profit e Stop Loss vengono calcolati automaticamente se abilitati</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}