# @medguard360/shared

Shared TypeScript library imported by every MedGuard360 Node.js microservice.
**This is the foundation** — get it right and the 20 services stay consistent.

## What's in here

| Module | Purpose |
|--------|---------|
| `logger` | Winston JSON logger → ELK Stack |
| `config` | Loads from `/opt/credential-vault/<service>.json` (prod) or env vars (dev) |
| `errors` | `AppError` hierarchy → mapped to HTTP status codes |
| `types` | `UserRole`, `AuthClaims`, `DomainEvent`, Express type augmentation |
| `metrics` | Prometheus counters/histograms (HTTP, Kafka, DB, PHI access) |
| `db/pool` | PG pool + `withRlsContext()` for HIPAA row-level security |
| `kafka/client` | `emitEvent()` producer + `consumeEvents()` consumer |
| `auth/jwt` | `issueTokens()` / `verifyAccessToken()` / `verifyRefreshToken()` |
| `auth/middleware` | `requireAuth`, `requireRole`, `requireBiometric`, error handler |
| `audit/client` | `auditLog()` — fires `audit.event` Kafka events |
| `http/server` | `createServer()` — Express app with full middleware stack |

## Usage pattern (every service)

```ts
import {
  initConfig, createServer, startServer,
  requireAuth, requireRole, auditLog,
  emitEvent, withRlsContext, logger,
} from '@medguard360/shared';
import { Router } from 'express';

const cfg = initConfig('my-service');
const routes = Router();

routes.get('/things', requireAuth, requireRole('compliance_officer'), async (req, res) => {
  const things = await withRlsContext(req.auth!, (client) =>
    client.query('SELECT * FROM things WHERE state_code = current_setting(\'app.state_code\')')
  );
  await auditLog({
    resource: 'thing', resourceId: 'multiple', action: 'read',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.json(things.rows);
});

const app = createServer({ routes });
startServer(app, cfg.port, cfg.serviceName);
```

## Rules

- Import ONLY from `@medguard360/shared` (the barrel `index.ts`). Internal
  paths are not stable — they can be rearranged.
- NEVER log PHI. Use `auditLog()` instead.
- NEVER call services directly for state changes — use `emitEvent()`.
- ALWAYS wrap PHI queries in `withRlsContext()`.
- ALWAYS register routes under `/api/v1` via `createServer({ routes })`.
