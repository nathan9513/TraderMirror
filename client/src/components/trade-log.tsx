import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, List, ArrowUp, ArrowDown, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Trade } from "@/lib/types";

interface TradeLogProps {
  trades: Trade[];
  onRefresh: () => void;
  onClear: () => void;
  isLoading: boolean;
}

export function TradeLog({ trades, onRefresh, onClear, isLoading }: TradeLogProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'BUY' 
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'BUY' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-3 h-3" />;
      case 'FAILED':
        return <XCircle className="w-3 h-3" />;
      case 'PENDING':
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            Trade Mirror Log
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Time</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="w-20">Volume</TableHead>
                <TableHead className="w-24">Price</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No trades recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                trades.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {formatTime(trade.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTypeColor(trade.type)} flex items-center gap-1 w-fit`}>
                        {getTypeIcon(trade.type)}
                        {trade.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseFloat(trade.volume).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseFloat(trade.price).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(trade.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(trade.status)}
                        {trade.status === 'SUCCESS' ? 'Success' : trade.status === 'FAILED' ? 'Failed' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {trade.latency ? `${trade.latency}ms` : '--'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {trades.length > 0 && (
          <div className="px-6 py-4 border-t bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">1-{trades.length}</span> of{' '}
                <span className="font-medium">{trades.length}</span> trades
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
