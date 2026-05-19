# prior-auth-service — the Clinical Decision Engine

Prior Authorization workflow + **the flagship innovation**: an AI-assisted
clinical decision engine. Port **3006**. Owns `pa_requests`, `pa_criterion_evaluations`.

## What makes this special

It is NOT a form-submission gateway. It is a **clinical intelligence engine**:

1. **Rule lookup** — does this state/payer/procedure even require PA?
   (state-config-service)
2. **Evidence pull** — patient's clinical notes from clinical-doc-service
3. **Criteria pull** — coverage criteria document from state-config-service
4. **AI matching** — pa-nlp-matcher (BERT semantic similarity) scores each
   criterion line against the clinical evidence
5. **Synthesis** — overall score → approve / deny / needs_more_info recommendation
6. **Plain-language explanation** — names the exact criteria that are met
   vs. missing (CLAUDE.md AI governance requirement)
7. **Human-in-the-loop** — recommendation goes to a `prior_auth_specialist`
   queue. The human makes the call. AI never autonomously approves or denies.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/pa-requests`            | provider/pharmacy | Submit PA + get AI recommendation |
| POST   | `/api/v1/pa-requests/:id/decide` | prior_auth_specialist | Human final decision |
| GET    | `/api/v1/pa-requests/:id`        | any role with RLS access | Read |

## SLA windows (enforced via `due_at`)

- Drug PA: **24 hours**
- Expedited PA: **72 hours**
- Standard PA: **7 days**

Set automatically by `computeDueAt(urgency)` on creation.

## Events emitted

- `pa.requested` — when provider submits
- `pa.criteria.evaluated` — when AI completes scoring
- `pa.approved` / `pa.denied` / `pa.needs.more.info` — when human decides

## AI fallback behavior

If `pa-nlp-matcher` is unreachable, the request is routed to manual review
(NOT auto-denied) — per CLAUDE.md AI governance rule.

## What you'll need to add next

- **SLA breach monitor** — a scheduled job that flips `status = 'expired'` and
  emits `pa.expired` when `now() > due_at` and decision is still pending.
- **Real `pa-nlp-matcher` service** — currently a placeholder HTTP call; needs
  the actual BERT model wrapper at port 8006.
- **CMS Interoperability PA API compliance** — FHIR R4 endpoints required
  by January 2027 mandate (CLAUDE.md compliance section).
