# nemt-service

Non-emergency medical transport. Port **3013**. Owns `nemt_trips`.

## Anti-fraud feature

Every completed trip submits a GPS track. We compute:
- `gpsMiles` — Haversine sum over the actual track
- `straightMiles` — point-to-point pickup→destination
- `inflationRatio = gpsMiles / straightMiles`

Inflation ratio > ~1.5× is a fraud signal (route padding). fraud-engine
consumes `nemt.trip.completed` and can flag based on ratio + driver history.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/nemt/trips`              | broker/provider | Schedule a trip |
| POST   | `/api/v1/nemt/trips/:id/start`    | broker | Assign driver, status → en_route |
| POST   | `/api/v1/nemt/trips/:id/complete` | broker | Submit GPS track + compute mileage charge |
| GET    | `/api/v1/nemt/trips/:id`          | RLS-scoped | Read trip + GPS track |

## Events emitted

- `nemt.trip.scheduled`
- `nemt.trip.completed` (with gpsMiles, straightMiles, inflationRatio)
