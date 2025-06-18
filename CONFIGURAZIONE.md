# Guida Configurazione Lantea Trading System

## Configurazione Iniziale del Sistema

### 1. Primo Accesso

**Autenticazione Sistema**:
- Password: `Dennisd-401`
- Versione: `_BlueIce_copper_25H2_lab1` (Pre-Alpha)

**URL di accesso**:
- Locale: `http://localhost:5000`
- Produzione: `https://your-domain.com`

### 2. Configurazione Database

Il sistema richiede PostgreSQL configurato automaticamente:

```bash
# Verifica connessione database
npm run db:push
```

Variabili ambiente necessarie:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=lantea
```

## Configurazione Account Trading

### Account Master (MetaTrader)

Un account master genera i segnali di trading che vengono replicati agli account slave.

**Configurazione nel Dashboard**:

1. **Accedi alla sezione Account**
2. **Clicca "Aggiungi Account Master"**
3. **Compila i campi**:
   ```
   Nome Account: Es. "Trading Principal"
   Piattaforma: MetaTrader
   Tipo: Master
   Server MT5: Es. "MetaQuotes-Demo" o server del tuo broker
   Login: Numero account MT5 (es. 5037267554)
   Password: Password account MT5
   ```

4. **Configurazioni Avanzate**:
   ```
   Simboli Monitorati: EURUSD,GBPUSD,USDJPY,AUDCAD,USDCAD
   Monitoraggio Attivo: ✓ Abilitato
   Frequenza Check: 1 secondo
   ```

### Account Slave (Destinazioni)

Gli account slave ricevono e eseguono automaticamente i trade dall'account master.

#### MetaTrader Slave

1. **Aggiungi Account Slave MetaTrader**:
   ```
   Nome Account: Es. "Slave Account 1"
   Piattaforma: MetaTrader
   Tipo: Slave
   Server MT5: Server dell'account slave
   Login: Numero account slave
   Password: Password account slave
   Moltiplicatore Rischio: 1.0 (100% del volume master)
   ```

2. **Configurazioni Rischio**:
   ```
   Moltiplicatore Volume: 0.5 (50% del volume originale)
   Max Slippage: 3 pips
   Take Profit: Automatico da master
   Stop Loss: Automatico da master
   Trailing Stop: Abilitato se configurato su master
   ```

#### AvaFeatures Slave

1. **Aggiungi Account AvaFeatures**:
   ```
   Nome Account: Es. "AvaFeatures Account"
   Piattaforma: AvaFeatures
   Tipo: Slave
   Endpoint API: https://api.avafeatures.com/v1
   Account ID: Il tuo Account ID AvaFeatures
   API Key: La tua API Key AvaFeatures
   ```

2. **Configurazioni Specifiche**:
   ```
   Timeout Connessione: 5000ms
   Retry Attempts: 3
   Moltiplicatore Rischio: 0.8
   ```

## Configurazione Expert Advisor MT5

### Installazione EA

L'Expert Advisor `MT5_EA_Lantea.mq5` deve essere installato sul terminale MetaTrader dell'account master.

**Passi dettagliati**:

1. **Localizza il file EA**:
   - File: `MT5_EA_Lantea.mq5` nella root del progetto

2. **Copia nell'MT5**:
   ```
   MetaTrader 5 → File → Apri Folder Dati
   Naviga: MQL5 → Experts
   Copia MT5_EA_Lantea.mq5 in questa cartella
   ```

3. **Compila l'EA**:
   ```
   Apri MetaEditor (F4)
   Navigator → Experts → MT5_EA_Lantea.mq5
   Premi F7 per compilare
   Verifica: nessun errore di compilazione
   ```

4. **Applica all'account master**:
   ```
   Trascina l'EA sul grafico dell'account master
   Settings → Common:
     ✓ Allow live trading
     ✓ Allow DLL imports
     ✓ Allow import of external experts
   
   Settings → Inputs:
     Server URL: http://localhost:5000/api/mt5/trade
     Update Frequency: 1000 (1 secondo)
     Enable Logging: true
   ```

### Configurazione Parametri EA

```mql5
// Parametri principali
input string ServerURL = "http://localhost:5000/api/mt5/trade";
input int UpdateFrequency = 1000; // milliseconds
input bool EnableLogging = true;
input double MinVolume = 0.01;
input double MaxVolume = 10.0;
input int MaxSlippage = 3;
```

## Configurazioni Sistema

### Configurazioni Globali

Accedi a **Impostazioni → Configurazione Globale**:

```
Mirror Trading: ✓ Abilitato
Auto Reconnect: ✓ Abilitato
Take Profit Globale: ✓ Abilitato
Stop Loss Globale: ✓ Abilitato
Punti Take Profit: 50
Punti Stop Loss: 30
Max Slippage: 3
Trade Timeout: 5000ms
```

### Configurazioni per Account

Per ogni account slave, configura:

```
Moltiplicatore Rischio: 0.5 - 2.0
  0.5 = 50% del volume master
  1.0 = 100% del volume master (default)
  2.0 = 200% del volume master

Max Slippage: 1-5 pips
Take Profit: Eredita da master / Custom
Stop Loss: Eredita da master / Custom
Trailing Stop: Abilitato/Disabilitato
```

## Configurazione Sicurezza

### Autenticazione

**Password Sistema**: `Dennisd-401`

Per maggiore sicurezza in produzione:
```javascript
// Modifica in server/config/auth.js
const SYSTEM_PASSWORD = process.env.SYSTEM_PASSWORD || "Dennisd-401";
```

### API Keys e Credenziali

**Gestione Sicura**:
- Mai hard-code le password nei file
- Utilizza variabili ambiente per credenziali sensibili
- Rotazione periodica delle API keys

```env
# .env file
AVA_API_KEY=your_avafeatures_api_key
MT5_MASTER_PASSWORD=your_master_password
MT5_SLAVE_PASSWORDS=slave1_pass,slave2_pass
```

## Configurazione Network

### Porte e Firewall

**Porte utilizzate**:
- `5000`: Server principale Lantea
- `8222`: Comunicazione MT5 TCP (opzionale)
- `443/80`: HTTPS/HTTP in produzione

**Configurazione Firewall**:
```bash
# Apri porte necessarie
sudo ufw allow 5000
sudo ufw allow 8222
sudo ufw allow 443
sudo ufw allow 80
```

### WebSocket

**Configurazione WebSocket**:
```javascript
// client/src/lib/websocket.ts
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
```

## Test e Verifica Configurazione

### Test Connessioni

1. **Test Database**:
   ```bash
   curl http://localhost:5000/api/health
   # Response: {"status":"healthy","database":"connected"}
   ```

2. **Test Account Master**:
   ```bash
   curl -X POST http://localhost:5000/api/connections/test \
     -H "Content-Type: application/json" \
     -d '{"accountId": 1, "platform": "MetaTrader"}'
   ```

3. **Test WebSocket**:
   ```javascript
   // Console del browser
   const ws = new WebSocket('ws://localhost:5000/ws');
   ws.onopen = () => console.log('WebSocket connesso');
   ```

### Test Replicazione

1. **Avvia Replicazione**:
   ```bash
   curl -X POST http://localhost:5000/api/replication/start
   ```

2. **Verifica Status**:
   ```bash
   curl http://localhost:5000/api/replication/status
   ```

3. **Monitor Trades**:
   ```bash
   curl http://localhost:5000/api/trades
   ```

## Configurazione Avanzata

### Ottimizzazione Performance

**Database Tuning**:
```sql
-- Ottimizzazione PostgreSQL per trading
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

**Connection Pooling**:
```javascript
// server/db.js
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Logging e Monitoring

**Configurazione Log Level**:
```env
LOG_LEVEL=info  # debug, info, warn, error
LOG_FORMAT=json # json, text
```

**Metrics Collection**:
```javascript
// Abilita metrics nel dashboard
const metricsConfig = {
  enabled: true,
  interval: 5000, // 5 secondi
  retention: 86400 // 24 ore
};
```

## Configurazione Multi-Ambiente

### Sviluppo

```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/lantea_dev
LOG_LEVEL=debug
ENABLE_CORS=true
```

### Produzione

```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/lantea_prod
LOG_LEVEL=error
ENABLE_SSL=true
SESSION_SECRET=your-production-secret
```

### Test

```env
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/lantea_test
LOG_LEVEL=warn
DISABLE_AUTH=true
```

## Troubleshooting Configurazione

### Problemi Comuni

**1. Account non si connette**:
```
Verifica:
- Credenziali corrette
- Server MT5 raggiungibile
- Firewall non blocca connessioni
- Password account non scaduta
```

**2. Expert Advisor non comunica**:
```
Controlla:
- EA installato e attivo su grafico
- "Allow live trading" abilitato
- URL server corretto nell'EA
- Lantea in esecuzione su porta corretta
```

**3. Trade non replicati**:
```
Debug:
- Account slave configurati correttamente
- Connessioni attive nel dashboard
- Moltiplicatori rischio validi (>0)
- Simboli supportati su piattaforma slave
```

**4. Database errori**:
```
Risoluzione:
- Verifica DATABASE_URL
- Controlla permessi utente database
- Esegui npm run db:push per aggiornare schema
```

### Log di Debug

**Abilitazione debug completo**:
```bash
DEBUG=lantea:* npm run dev
```

**Percorsi log importanti**:
- Sistema: Console workflow
- WebSocket: Browser DevTools
- Database: PostgreSQL log
- MT5 EA: MetaTrader Expert log

## Best Practices Configurazione

### Sicurezza

1. **Cambia password default** prima della produzione
2. **Utilizza HTTPS** per tutti gli ambienti pubblici
3. **Rotazione API keys** ogni 90 giorni
4. **Backup configurazioni** settimanalmente
5. **Monitor accessi** non autorizzati

### Performance

1. **Pool connessioni database** ottimizzato
2. **Cache risultati** frequenti
3. **Compressione WebSocket** abilitata
4. **Indici database** su colonne frequenti
5. **Cleanup logs** automatico

### Affidabilità

1. **Heartbeat checks** ogni 30 secondi
2. **Auto-reconnection** per disconnessioni
3. **Fallback servers** configurati
4. **Health checks** completi
5. **Alerting** per anomalie

---

**Supporto**: Per assistenza nella configurazione, consultare i file di log o contattare il supporto tecnico con i dettagli specifici della configurazione.