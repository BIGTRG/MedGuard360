# patient-service

Patient records — port **3004**. Owns `patients`, `patient_provider_assignments`.

THE canonical PHI service. Every query goes through `withRlsContext()`, every
read/write is `auditLog()`'d, and full-record `/export` requires biometric.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/patients`            | provider/credentialing/admin | Create patient |
| GET    | `/api/v1/patients`            | any role with RLS access | Search |
| GET    | `/api/v1/patients/:id`        | any role with RLS access | Read one |
| PATCH  | `/api/v1/patients/:id`        | provider/credentialing/admin | Update |
| GET    | `/api/v1/patients/:id/export` | + biometric | Full-record export |

## Events emitted

- `patient.created`
- `patient.updated`

## RLS

Defined in `0003_patient_schema.sql`. Summary:
- `federal_cms` / `platform_administrator` — all states
- State-scoped admin roles — own state
- `individual_provider` / `facility_provider` — only patients where they are PCP
- `patient` — themselves
- `emergency_responder` — patients in their state, biometric-gated at app layer

## Anti-patterns to avoid

- ❌ `query('SELECT * FROM patients ...')` — bypasses RLS. Use `withRlsContext()`.
- ❌ Logging PHI in winston. Use `auditLog()` instead.
- ❌ Returning the full row from search without filtering. RLS handles row scope;
  if you also need to redact columns (e.g. hide SSN from some roles), do it
  here in `routes.ts`.
