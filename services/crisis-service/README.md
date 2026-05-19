# crisis-service

Crisis plans + alerts + biometric responder access. Port **3014**.
Owns `crisis_plans`, `crisis_alerts`, `responder_dispatches`.

## Key flows

1. **Crisis plan creation** — provider builds a structured safety plan
   (Stanley-Brown style: warning signs, coping strategies, social supports,
   professional supports, emergency contacts, environment steps, reasons for living)
2. **Alert ingestion** — consumes `clinical.note.created` (scans via
   crisis-detector) and `crisis.alert.raised` (from hub-service)
3. **Responder access** — `GET /crisis/responder/patient/:patientId` requires
   `requireBiometric` + `emergency_responder` role; logs every access

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/crisis/plans`                        | provider | Create active plan (retires prior) |
| GET    | `/api/v1/crisis/plans/patient/:patientId`     | RLS-scoped | Current active plan |
| GET    | `/api/v1/crisis/responder/patient/:patientId` | responder + biometric | **3-second responder access** |
| GET    | `/api/v1/crisis/alerts`                       | many | Active queue, severity-sorted |
| POST   | `/api/v1/crisis/alerts/:id/dispatch`          | admin/responder | Record dispatch |
| POST   | `/api/v1/crisis/alerts/:id/resolve`           | admin/responder/compliance | Resolve/false-alarm |

## Events

- Consumes: `clinical.note.created`, `crisis.alert.raised`
- Emits: `crisis.plan.created`, `crisis.alert.raised`, `crisis.responder.dispatched`
