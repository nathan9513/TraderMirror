# Deployment Guide - Lantea Trading System

## Configurazione Dominio e Hosting

### Replit Deployment

Lantea è progettato per essere deployato su Replit con supporto completo per:
- **Dominio personalizzato**: Configurabile tramite Replit Custom Domains
- **Database PostgreSQL**: Nativo su Replit
- **WebSocket support**: Real-time per trading signals
- **SSL/TLS automatico**: HTTPS enabled by default

### Setup Dominio

**1. Configurazione Replit**
```bash
# Il deployment automatico gestisce:
- Build dell'applicazione
- Configurazione database
- Setup SSL certificate
- Health checks
```

**2. Dominio Personalizzato**
- Accedi alle impostazioni Replit Deployment
- Configura il tuo dominio (es: lantea-trading.com)
- Il sistema genera automaticamente certificati SSL

**3. Variabili Ambiente Produzione**
```env
DATABASE_URL=postgresql://[replit-generated]
NODE_ENV=production
PORT=443
DOMAIN=your-domain.com
```

## Configurazione DNS

Per un dominio personalizzato, configura questi record DNS:

```dns
# Record A
@ IN A [Replit-IP-Address]
www IN CNAME [your-repl-name].replit.app

# Record CNAME per subdomain
api IN CNAME [your-repl-name].replit.app
ws IN CNAME [your-repl-name].replit.app
```

## Build e Deploy Process

### Automatic Deployment

Il sistema include configurazione automatica per Replit Deployments:

```json
{
  "name": "lantea-trading",
  "build": "npm run build",
  "start": "npm run start",
  "healthcheck": "/api/health"
}
```

### Manual Deployment Steps

Se necessario, puoi deployare manualmente:

```bash
# 1. Build produzione
npm run build

# 2. Setup database
npm run db:push

# 3. Start produzione
npm run start
```

## Configurazione SSL e Sicurezza

### HTTPS Configuration

Replit Deployments gestisce automaticamente:
- Certificati SSL/TLS
- Reindirizzamento HTTP→HTTPS
- Security headers
- CORS policy

### Configurazione Sicurezza Avanzata

```javascript
// server/security.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Database Migration

### Production Database Setup

```sql
-- Creazione schema produzione
CREATE DATABASE lantea_production;

-- Setup utente dedicato
CREATE USER lantea_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lantea_production TO lantea_user;

-- Migrazione schema
npm run db:push
```

### Backup Strategy

```bash
# Backup automatico giornaliero
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore da backup
psql $DATABASE_URL < backup_20250617.sql
```

## Performance Optimization

### Production Configuration

```javascript
// server/config/production.js
module.exports = {
  port: process.env.PORT || 443,
  database: {
    pool: {
      min: 2,
      max: 10,
      idle: 10000
    }
  },
  redis: {
    enabled: true,
    url: process.env.REDIS_URL
  },
  logging: {
    level: 'error',
    format: 'json'
  }
};
```

### Monitoring Setup

```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: 'connected',
    uptime: process.uptime()
  });
});
```

## Trading System Configuration

### MetaTrader Integration

Per l'ambiente di produzione, configura:

```mql5
// MT5_EA_Lantea.mq5 - Production settings
input string ServerURL = "https://your-domain.com/api/mt5/trade";
input bool EnableSSL = true;
input int ConnectionTimeout = 5000;
input string APIKey = "your-production-api-key";
```

### AvaFeatures API

```javascript
// Configurazione produzione AvaFeatures
const avaConfig = {
  endpoint: "https://api.avafeatures.com/v1",
  timeout: 3000,
  retries: 3,
  apiKey: process.env.AVA_API_KEY
};
```

## WebSocket Configuration

### Production WebSocket

```javascript
// WebSocket sicuro per produzione
const wss = new WebSocketServer({
  server: httpsServer,
  path: '/ws',
  clientTracking: true,
  maxPayload: 1024 * 1024,
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10
  }
});
```

### Load Balancing

Se necessario, configura load balancing:

```nginx
upstream lantea_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://lantea_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

### Production Environment

```env
# Core Application
NODE_ENV=production
PORT=443
DOMAIN=your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/lantea_prod
PGSSL=true

# Security
SESSION_SECRET=your-super-secure-session-secret
JWT_SECRET=your-jwt-secret-key

# Trading APIs
AVA_API_KEY=your-avafeatures-api-key
AVA_ENDPOINT=https://api.avafeatures.com/v1

# Monitoring
LOG_LEVEL=error
ENABLE_METRICS=true
```

## Monitoring e Logging

### Application Monitoring

```javascript
// server/monitoring.js
const monitoring = {
  trades: {
    total: 0,
    successful: 0,
    failed: 0,
    avgLatency: 0
  },
  connections: {
    active: 0,
    total: 0,
    errors: 0
  }
};

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json(monitoring);
});
```

### Error Tracking

```javascript
// Error logging
app.use((err, req, res, next) => {
  console.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});
```

## Backup e Recovery

### Automated Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="lantea_backup_$DATE.sql"

# Database backup
pg_dump $DATABASE_URL > $DB_BACKUP

# Configuration backup
tar -czf "config_backup_$DATE.tar.gz" server/config/

# Upload to cloud storage
aws s3 cp $DB_BACKUP s3://lantea-backups/
aws s3 cp "config_backup_$DATE.tar.gz" s3://lantea-backups/
```

### Recovery Procedure

```bash
# 1. Restore database
psql $DATABASE_URL < lantea_backup_YYYYMMDD_HHMMSS.sql

# 2. Restore configuration
tar -xzf config_backup_YYYYMMDD_HHMMSS.tar.gz

# 3. Restart services
npm run start
```

## Security Checklist

### Pre-Deployment Security

- [ ] Password sistema aggiornata da default
- [ ] Certificati SSL configurati
- [ ] Database credentials sicure
- [ ] API keys environment variables
- [ ] Rate limiting abilitato
- [ ] CORS policy configurata
- [ ] Input validation completa
- [ ] SQL injection protection
- [ ] XSS protection headers

### Post-Deployment Verification

- [ ] Health check endpoint risponde
- [ ] Database connessione OK
- [ ] WebSocket funzionante
- [ ] Expert Advisor connesso
- [ ] Trading signals funzionanti
- [ ] Backup automatico configurato
- [ ] Monitoring alerts attivi

## Troubleshooting Deployment

### Common Issues

**1. Database Connection Failed**
```bash
# Verifica variabili ambiente
echo $DATABASE_URL

# Test connessione
psql $DATABASE_URL -c "SELECT 1;"
```

**2. WebSocket Connection Issues**
```javascript
// Verifica configurazione WebSocket
const wsUrl = `wss://${window.location.host}/ws`;
console.log('Connecting to:', wsUrl);
```

**3. SSL Certificate Problems**
```bash
# Verifica certificato
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Performance Issues

**Monitor Resource Usage**:
```bash
# CPU e Memory
top -p $(pgrep node)

# Database performance
SELECT * FROM pg_stat_activity WHERE datname = 'lantea_production';

# Network latency
ping your-domain.com
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly tasks
npm audit fix
npm update
npm run db:backup

# Monthly tasks
VACUUM ANALYZE trades;
VACUUM ANALYZE connections;
REINDEX DATABASE lantea_production;
```

### Update Procedure

```bash
# 1. Backup current state
npm run backup

# 2. Deploy new version
git pull origin main
npm install
npm run build

# 3. Update database if needed
npm run db:push

# 4. Restart application
npm run restart

# 5. Verify deployment
curl https://your-domain.com/api/health
```

---

**Note**: Questo deployment guide è specifico per Replit Deployments. Per altre piattaforme, adattare di conseguenza le configurazioni specifiche.