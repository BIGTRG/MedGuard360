# MedGuard360 — Postgres

## Topology
- **Primary**: port 5432 (writes)
- **Replica 1**: port 5433 (reads)
- **Replica 2**: port 5434 (reads, analytics)
- **PgBouncer**: in front of primary for high-traffic services (transaction pooling)

## Migrations
- Numbered SQL files in `migrations/`, applied in order.
- Each new service that owns tables adds its own migration file.
- Use `psql -1 -f migrations/0001_base_schema.sql` (transactional) for safety.

## HIPAA / RLS rules — non-negotiable

Every table that stores PHI MUST:

1. Include the standard columns: `id uuid PK`, `created_at timestamptz`,
   `updated_at timestamptz`, `created_by uuid REFERENCES users(id)`,
   and `state_code varchar(2)` when applicable.
2. `ALTER TABLE foo ENABLE ROW LEVEL SECURITY;`
3. Define policies using the helpers in 0001:
   - `app_current_user_id()`
   - `app_current_role()`
   - `app_current_state_code()`
   - `app_role_is_cross_state()`
4. From service code, ALWAYS call `withRlsContext(req.auth!, async (client) => {...})`
   from `@medguard360/shared`. The plain `query()` helper bypasses RLS — only
   safe for non-PHI tables (state_config, code lookups, etc.).

## Bootstrap

```bash
# create db + roles
createdb medguard360
createuser medguard --pwprompt

# apply migrations
psql -h localhost -U medguard -d medguard360 -1 -f migrations/0001_base_schema.sql
```
