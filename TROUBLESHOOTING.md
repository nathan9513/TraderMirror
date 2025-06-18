# Troubleshooting Guide - Lantea Trading System

## Problemi di Connessione

### Expert Advisor non si connette

**Sintomi**:
- EA installato ma non comunica con Lantea
- Log MT5 mostra errori di connessione
- Dashboard mostra account master disconnesso

**Soluzioni**:

1. **Verifica URL nell'EA**:
   ```mql5
   // In MT5_EA_Lantea.mq5, controlla:
   input string ServerURL = "http://localhost:5000/api/mt5/trade";
   ```

2. **Controlla impostazioni MT5**:
   - AutoTrading abilitato (pulsante verde)
   - "Allow live trading" ✓
   - "Allow DLL imports" ✓
   - "Allow import of external experts" ✓

3. **Verifica firewall**:
   ```bash
   # Windows
   netsh advfirewall firewall add rule name="Lantea" dir=in action=allow protocol=TCP localport=5000
   
   # Test connessione
   telnet localhost 5000
   ```

4. **Controlla log EA**:
   - MT5 → Toolbox → Expert → cerca errori
   - Verifica timestamp delle ultime comunicazioni

### Account MetaTrader non si connette

**Sintomi**:
- Credenziali corrette ma connessione fallisce
- Timeout durante connessione
- Errore "Login failed"

**Diagnosi**:
```bash
# Test connessione server MT5
ping your-broker-server.com

# Verifica porte aperte
nmap -p 443,80,8443 your-broker-server.com
```

**Soluzioni**:

1. **Verifica credenziali**:
   - Server esatto (maiuscole/minuscole importanti)
   - Login numerico corretto
   - Password aggiornata

2. **Controlla server broker**:
   - Server MT5 operativo
   - Manutenzione programmata
   - Cambio password richiesto

3. **Network issues**:
   ```bash
   # Reset connessioni network
   ipconfig /flushdns
   ipconfig /release
   ipconfig /renew
   ```

### AvaFeatures API errori

**Sintomi**:
- "API Key invalid"
- Timeout connessione
- Errore autenticazione

**Soluzioni**:

1. **Verifica API Key**:
   ```bash
   # Test API key
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.avafeatures.com/v1/account
   ```

2. **Controllo rate limiting**:
   - Riduci frequenza richieste
   - Implementa backoff exponential

3. **Endpoint corretto**:
   ```javascript
   // Verifica URL base
   const config = {
     endpoint: "https://api.avafeatures.com/v1",
     timeout: 5000
   };
   ```

## Problemi di Replicazione

### Trade non replicati

**Sintomi**:
- Trade su master ma non su slave
- Latenza eccessiva (>5 secondi)
- Errori "Trade execution failed"

**Diagnosi**:
```bash
# Controlla stato replicazione
curl http://localhost:5000/api/replication/status

# Verifica connessioni
curl http://localhost:5000/api/connections

# Log trade recenti
curl http://localhost:5000/api/trades?limit=10
```

**Soluzioni**:

1. **Verifica account slave**:
   - Saldo sufficiente
   - Trading permesso
   - Simbolo supportato

2. **Controlla moltiplicatori**:
   ```json
   {
     "riskMultiplier": "0.5",  // 50% volume
     "maxSlippage": 3         // max 3 pips
   }
   ```

3. **Verifica simboli**:
   - Simboli identici su master/slave
   - Orari trading aperti
   - Spread accettabile

### Latenza elevata

**Sintomi**:
- Replicazione >1 secondo
- Slippage eccessivo
- Trade parzialmente eseguiti

**Soluzioni**:

1. **Ottimizzazione network**:
   ```bash
   # Test latenza
   ping broker-server.com
   tracert broker-server.com
   ```

2. **Configurazione sistema**:
   ```javascript
   // Riduce polling interval
   const config = {
     pollingInterval: 500,  // 500ms invece di 1000ms
     maxRetries: 2,
     timeout: 3000
   };
   ```

3. **Database optimization**:
   ```sql
   -- Indici per performance
   CREATE INDEX idx_trades_timestamp ON trades(timestamp);
   CREATE INDEX idx_connections_status ON connections(status);
   ```

## Problemi Database

### Errori connessione PostgreSQL

**Sintomi**:
- "Connection refused"
- "Database not found"
- "Authentication failed"

**Diagnosi**:
```bash
# Test connessione diretta
psql $DATABASE_URL -c "SELECT 1;"

# Verifica servizio
systemctl status postgresql
```

**Soluzioni**:

1. **Verifica variabili ambiente**:
   ```bash
   echo $DATABASE_URL
   echo $PGHOST
   echo $PGPORT
   ```

2. **Reset connessioni**:
   ```bash
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   
   # Clear pool connessioni
   npm run db:reset-pool
   ```

3. **Migrazione schema**:
   ```bash
   # Aggiorna schema
   npm run db:push
   
   # Verifica tabelle
   psql $DATABASE_URL -c "\dt"
   ```

### Performance database lente

**Sintomi**:
- Query lente >1 secondo
- Dashboard lento a caricare
- Timeout database

**Soluzioni**:

1. **Analisi performance**:
   ```sql
   -- Query più lente
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   
   -- Indici mancanti
   SELECT schemaname, tablename, attname, n_distinct, correlation 
   FROM pg_stats 
   WHERE schemaname = 'public';
   ```

2. **Ottimizzazioni**:
   ```sql
   -- Vacuum e analyze
   VACUUM ANALYZE trades;
   VACUUM ANALYZE connections;
   
   -- Reindex
   REINDEX DATABASE lantea;
   ```

3. **Configurazione PostgreSQL**:
   ```sql
   -- Memory settings
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET work_mem = '4MB';
   SELECT pg_reload_conf();
   ```

## Problemi WebSocket

### Disconnessioni frequenti

**Sintomi**:
- Dashboard si disconnette ogni pochi minuti
- "WebSocket connection lost"
- Real-time updates intermittenti

**Soluzioni**:

1. **Configurazione keepalive**:
   ```javascript
   // client/src/lib/websocket.ts
   const ws = new WebSocket(wsUrl);
   
   // Heartbeat ogni 30 secondi
   setInterval(() => {
     if (ws.readyState === WebSocket.OPEN) {
       ws.send(JSON.stringify({type: 'ping'}));
     }
   }, 30000);
   ```

2. **Proxy/Load balancer**:
   ```nginx
   # nginx.conf
   location /ws {
     proxy_pass http://backend;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_read_timeout 86400;
   }
   ```

3. **Firewall/NAT**:
   - Configura timeout NAT più lungo
   - Abilita WebSocket nel firewall

### Messaggi duplicati

**Sintomi**:
- Trade signals duplicati
- Notifiche multiple
- Statistiche incorrette

**Soluzioni**:

1. **Deduplicazione client**:
   ```javascript
   const processedMessages = new Set();
   
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     const messageId = data.id || `${data.type}-${data.timestamp}`;
     
     if (processedMessages.has(messageId)) return;
     processedMessages.add(messageId);
     
     // Processa messaggio
   };
   ```

2. **Server-side filtering**:
   ```javascript
   // server/routes.ts
   const sentMessages = new Map();
   
   function broadcastToClients(type, data) {
     const messageId = `${type}-${Date.now()}`;
     if (sentMessages.has(messageId)) return;
     
     sentMessages.set(messageId, true);
     // Broadcast message
   }
   ```

## Problemi Sistema

### High CPU usage

**Sintomi**:
- CPU >80% costante
- Sistema lento
- Timeout applicazione

**Diagnosi**:
```bash
# Monitor processi
top -p $(pgrep node)

# Memory usage
free -h

# IO wait
iostat 1 5
```

**Soluzioni**:

1. **Profiling applicazione**:
   ```bash
   # Node.js profiling
   node --prof server/index.js
   
   # Analisi profile
   node --prof-process isolate-*.log
   ```

2. **Ottimizzazioni**:
   ```javascript
   // Riduce polling frequency
   const config = {
     tradeCheckInterval: 2000,  // 2 secondi invece di 1
     connectionCheckInterval: 10000,  // 10 secondi
     statsUpdateInterval: 5000
   };
   ```

3. **Garbage collection**:
   ```bash
   # Aumenta heap size
   node --max-old-space-size=4096 server/index.js
   ```

### Memory leaks

**Sintomi**:
- Memory usage crescente
- Crash dopo ore di utilizzo
- "Out of memory" errors

**Diagnosi**:
```bash
# Memory monitoring
node --inspect server/index.js

# Heap dump
kill -USR2 $(pgrep node)
```

**Soluzioni**:

1. **Connection cleanup**:
   ```javascript
   // Cleanup disconnected clients
   setInterval(() => {
     clients.forEach((client, id) => {
       if (client.readyState !== WebSocket.OPEN) {
         clients.delete(id);
       }
     });
   }, 60000);
   ```

2. **Cache cleanup**:
   ```javascript
   // Periodic cache cleanup
   setInterval(() => {
     // Clear old trade data
     if (tradeCache.size > 1000) {
       const oldEntries = Array.from(tradeCache.entries())
         .slice(0, 500);
       oldEntries.forEach(([key]) => tradeCache.delete(key));
     }
   }, 300000);
   ```

## Error Codes Reference

### Sistema Errors

| Code | Descrizione | Soluzione |
|------|-------------|-----------|
| `CONN_001` | Database connection failed | Verifica DATABASE_URL |
| `CONN_002` | WebSocket initialization failed | Controlla porta 5000 |
| `CONN_003` | MT5 Expert Advisor timeout | Riavvia EA o MT5 |
| `CONN_004` | AvaFeatures API unreachable | Verifica connessione internet |

### Trading Errors

| Code | Descrizione | Soluzione |
|------|-------------|-----------|
| `TRADE_001` | Insufficient balance | Aumenta saldo account |
| `TRADE_002` | Invalid symbol | Verifica simbolo supportato |
| `TRADE_003` | Market closed | Attendi apertura mercato |
| `TRADE_004` | Slippage exceeded | Aumenta maxSlippage |
| `TRADE_005` | Volume too small/large | Controlla limiti volume broker |

### Account Errors

| Code | Descrizione | Soluzione |
|------|-------------|-----------|
| `ACC_001` | Invalid credentials | Verifica login/password |
| `ACC_002` | Account suspended | Contatta broker |
| `ACC_003` | Trading not allowed | Abilita trading su account |
| `ACC_004` | Connection timeout | Controlla network/firewall |

## Log Analysis

### Tipi di Log

1. **Application logs**:
   ```bash
   # Real-time logs
   tail -f /var/log/lantea/app.log
   
   # Error logs only
   grep "ERROR" /var/log/lantea/app.log
   ```

2. **Database logs**:
   ```bash
   # PostgreSQL logs
   tail -f /var/log/postgresql/postgresql.log
   
   # Slow queries
   grep "duration:" /var/log/postgresql/postgresql.log
   ```

3. **WebSocket logs**:
   ```bash
   # Connection events
   grep "WebSocket" /var/log/lantea/app.log
   
   # Disconnection events
   grep "disconnected" /var/log/lantea/app.log
   ```

### Log Pattern Analysis

**Connection issues**:
```bash
# Pattern di disconnessione
grep -A 5 -B 5 "connection failed" /var/log/lantea/app.log

# Retry patterns
grep "retry attempt" /var/log/lantea/app.log | wc -l
```

**Performance issues**:
```bash
# Latenza elevata
grep "latency.*[5-9][0-9][0-9]" /var/log/lantea/app.log

# Query lente
grep "slow query" /var/log/lantea/app.log
```

## Monitoring Scripts

### Health Check Script

```bash
#!/bin/bash
# health_check.sh

LOG_FILE="/var/log/lantea/health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check application
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ "$APP_STATUS" != "200" ]; then
    echo "[$TIMESTAMP] ERROR: Application health check failed" >> $LOG_FILE
fi

# Check database
DB_STATUS=$(psql $DATABASE_URL -c "SELECT 1;" 2>/dev/null | grep -c "1 row")
if [ "$DB_STATUS" != "1" ]; then
    echo "[$TIMESTAMP] ERROR: Database health check failed" >> $LOG_FILE
fi

# Check WebSocket
WS_STATUS=$(node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000/ws');
ws.on('open', () => { console.log('OK'); process.exit(0); });
ws.on('error', () => { console.log('ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
")

if [ "$WS_STATUS" != "OK" ]; then
    echo "[$TIMESTAMP] ERROR: WebSocket health check failed" >> $LOG_FILE
fi
```

### Performance Monitor

```bash
#!/bin/bash
# performance_monitor.sh

# CPU usage
CPU_USAGE=$(top -bn1 | grep "node" | awk '{print $9}')
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "HIGH CPU: $CPU_USAGE%"
fi

# Memory usage
MEM_USAGE=$(ps -p $(pgrep node) -o %mem --no-headers)
if (( $(echo "$MEM_USAGE > 70" | bc -l) )); then
    echo "HIGH MEMORY: $MEM_USAGE%"
fi

# Active connections
CONN_COUNT=$(ss -an | grep ":5000" | wc -l)
echo "Active connections: $CONN_COUNT"

# Trade latency
LATENCY=$(curl -s http://localhost:5000/api/stats/today | jq -r '.avgLatency')
if (( $(echo "$LATENCY > 200" | bc -l) )); then
    echo "HIGH LATENCY: ${LATENCY}ms"
fi
```

## Recovery Procedures

### Automatic Recovery

Il sistema include procedure di recovery automatico:

1. **Connection recovery**: Riconnessione automatica ogni 30 secondi
2. **Database recovery**: Pool connection reset ogni 5 minuti
3. **WebSocket recovery**: Client reconnection con backoff

### Manual Recovery

**Sistema completo reset**:
```bash
# 1. Stop services
npm run stop

# 2. Clear cache/temp files
rm -rf /tmp/lantea_*
redis-cli FLUSHALL  # se redis enabled

# 3. Database maintenance
psql $DATABASE_URL -c "VACUUM FULL;"

# 4. Restart services
npm run start
```

**Account reconnection**:
```bash
# Force reconnect tutti gli account
curl -X POST http://localhost:5000/api/connections/reconnect-all

# Reconnect account specifico
curl -X POST http://localhost:5000/api/connections/1/reconnect
```

---

**Supporto**: Per problemi non risolti, consultare i log completi e contattare il supporto tecnico con i dettagli specifici dell'errore.