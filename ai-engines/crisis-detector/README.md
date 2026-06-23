# crisis-detector

Crisis-language classifier. Port **8009**. Called by `clinical-doc-service`
on every new note + `hub-service` on incoming chat messages.

## Endpoint

`POST /v1/detect` → `{ is_crisis, severity, signals[], recommended_action, explanation }`

Severity bands: `none` | `low` | `moderate` | `high` | `critical`

Categories: `suicidal_ideation`, `self_harm`, `homicidal_ideation`,
`substance_overdose`, `domestic_violence`, `child_abuse`, `severe_psychosis`.

## Recommended actions

- `critical` / `high` / any high-priority category → `page_crisis_team_immediately`
- `moderate` → `route_to_clinical_review_today`
- `low` → `flag_for_routine_followup`
- `none` → `no_action`

## Tuning

Biased toward **high recall** — better to over-flag than miss a crisis.
crisis-service makes the final human-routing call.

## Docker demo vs v2 tests

The demo compose stack runs **v1** (`uvicorn app.main:app` → `app/detector.py`).
Responses use `is_crisis`, `severity`, and `signals[]`.

CI also runs **v2** tests in `tests/test_detector.py` (`detector_v2.py`) for the
next-gen pipeline. Demo scripts and `tests/test_rules_detector.py` target **v1**
so laptop bring-up matches production containers.
