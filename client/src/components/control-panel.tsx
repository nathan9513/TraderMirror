import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, TrendingUp } from "lucide-react";
import type { Configuration, Stats } from "@/lib/types";

interface ControlPanelProps {
  configuration: Configuration | null;
  stats: Stats | null;
  onConfigurationChange: (config: Partial<Configuration>) => void;
}

export function ControlPanel({ configuration, stats, onConfigurationChange }: ControlPanelProps) {
  const handleMirrorToggle = (checked: boolean) => {
    onConfigurationChange({ isMirrorActive: checked });
  };

  const handleAutoReconnectToggle = (checked: boolean) => {
    onConfigurationChange({ isAutoReconnectEnabled: checked });
  };

  const handleRiskMultiplierChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 10) {
      onConfigurationChange({ riskMultiplier: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Mirror Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-medium">Trade Mirroring</div>
              <div className="text-sm text-muted-foreground">Sync trades 1:1 between platforms</div>
            </div>
            <Switch
              checked={configuration?.isMirrorActive || false}
              onCheckedChange={handleMirrorToggle}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-medium">Auto-Reconnect</div>
              <div className="text-sm text-muted-foreground">Automatically reconnect on failure</div>
            </div>
            <Switch
              checked={configuration?.isAutoReconnectEnabled || false}
              onCheckedChange={handleAutoReconnectToggle}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-multiplier">Risk Multiplier</Label>
            <Input
              id="risk-multiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={configuration?.riskMultiplier || "1.0"}
              onChange={(e) => handleRiskMultiplierChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Multiply position size by this factor</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Today's Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Trades Mirrored</span>
            <span className="text-xl font-bold">{stats?.tradesCount || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="text-xl font-bold text-green-600">
              {stats && stats.tradesCount > 0 
                ? `${((stats.successfulTrades / stats.tradesCount) * 100).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Avg. Latency</span>
            <span className="text-xl font-bold text-primary">{stats?.avgLatency || 0}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Failed Trades</span>
            <span className="text-xl font-bold text-red-600">{stats?.failedTrades || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
