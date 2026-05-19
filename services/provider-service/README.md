# provider-service

Provider profiles, NPI, taxonomy, locations. Port **3002**.
Owns `providers`, `provider_specialties`, `provider_locations`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/providers`                        | credentialing/admin | Register provider |
| GET    | `/api/v1/providers`                        | any | Search/directory |
| GET    | `/api/v1/providers/:id`                    | any with RLS access | Read with specialties+locations |
| GET    | `/api/v1/providers/by-npi/:npi`            | any | NPI lookup |
| POST   | `/api/v1/providers/:id/specialties`        | credentialing/self | Add NUCC taxonomy |
| POST   | `/api/v1/providers/:id/locations`          | credentialing/self | Add practice location |
| POST   | `/api/v1/providers/:id/status`             | credentialing/compliance | active/suspended/terminated |

## Events emitted

- `provider.created`
- `provider.status.changed`

## RLS pattern

- Federal CMS / platform admin → all
- State-scoped admins → providers in their state
- Provider self → own row
- Anyone → active providers (directory view) — minimal columns ideal for UI

## Downstream consumers

- `credentialing-service` references `providers.id` for credentialing applications
- `claims-service.claims.billing_provider_id` → `providers.id`
- `fraud-engine-service` uses `provider_locations` for distance-anomaly detection
