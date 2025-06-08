import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save } from "lucide-react";
import type { Configuration } from "@/lib/types";

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: Configuration | null;
  onSave: (config: Partial<Configuration>) => Promise<void>;
}

export function ConfigurationModal({ isOpen, onClose, configuration, onSave }: ConfigurationModalProps) {
  const [formData, setFormData] = useState({
    mt5Server: configuration?.mt5Server || '',
    mt5Login: configuration?.mt5Login || '',
    mt5Password: configuration?.mt5Password || '',
    avaEndpoint: configuration?.avaEndpoint || '',
    avaAccountId: configuration?.avaAccountId || '',
    avaApiKey: configuration?.avaApiKey || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="config-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Platform Configuration
          </DialogTitle>
          <p id="config-description" className="text-sm text-muted-foreground">
            Configure your MetaTrader 5 and AvaFeatures platform connections
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* MetaTrader Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MetaTrader 5 Connection</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mt5-server">Server</Label>
                <Input
                  id="mt5-server"
                  placeholder="MetaQuotes-Demo"
                  value={formData.mt5Server}
                  onChange={(e) => handleInputChange('mt5Server', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mt5-login">Login</Label>
                <Input
                  id="mt5-login"
                  placeholder="Account Number"
                  value={formData.mt5Login}
                  onChange={(e) => handleInputChange('mt5Login', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="mt5-password">Password</Label>
                <Input
                  id="mt5-password"
                  type="password"
                  placeholder="Account Password"
                  value={formData.mt5Password}
                  onChange={(e) => handleInputChange('mt5Password', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* AvaFeatures Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AvaFeatures Connection</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ava-endpoint">API Endpoint</Label>
                <Input
                  id="ava-endpoint"
                  type="url"
                  placeholder="https://api.avafeatures.com"
                  value={formData.avaEndpoint}
                  onChange={(e) => handleInputChange('avaEndpoint', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ava-account">Account ID</Label>
                <Input
                  id="ava-account"
                  placeholder="Account Identifier"
                  value={formData.avaAccountId}
                  onChange={(e) => handleInputChange('avaAccountId', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ava-api-key">API Key</Label>
                <Input
                  id="ava-api-key"
                  type="password"
                  placeholder="Your API Key"
                  value={formData.avaApiKey}
                  onChange={(e) => handleInputChange('avaApiKey', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
