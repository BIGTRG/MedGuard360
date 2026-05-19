# clinical-nlp

Clinical NER + ICD-10 / CPT code suggestion. Port **8002**.
Called by `clinical-doc-service` after speech-to-text has produced a transcript,
or directly on typed notes.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`          | Liveness |
| GET    | `/metrics`         | Prometheus |
| POST   | `/v1/analyze`      | Extract entities, suggest codes |
| POST   | `/v1/override-log` | Clinician overrode a suggestion |

## Output

```json
{
  "entities": [{"text": "...", "type": "disease|medication|procedure|symptom|anatomy|other", "start": N, "end": N, "confidence": 0.85}],
  "suggested_diagnosis_codes": [{"code": "F32.9", "code_system": "ICD-10", "description": "...", "confidence": 0.80, "rationale": "..."}],
  "suggested_procedure_codes": [...],
  "summary": "Extracted N entities, suggested M diagnoses + K procedures. Clinician must approve before billing."
}
```

Every suggestion includes a **rationale** field per CLAUDE.md AI governance —
the clinician sees why the engine suggested each code.

## Implementation

- `USE_SCISPACY=1` → loads `en_core_sci_md` for biomedical NER
- Otherwise → deterministic regex fallback over a seed dictionary

The fallback is enough for development and demos. For production accuracy,
install the scispaCy models per the comments in `requirements.txt`.
