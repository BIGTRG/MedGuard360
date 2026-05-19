# clinical-doc-service

Real-time clinical documentation orchestrator. Port **3007**.
Owns `clinical_encounters`, `clinical_documents`.

## Pipeline

1. **Start encounter** (`POST /encounters`) — provider starts session, status `in_progress`
2. **Capture content**:
   - **Audio**: `POST /encounters/:id/audio` → MinIO → speech-to-text → transcript persisted → clinical-nlp → codes suggested
   - **Note**: `POST /encounters/:id/note` → MinIO → clinical-nlp → codes suggested
3. **Sign encounter** (`POST /encounters/:id/sign`) — provider signs, status `signed`

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/encounters`               | provider | Start encounter |
| GET    | `/api/v1/encounters/:id`           | any RLS | Read encounter + all docs |
| POST   | `/api/v1/encounters/:id/audio`     | provider | Upload audio (multipart `audio`), trigger pipeline |
| POST   | `/api/v1/encounters/:id/note`      | provider | Typed note, trigger NLP |
| POST   | `/api/v1/encounters/:id/sign`      | provider | Sign |
| GET    | `/api/v1/clinical-doc/:id`         | any RLS | **Used by prior-auth-service** — return extracted text + codes |

## Events emitted

- `clinical.encounter.started`
- `clinical.encounter.completed`
- `clinical.note.created`
- `clinical.code.suggested` (TODO — currently bundled into note.created)

## Downstream

- `prior-auth-service` calls `GET /clinical-doc/:id` to pull evidence for PA decisioning
- `claims-service` references encounter via `clinical_encounters.claim_ids[]` when claim is generated

## Storage

Audio → `clinical-audio` bucket
Video → `clinical-video` bucket
Notes + transcripts → `clinical-documents` bucket

All buckets have SSE-S3 encryption and the 30d→365d→7yr lifecycle from
`infrastructure/minio/bootstrap.sh`.
