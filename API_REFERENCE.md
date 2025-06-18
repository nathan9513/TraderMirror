# API Reference - Lantea Trading System

## Autenticazione

Tutte le richieste API richiedono autenticazione con password sistema:
- **Password**: `Dennisd-401`
- **Metodo**: Session-based authentication
- **Headers**: `Content-Type: application/json`

## Base URL

- **Sviluppo**: `http://localhost:5000/api`
- **Produzione**: `https://your-domain.com/api`

## Endpoints API

### Account Management

#### GET /api/accounts
Recupera lista di tutti gli account configurati.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Master Account",
    "type": "master",
    "platform": "MetaTrader",
    "server": "MetaQuotes-Demo",
    "login": "5037267554",
    "status": "active",
    "riskMultiplier": "1.0",
    "createdAt": "2025-06-17T20:00:00Z"
  }
]
```

#### POST /api/accounts
Crea nuovo account trading.

**Request Body**:
```json
{
  "name": "New Slave Account",
  "type": "slave",
  "platform": "MetaTrader",
  "server": "MetaQuotes-Demo",
  "login": "10006716914",
  "password": "account_password",
  "riskMultiplier": "0.5"
}
```

**Response**:
```json
{
  "id": 2,
  "name": "New Slave Account",
  "type": "slave",
  "platform": "MetaTrader",
  "server": "MetaQuotes-Demo",
  "login": "10006716914",
  "status": "active",
  "riskMultiplier": "0.5",
  "createdAt": "2025-06-17T21:00:00Z"
}
```

#### PUT /api/accounts/:id
Aggiorna configurazione account esistente.

**Request Body**:
```json
{
  "name": "Updated Account Name",
  "riskMultiplier": "0.8",
  "status": "active"
}
```

#### DELETE /api/accounts/:id
Elimina account specificato.

**Response**:
```json
{
  "success": true,
  "message": "Account eliminato con successo"
}
```

### Trade Operations

#### GET /api/trades
Recupera cronologia trade recenti.

**Query Parameters**:
- `limit`: Numero massimo di trade (default: 50)
- `offset`: Offset per paginazione (default: 0)
- `date`: Filtra per data specifica (YYYY-MM-DD)
- `accountId`: Filtra per account specifico

**Response**:
```json
[
  {
    "id": 1,
    "accountId": 1,
    "symbol": "EURUSD",
    "type": "BUY",
    "volume": "1.0",
    "price": "1.08500",
    "takeProfit": "1.08700",
    "stopLoss": "1.08200",
    "status": "executed",
    "latency": 125,
    "sourcePlatform": "MetaTrader",
    "targetPlatform": "MetaTrader",
    "timestamp": "2025-06-17T21:15:30Z"
  }
]
```

#### POST /api/trades
Esegue trade manuale su account specificato.

**Request Body**:
```json
{
  "accountId": 2,
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": "0.5",
  "price": "1.08500",
  "takeProfit": "1.08700",
  "stopLoss": "1.08200"
}
```

#### GET /api/trades/stats
Recupera statistiche trading aggregate.

**Query Parameters**:
- `period`: Periodo statistiche (today, week, month)
- `accountId`: Account specifico (opzionale)

**Response**:
```json
{
  "totalTrades": 145,
  "successfulTrades": 132,
  "failedTrades": 13,
  "successRate": 91.03,
  "avgLatency": 127.5,
  "totalVolume": "245.50",
  "profit": "+1,247.85",
  "period": "today"
}
```

### Connection Management

#### GET /api/connections
Recupera stato di tutte le connessioni.

**Response**:
```json
[
  {
    "id": 1,
    "accountId": 1,
    "platform": "MetaTrader",
    "status": "connected",
    "server": "MetaQuotes-Demo",
    "account": "5037267554",
    "lastPing": "2025-06-17T21:20:00Z",
    "lastUpdate": "2025-06-17T21:20:05Z"
  }
]
```

#### POST /api/connections/test
Testa connessione per account specificato.

**Request Body**:
```json
{
  "accountId": 1,
  "platform": "MetaTrader"
}
```

**Response**:
```json
{
  "success": true,
  "latency": 87,
  "status": "connected",
  "message": "Connessione stabilita con successo"
}
```

#### PUT /api/connections/:id
Aggiorna stato connessione.

**Request Body**:
```json
{
  "status": "reconnecting",
  "lastPing": "2025-06-17T21:25:00Z"
}
```

### System Control

#### POST /api/replication/start
Avvia il sistema di replicazione trade.

**Response**:
```json
{
  "success": true,
  "message": "Trade replication started",
  "activeAccounts": {
    "master": 1,
    "slaves": 2
  },
  "timestamp": "2025-06-17T21:30:00Z"
}
```

#### POST /api/replication/stop
Ferma il sistema di replicazione trade.

**Response**:
```json
{
  "success": true,
  "message": "Trade replication stopped",
  "timestamp": "2025-06-17T21:35:00Z"
}
```

#### GET /api/replication/status
Recupera stato corrente del sistema di replicazione.

**Response**:
```json
{
  "isActive": true,
  "uptime": "02:15:30",
  "activeConnections": 3,
  "lastTradeReplicated": "2025-06-17T21:20:15Z",
  "totalTradesReplicated": 47,
  "avgReplicationLatency": 95.5,
  "errors": []
}
```

### Configuration

#### GET /api/configuration
Recupera configurazione globale del sistema.

**Response**:
```json
{
  "id": 1,
  "isMirrorActive": true,
  "isAutoReconnectEnabled": true,
  "enableTakeProfit": true,
  "takeProfitPoints": 50,
  "enableStopLoss": true,
  "stopLossPoints": 30,
  "enableTrailingStop": false,
  "trailingStopPoints": 20,
  "maxSlippage": 3,
  "updatedAt": "2025-06-17T20:00:00Z"
}
```

#### PUT /api/configuration
Aggiorna configurazione globale.

**Request Body**:
```json
{
  "isMirrorActive": true,
  "takeProfitPoints": 60,
  "stopLossPoints": 25,
  "maxSlippage": 2
}
```

### Statistics

#### GET /api/stats/today
Recupera statistiche del giorno corrente.

**Response**:
```json
{
  "id": 1,
  "date": "2025-06-17",
  "tradesCount": 25,
  "successfulTrades": 23,
  "failedTrades": 2,
  "avgLatency": 127.5,
  "totalVolume": "45.50",
  "totalProfit": "+587.25"
}
```

#### GET /api/stats/:date
Recupera statistiche per data specifica.

**Parameters**:
- `date`: Data in formato YYYY-MM-DD

### Health Check

#### GET /api/health
Endpoint per verificare lo stato del sistema.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-17T21:40:00Z",
  "version": "_BlueIce_copper_25H2_lab1",
  "database": "connected",
  "uptime": "03:25:45",
  "activeConnections": 3,
  "memoryUsage": "245.7 MB"
}
```

### MetaTrader Integration

#### POST /api/mt5/trade
Endpoint per ricevere trade dall'Expert Advisor MT5.

**Request Body**:
```json
{
  "account": "5037267554",
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": 1.0,
  "price": 1.08500,
  "timestamp": "2025-06-17T21:45:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "tradeId": 123,
  "replicatedTo": ["account_2", "account_3"],
  "latency": 95
}
```

## WebSocket API

### Connessione WebSocket

**URL**: `ws://localhost:5000/ws` (sviluppo) o `wss://your-domain.com/ws` (produzione)

### Eventi WebSocket

#### trade_signal
Nuovo segnale di trade dall'account master.

```json
{
  "type": "trade_signal",
  "data": {
    "masterAccount": "5037267554",
    "symbol": "EURUSD",
    "type": "BUY",
    "volume": 1.0,
    "price": 1.08500,
    "timestamp": "2025-06-17T21:50:00Z"
  }
}
```

#### trade_executed
Trade eseguito su account slave.

```json
{
  "type": "trade_executed",
  "data": {
    "slaveAccount": "10006716914",
    "tradeId": 124,
    "status": "executed",
    "latency": 87,
    "timestamp": "2025-06-17T21:50:00Z"
  }
}
```

#### connection_status
Cambio stato connessione.

```json
{
  "type": "connection_status",
  "data": {
    "accountId": 1,
    "platform": "MetaTrader",
    "status": "connected",
    "timestamp": "2025-06-17T21:51:00Z"
  }
}
```

#### system_stats
Aggiornamento statistiche sistema in tempo reale.

```json
{
  "type": "system_stats",
  "data": {
    "activeTrades": 5,
    "totalVolume": "47.50",
    "avgLatency": 89.3,
    "successRate": 94.2,
    "timestamp": "2025-06-17T21:52:00Z"
  }
}
```

## Codici di Errore

### HTTP Status Codes

- `200`: Operazione completata con successo
- `201`: Risorsa creata con successo
- `400`: Richiesta malformata o parametri non validi
- `401`: Autenticazione richiesta o non valida
- `403`: Accesso negato
- `404`: Risorsa non trovata
- `409`: Conflitto (es. account già esistente)
- `500`: Errore interno del server
- `503`: Servizio temporaneamente non disponibile

### Errori Applicativi

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account con ID specificato non trovato",
    "details": "Account ID: 999 non esiste nel sistema",
    "timestamp": "2025-06-17T21:55:00Z"
  }
}
```

#### Codici Errore Comuni

- `INVALID_CREDENTIALS`: Credenziali account non valide
- `CONNECTION_FAILED`: Impossibile connettersi alla piattaforma
- `TRADE_EXECUTION_FAILED`: Esecuzione trade fallita
- `INSUFFICIENT_BALANCE`: Saldo insufficiente per trade
- `INVALID_SYMBOL`: Simbolo non supportato
- `MAX_SLIPPAGE_EXCEEDED`: Slippage superiore al limite
- `ACCOUNT_NOT_FOUND`: Account non trovato
- `DUPLICATE_ACCOUNT`: Account già esistente
- `REPLICATION_INACTIVE`: Sistema replicazione non attivo

## Rate Limiting

Il sistema implementa rate limiting per prevenire abusi:

- **API Calls**: 100 richieste per minuto per IP
- **WebSocket Messages**: 50 messaggi per minuto per connessione
- **Trade Execution**: 10 trade per minuto per account

## Autenticazione API Key (Opzionale)

Per integrazioni avanzate, è possibile utilizzare API Key:

**Header**:
```
Authorization: Bearer your-api-key
```

**Generazione API Key**:
```bash
curl -X POST http://localhost:5000/api/auth/generate-key \
  -H "Content-Type: application/json" \
  -d '{"name": "Integration Key", "permissions": ["read", "write"]}'
```

## SDK e Client Libraries

### JavaScript/Node.js

```javascript
const LanteaClient = require('lantea-sdk');

const client = new LanteaClient({
  baseUrl: 'http://localhost:5000/api',
  password: 'Dennisd-401'
});

// Recupera account
const accounts = await client.accounts.list();

// Crea nuovo trade
const trade = await client.trades.create({
  accountId: 1,
  symbol: 'EURUSD',
  type: 'BUY',
  volume: '0.5'
});
```

### Python

```python
from lantea_client import LanteaClient

client = LanteaClient(
    base_url='http://localhost:5000/api',
    password='Dennisd-401'
)

# Lista account
accounts = client.accounts.list()

# Statistiche
stats = client.stats.today()
```

## Esempi di Integrazione

### Monitoring Script

```bash
#!/bin/bash
# monitor_lantea.sh

# Check system health
HEALTH=$(curl -s http://localhost:5000/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
    echo "ALERT: Lantea system is not healthy"
    # Send notification
fi

# Check replication status
REPLICATION=$(curl -s http://localhost:5000/api/replication/status)
ACTIVE=$(echo $REPLICATION | jq -r '.isActive')

if [ "$ACTIVE" != "true" ]; then
    echo "ALERT: Trade replication is not active"
fi
```

### WebSocket Client

```javascript
// websocket_client.js
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('Connected to Lantea WebSocket');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch(message.type) {
    case 'trade_signal':
      console.log('New trade signal:', message.data);
      break;
    case 'trade_executed':
      console.log('Trade executed:', message.data);
      break;
    case 'connection_status':
      console.log('Connection status:', message.data);
      break;
  }
});
```

---

**Note**: Questa API reference è per la versione Pre-Alpha `_BlueIce_copper_25H2_lab1`. Alcune funzionalità potrebbero cambiare nelle versioni future.