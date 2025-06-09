import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Trash2, Cable, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Account, AccountConfiguration } from "@shared/schema";

interface AccountManagerProps {
  className?: string;
}

export function AccountManager({ className }: AccountManagerProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: { name: string; platform: string }) => {
      return apiRequest('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Account creato",
        description: "Nuovo account di trading configurato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare l'account. Riprova.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return apiRequest(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Account eliminato",
        description: "Account rimosso con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'account. Riprova.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAccount = (formData: FormData) => {
    const name = formData.get('name') as string;
    const platform = formData.get('platform') as string;
    
    if (!name || !platform) return;
    
    createAccountMutation.mutate({ name, platform });
  };

  const handleDeleteAccount = (accountId: number) => {
    if (confirm('Sei sicuro di voler eliminare questo account?')) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const openConfigDialog = (account: Account) => {
    setSelectedAccount(account);
    setIsConfigDialogOpen(true);
  };

  if (accountsLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestione Account</h2>
          <p className="text-muted-foreground">
            Gestisci account multipli per il trading mirror
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Account</DialogTitle>
              <DialogDescription>
                Aggiungi un nuovo account di trading per il mirroring
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreateAccount}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Account</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="es. Account Principale MT5"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="platform">Piattaforma</Label>
                  <Select name="platform" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona piattaforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MetaTrader">MetaTrader 5</SelectItem>
                      <SelectItem value="AvaFeatures">AvaFeatures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? "Creazione..." : "Crea Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{account.name}</CardTitle>
                <Badge variant={account.platform === 'MetaTrader' ? 'default' : 'secondary'}>
                  {account.platform}
                </Badge>
              </div>
              <CardDescription>
                Creato il {new Date(account.createdAt).toLocaleDateString('it-IT')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openConfigDialog(account)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configura
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`#account-${account.id}-trades`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Trade
                    </a>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {accounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Cable className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun Account Configurato</h3>
              <p className="text-muted-foreground text-center mb-4">
                Inizia creando il tuo primo account di trading per abilitare il mirroring
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account Configuration Dialog */}
      {selectedAccount && (
        <AccountConfigurationDialog
          account={selectedAccount}
          isOpen={isConfigDialogOpen}
          onClose={() => {
            setIsConfigDialogOpen(false);
            setSelectedAccount(null);
          }}
        />
      )}
    </div>
  );
}

interface AccountConfigurationDialogProps {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}

function AccountConfigurationDialog({ account, isOpen, onClose }: AccountConfigurationDialogProps) {
  const { toast } = useToast();

  // Fetch account configuration
  const { data: config, isLoading: configLoading } = useQuery<AccountConfiguration>({
    queryKey: ['/api/accounts', account.id, 'configuration'],
    enabled: isOpen,
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<AccountConfiguration>) => {
      return apiRequest(`/api/accounts/${account.id}/configuration`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', account.id, 'configuration'] });
      toast({
        title: "Configurazione aggiornata",
        description: "Le impostazioni dell'account sono state salvate.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione. Riprova.",
        variant: "destructive",
      });
    },
  });

  const handleConfigSubmit = (formData: FormData) => {
    const updates: Partial<AccountConfiguration> = {};
    
    // Connection settings
    if (account.platform === 'MetaTrader') {
      updates.mt5Server = formData.get('mt5Server') as string || null;
      updates.mt5Login = formData.get('mt5Login') as string || null;
      updates.mt5Password = formData.get('mt5Password') as string || null;
    } else if (account.platform === 'AvaFeatures') {
      updates.avaEndpoint = formData.get('avaEndpoint') as string || null;
      updates.avaAccountId = formData.get('avaAccountId') as string || null;
      updates.avaApiKey = formData.get('avaApiKey') as string || null;
    }
    
    // Risk settings
    const riskMultiplier = formData.get('riskMultiplier') as string;
    if (riskMultiplier) {
      updates.riskMultiplier = riskMultiplier;
    }
    
    updateConfigMutation.mutate(updates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurazione Account: {account.name}</DialogTitle>
          <DialogDescription>
            Configura le impostazioni di connessione e rischio per {account.platform}
          </DialogDescription>
        </DialogHeader>
        
        {configLoading ? (
          <div className="py-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <form action={handleConfigSubmit}>
            <Tabs defaultValue="connection" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="connection">Connessione</TabsTrigger>
                <TabsTrigger value="risk">Gestione Rischio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="connection" className="space-y-4">
                {account.platform === 'MetaTrader' ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="mt5Server">Server MT5</Label>
                      <Input
                        id="mt5Server"
                        name="mt5Server"
                        defaultValue={config?.mt5Server || ''}
                        placeholder="es. MetaQuotes-Demo"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mt5Login">Login</Label>
                      <Input
                        id="mt5Login"
                        name="mt5Login"
                        defaultValue={config?.mt5Login || ''}
                        placeholder="Numero account"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mt5Password">Password</Label>
                      <Input
                        id="mt5Password"
                        name="mt5Password"
                        type="password"
                        defaultValue={config?.mt5Password || ''}
                        placeholder="Password account"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="avaEndpoint">Endpoint API</Label>
                      <Input
                        id="avaEndpoint"
                        name="avaEndpoint"
                        defaultValue={config?.avaEndpoint || ''}
                        placeholder="https://api.avafeatures.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="avaAccountId">Account ID</Label>
                      <Input
                        id="avaAccountId"
                        name="avaAccountId"
                        defaultValue={config?.avaAccountId || ''}
                        placeholder="ID account AvaFeatures"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="avaApiKey">API Key</Label>
                      <Input
                        id="avaApiKey"
                        name="avaApiKey"
                        type="password"
                        defaultValue={config?.avaApiKey || ''}
                        placeholder="Chiave API AvaFeatures"
                      />
                    </div>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="risk" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="riskMultiplier">Moltiplicatore Rischio</Label>
                  <Input
                    id="riskMultiplier"
                    name="riskMultiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    defaultValue={config?.riskMultiplier || '1.0'}
                    placeholder="1.0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Fattore di moltiplicazione per il volume dei trade (es. 1.0 = volume identico, 0.5 = metà volume)
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending ? "Salvando..." : "Salva Configurazione"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}