# Lantea - Sistema di Replicazione Trade Avanzato

**Versione**: _BlueIce_copper_25H2_lab1 (Pre-Alpha)  
**Autenticazione**: Password protetta 

## Panoramica

Lantea è una piattaforma di sincronizzazione trading robusta progettata per replicare seamlessly i trade tra più account MetaTrader e AvaFeatures con capacità avanzate di replicazione trade in tempo reale.

### Architettura Master-Slave

Il sistema implementa un'architettura master-slave dove:
- **Account Master**: Terminale MetaTrader Desktop che genera i segnali di trading
- **Account Slave**: Account multipli su piattaforme AvaFeatures e MetaTrader che replicano automaticamente i trade

## Caratteristiche Principali

### 🔄 Replicazione Trade in Tempo Reale
- Monitoraggio continuo degli account master ogni 1 secondo
- Latenza di replicazione: 50-150ms
- Supporto per Take Profit e Stop Loss automatici
- Gestione del rischio con moltiplicatori personalizzabili

### 🌐 Supporto Multi-Piattaforma
- **MetaTrader 5**: Connessione diretta via Expert Advisor
- **AvaFeatures**: Integrazione API nativa
- WebSocket per comunicazione real-time
- Interfaccia web responsive

### 🛡️ Gestione Avanzata del Rischio
- Moltiplicatori di volume personalizzabili per account
- Controllo slippage massimo
- Trailing Stop automatico
- Riconnessione automatica in caso di disconnessione

### 📊 Monitoraggio e Analytics
- Dashboard real-time con statistiche complete
- Tracking delle performance per account
- Log dettagliati delle operazioni
- Notifiche di stato delle connessioni

## Installazione e Configurazione

### Prerequisiti
- Node.js 20.x o superiore
- MetaTrader 5 Terminal
- Account AvaFeatures (opzionale)
- PostgreSQL Database

### 1. Installazione Lantea

```bash
# Clone del repository
git clone [repository-url]
cd lantea

# Installazione dipendenze
npm install

# Avvio del sistema
npm run dev
```

### 2. Configurazione Database

Il sistema utilizza PostgreSQL per la persistenza dei dati:

```bash
# Configurazione schema database
npm run db:push
```

Le variabili di ambiente necessarie:
- `DATABASE_URL`: URL di connessione PostgreSQL
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### 3. Installazione Expert Advisor MT5

L'Expert Advisor `MT5_EA_Lantea.mq5` stabilisce la connessione tra il terminale MetaTrader e Lantea.

**Passi di installazione:**

1. **Localizzazione file**: Trova `MT5_EA_Lantea.mq5` nella cartella root del progetto

2. **Copia nell'MT5**:
   - Apri MetaTrader 5
   - File → Apri Folder Dati
   - Naviga: `MQL5` → `Experts`
   - Copia `MT5_EA_Lantea.mq5` in questa cartella

3. **Compilazione**:
   - Apri MetaEditor (F4)
   - Navigator → Experts → `MT5_EA_Lantea.mq5`
   - Compila con F7

4. **Attivazione**:
   - Trascina l'EA sul grafico dell'account master
   - Abilita "Allow live trading" e "Allow DLL imports"
   - Conferma con OK

## Configurazione Account

### Account Master (MetaTrader)

Nel dashboard Lantea:

1. **Aggiungi Account Master**:
   ```
   Nome: [Nome descrittivo]
   Piattaforma: MetaTrader
   Server: [Server MT5, es. MetaQuotes-Demo]
   Login: [Numero account MT5]
   Password: [Password account]
   Tipo: Master
   ```

2. **Configurazione Avanzata**:
   - Abilita monitoraggio real-time
   - Configura simboli da monitorare
   - Imposta parametri di sicurezza

### Account Slave

1. **MetaTrader Slave**:
   ```
   Nome: [Nome descrittivo]
   Piattaforma: MetaTrader
   Server: [Server MT5]
   Login: [Account slave]
   Password: [Password]
   Moltiplicatore Rischio: [0.1 - 5.0]
   ```

2. **AvaFeatures Slave**:
   ```
   Nome: [Nome descrittivo]
   Piattaforma: AvaFeatures
   Endpoint: [URL API AvaFeatures]
   Account ID: [ID account]
   API Key: [Chiave API]
   ```

## Utilizzo del Sistema

### 1. Avvio della Replicazione

```bash
# Via API
curl -X POST http://localhost:5000/api/replication/start

# Via Dashboard
Accedi al dashboard → Pulsante "Avvia Replicazione"
```

### 2. Monitoraggio Real-Time

Il dashboard fornisce:
- **Stato Connessioni**: Verde = Connesso, Rosso = Disconnesso
- **Trade Attivi**: Lista dei trade in corso di replicazione
- **Statistiche**: Performance, latenza media, tasso di successo
- **Log Sistema**: Cronologia dettagliata delle operazioni

### 3. Gestione Configurazioni

**Configurazioni Globali**:
- Abilitazione/Disabilitazione mirror trading
- Riconnessione automatica
- Parametri Take Profit/Stop Loss globali

**Configurazioni per Account**:
- Moltiplicatore di rischio individuale
- Slippage massimo consentito
- Simboli da replicare

## API Reference

### Endpoints Principali

#### Account Management
```http
GET /api/accounts - Lista tutti gli account
POST /api/accounts - Crea nuovo account
PUT /api/accounts/:id - Aggiorna account
DELETE /api/accounts/:id - Elimina account
```

#### Trade Operations
```http
GET /api/trades - Lista trade recenti
POST /api/trades - Esegui trade manuale
GET /api/trades/stats - Statistiche trading
```

#### System Control
```http
POST /api/replication/start - Avvia replicazione
POST /api/replication/stop - Ferma replicazione
GET /api/replication/status - Stato sistema
```

#### Connections
```http
GET /api/connections - Stato connessioni
POST /api/connections/test - Test connessione
PUT /api/connections/:id - Aggiorna connessione
```

### WebSocket Events

Il sistema utilizza WebSocket per aggiornamenti real-time:

```javascript
// Connessione WebSocket
const ws = new WebSocket('ws://localhost:5000/ws');

// Eventi disponibili
ws.on('trade_signal', data => {
  // Nuovo segnale di trade dall'account master
});

ws.on('trade_executed', data => {
  // Trade eseguito su account slave
});

ws.on('connection_status', data => {
  // Cambio stato connessione
});

ws.on('system_stats', data => {
  // Aggiornamento statistiche sistema
});
```

## Schema Database

### Tabelle Principali

**accounts**: Configurazione account master e slave
```sql
- id: integer PRIMARY KEY
- name: varchar(255)
- type: enum('master', 'slave')
- platform: enum('MetaTrader', 'AvaFeatures')
- server: varchar(255)
- login: varchar(255)
- password: varchar(255) ENCRYPTED
- status: enum('active', 'inactive')
- risk_multiplier: decimal(3,2)
```

**trades**: Cronologia trade replicati
```sql
- id: integer PRIMARY KEY
- account_id: integer REFERENCES accounts(id)
- symbol: varchar(20)
- type: enum('BUY', 'SELL')
- volume: decimal(10,2)
- price: decimal(15,5)
- take_profit: decimal(15,5)
- stop_loss: decimal(15,5)
- status: enum('pending', 'executed', 'failed')
- latency: integer (ms)
- timestamp: timestamp
```

**connections**: Stato connessioni real-time
```sql
- id: integer PRIMARY KEY
- account_id: integer REFERENCES accounts(id)
- platform: varchar(50)
- status: enum('connected', 'disconnected', 'error')
- last_ping: varchar(50)
- last_update: timestamp
```

## Sicurezza e Best Practices

### Autenticazione
- Password sistema: `Dennisd-401`
- Sessioni crittografate
- API key per servizi esterni

### Gestione Rischi
- Validazione parametri trade
- Limiti di volume massimo
- Controllo slippage
- Stop loss obbligatori

### Monitoraggio
- Log completi di tutte le operazioni
- Alerting per disconnessioni
- Backup automatico configurazioni

## Troubleshooting

### Problemi Comuni

**1. Expert Advisor non si connette**
```
Verifica:
- EA installato correttamente in MT5
- "Allow live trading" abilitato
- Lantea in esecuzione su localhost:5000
- Firewall non blocca connessioni
```

**2. Trade non replicati**
```
Controlli:
- Account slave configurati correttamente
- Connessioni attive nel dashboard
- Moltiplicatori di rischio validi
- Simboli supportati dalla piattaforma slave
```

**3. Latenza elevata**
```
Ottimizzazioni:
- Verifica connessione internet
- Riduci frequenza polling se necessario
- Controlla carico sistema
- Ottimizza configurazione database
```

### Log e Debug

**Posizioni dei log**:
- Sistema: Console del workflow "Start application"
- WebSocket: Browser Developer Tools
- Database: Query log PostgreSQL

**Livelli di debug**:
```bash
# Debug completo
NODE_ENV=development npm run dev

# Solo errori
NODE_ENV=production npm start
```

## Supporto e Manutenzione

### Aggiornamenti Sistema
Il sistema supporta aggiornamenti hot-reload durante lo sviluppo. Per ambienti di produzione, seguire la procedura di deployment standard.

### Backup e Recovery
- Backup automatico configurazioni ogni 24h
- Export/Import configurazioni account
- Ripristino stato sistema da backup

### Performance Monitoring
- Metriche real-time nel dashboard
- Alerting per anomalie
- Ottimizzazione automatica parametri

---

**Nota Pre-Alpha**: Questa versione è in fase di sviluppo avanzato. Alcune funzionalità potrebbero essere incomplete o subire modifiche nelle versioni future.

Per supporto tecnico o segnalazione bug, consultare la documentazione del progetto o contattare il team di sviluppo.
