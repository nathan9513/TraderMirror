import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Unlock, Clock, TrendingUp } from 'lucide-react';

interface ConflictStatus {
  isLocked: boolean;
  queueSize: number;
  lastManualActivity: string | null;
  conflicts: number;
}

interface ConflictMonitorProps {
  accountId: number;
  accountName: string;
}

export function ConflictMonitor({ accountId, accountName }: ConflictMonitorProps) {
  const [status, setStatus] = useState<ConflictStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConflictStatus();
    const interval = setInterval(fetchConflictStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [accountId]);

  const fetchConflictStatus = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/conflict-status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching conflict status:', error);
    }
  };

  const unlockAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        fetchConflictStatus();
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
    } finally {
      setLoading(false);
    }
  };

  const reportManualTrade = async (trade: any) => {
    try {
      await fetch(`/api/accounts/${accountId}/manual-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade)
      });
      
      fetchConflictStatus();
    } catch (error) {
      console.error('Error reporting manual trade:', error);
    }
  };

  if (!status) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Gestione Conflitti - {accountName}
          </CardTitle>
          <CardDescription>
            Caricamento stato conflitti...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Gestione Conflitti - {accountName}
        </CardTitle>
        <CardDescription>
          Controllo operazioni manuali vs replicazione automatica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {status.isLocked ? (
              <>
                <Lock className="h-4 w-4 text-red-500" />
                <Badge variant="destructive">Bloccato</Badge>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-green-500" />
                <Badge variant="outline">Attivo</Badge>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              {status.queueSize} in coda
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              {status.conflicts} conflitti
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {status.lastManualActivity ? (
              <>
                Ultimo: {new Date(status.lastManualActivity).toLocaleTimeString()}
              </>
            ) : (
              'Nessuna attività manuale'
            )}
          </div>
        </div>

        {/* Conflict Resolution */}
        {status.isLocked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Replicazione In Pausa
              </span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              La replicazione è stata messa in pausa a causa di operazioni manuali rilevate. 
              {status.queueSize > 0 && ` ${status.queueSize} trade sono in coda.`}
            </p>
            <Button
              onClick={unlockAccount}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? 'Sblocco...' : 'Riprendi Replicazione'}
            </Button>
          </div>
        )}

        {/* Queue Information */}
        {status.queueSize > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                Trade in Coda
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {status.queueSize} trade in attesa di essere eseguiti quando l'attività manuale si interrompe.
            </p>
          </div>
        )}

        {/* Manual Trade Simulator (for testing) */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Test Conflitti</h4>
          <div className="flex gap-2">
            <Button
              onClick={() => reportManualTrade({
                symbol: 'EURUSD',
                type: 'BUY',
                volume: 0.1,
                price: 1.0850
              })}
              size="sm"
              variant="outline"
            >
              Simula Trade Manuale
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}