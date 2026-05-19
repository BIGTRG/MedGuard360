# denial-service

Denial capture + AI-drafted appeals + outcome tracking. Port **3010**.
Owns `denials`, `appeals`.

## Pipeline

1. **Consume** `claim.denied` from Kafka → persist a `denials` row
   (90-day appeal deadline default)
2. **Draft appeal** (specialist hits `POST /denials/:id/draft-appeal`) →
   calls `denial-predictor /v1/draft-appeal` with the CARC code +
   clinical evidence → stores an `appeals` row marked `drafted_by_ai`
3. **Review** (`POST /appeals/:id/review`) — specialist edits the draft
4. **Submit** (`POST /appeals/:id/submit`) — appeal goes to the payer
5. **Outcome** (`POST /appeals/:id/outcome`) — record won/lost

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/v1/denials`                       | List by status (default: active workload) |
| GET    | `/api/v1/denials/:id`                   | Read denial + all appeal attempts |
| POST   | `/api/v1/denials/:id/draft-appeal`      | AI generates appeal draft |
| POST   | `/api/v1/appeals/:id/review`            | Specialist edits subject/body/attachments |
| POST   | `/api/v1/appeals/:id/submit`            | Submit to payer |
| POST   | `/api/v1/appeals/:id/outcome`           | Record final won/lost |

## Events

- Consumes: `claim.denied`
- Emits: `claim.appealed` (when draft persisted; when submit fires)

## AI governance

`appeals.drafted_by_ai`, `ai_engine_version`, `ai_confidence` are persisted
so the audit trail shows exactly what the AI proposed vs. what the human
sent. The specialist MUST `review` before `submit`.
