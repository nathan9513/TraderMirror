import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Play, TrendingUp, Target, Shield, TrendingDown } from "lucide-react";
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

  const handleTakeProfitToggle = (checked: boolean) => {
    onConfigurationChange({ enableTakeProfit: checked });
  };

  const handleStopLossToggle = (checked: boolean) => {
    onConfigurationChange({ enableStopLoss: checked });
  };

  const handleTrailingStopToggle = (checked: boolean) => {
    onConfigurationChange({ enableTrailingStop: checked });
  };

  const handleTakeProfitPointsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10000) {
      onConfigurationChange({ takeProfitPoints: numValue });
    }
  };

  const handleStopLossPointsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10000) {
      onConfigurationChange({ stopLossPoints: numValue });
    }
  };

  const handleTrailingStopPointsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 1000) {
      onConfigurationChange({ trailingStopPoints: numValue });
    }
  };

  const handleMaxSlippageChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onConfigurationChange({ maxSlippage: numValue });
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

      {/* Trading Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Trading Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Take Profit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Take Profit
                </div>
                <div className="text-xs text-muted-foreground">Automatically close profitable trades</div>
              </div>
              <Switch
                checked={configuration?.enableTakeProfit || false}
                onCheckedChange={handleTakeProfitToggle}
              />
            </div>
            {configuration?.enableTakeProfit && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="tp-points" className="text-sm">Points</Label>
                <Input
                  id="tp-points"
                  type="number"
                  min="1"
                  max="10000"
                  value={configuration?.takeProfitPoints || 100}
                  onChange={(e) => handleTakeProfitPointsChange(e.target.value)}
                  className="h-8"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Stop Loss */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  Stop Loss
                </div>
                <div className="text-xs text-muted-foreground">Limit losses on trades</div>
              </div>
              <Switch
                checked={configuration?.enableStopLoss || false}
                onCheckedChange={handleStopLossToggle}
              />
            </div>
            {configuration?.enableStopLoss && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="sl-points" className="text-sm">Points</Label>
                <Input
                  id="sl-points"
                  type="number"
                  min="1"
                  max="10000"
                  value={configuration?.stopLossPoints || 50}
                  onChange={(e) => handleStopLossPointsChange(e.target.value)}
                  className="h-8"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Trailing Stop */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-blue-600" />
                  Trailing Stop
                </div>
                <div className="text-xs text-muted-foreground">Dynamic stop loss that follows price</div>
              </div>
              <Switch
                checked={configuration?.enableTrailingStop || false}
                onCheckedChange={handleTrailingStopToggle}
              />
            </div>
            {configuration?.enableTrailingStop && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="ts-points" className="text-sm">Points</Label>
                <Input
                  id="ts-points"
                  type="number"
                  min="1"
                  max="1000"
                  value={configuration?.trailingStopPoints || 30}
                  onChange={(e) => handleTrailingStopPointsChange(e.target.value)}
                  className="h-8"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Max Slippage */}
          <div className="space-y-2">
            <Label htmlFor="max-slippage">Max Slippage (points)</Label>
            <Input
              id="max-slippage"
              type="number"
              min="0"
              max="100"
              value={configuration?.maxSlippage || 3}
              onChange={(e) => handleMaxSlippageChange(e.target.value)}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground">Maximum price deviation allowed</p>
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
