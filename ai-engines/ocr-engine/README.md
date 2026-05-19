# ocr-engine

Tesseract OCR + document classifier for credentialing documents. Port **8003**.
Called by `credentialing-service` when a provider uploads license, DEA cert,
W-9, insurance certificate, etc.

## Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`   | Liveness |
| GET    | `/metrics`  | Prometheus |
| POST   | `/v1/ocr`   | Download document, OCR, classify, extract fields |

## Output

```json
{
  "text": "full OCR text...",
  "classified_as": "medical_license | dea_certificate | board_certification | malpractice_insurance | w9 | voided_check | drivers_license | diploma | cv_resume | other",
  "classification_confidence": 0.85,
  "extracted_fields": [
    {"name": "license_number", "value": "MD123456", "confidence": 0.8},
    {"name": "issuing_state",  "value": "North Carolina", "confidence": 0.8},
    {"name": "expiration",     "value": "12/31/2027", "confidence": 0.8}
  ],
  "page_count": 1
}
```

## Per-class extraction

The current keyword-fingerprint classifier and field-regex extractor cover:
medical_license, dea_certificate, w9, malpractice_insurance. Other classes
detect but don't yet extract structured fields — `credentialing-service`
treats them as text-only attachments.

## System dependencies

`tesseract-ocr` binary must be installed (apt: `apt-get install -y tesseract-ocr`).
PDF support needs `poppler-utils` for `pdf2image`.
