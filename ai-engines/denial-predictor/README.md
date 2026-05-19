# denial-predictor

Two jobs in one engine. Port **8007**.

1. **`POST /v1/predict`** — pre-submission denial-likelihood scorer
   (called by `claims-service` before submitting an 837P)
2. **`POST /v1/draft-appeal`** — post-denial appeal letter draft generator
   (called by `denial-service` after a 835 denial is captured)

## /v1/predict

Returns overall denial probability + a list of likely CARC denial codes
(11/16/50/96/151/197/204/236) and a recommendation:
- `submit_as_is` — < 20%
- `address_risks_first` — 20%–55%
- `do_not_submit` — > 55%

## /v1/draft-appeal

Returns a structured appeal letter draft with subject, body, and a list of
recommended attachments based on the CARC code. Per CLAUDE.md AI governance:
- `requires_human_review: true` — denial/appeals specialist always edits + sends
- `confidence` field reflects template-match quality, not legal validity

## Future trained model

`MODEL_PATH=models/denial_xgb_v1.joblib` will switch the predictor to a
trained XGBoost classifier. The HTTP surface stays the same.
