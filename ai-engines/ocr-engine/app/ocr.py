"""
Tesseract OCR + heuristic document classifier.

Production deployment swaps the classifier for a CNN trained on the
credentialing-document corpus. The interface here stays stable.
"""
from __future__ import annotations

import re
import tempfile
import urllib.request
from io import BytesIO
from typing import Iterable

from PIL import Image

from .schemas import DocClass, ExtractedField, OcrResponse

ENGINE_VERSION = "ocr-engine/0.1.0-tesseract"

# Document-class keyword fingerprints — low-tech but works for the doc types
# we see in Medicaid credentialing packets.
_FINGERPRINTS: dict[DocClass, list[re.Pattern[str]]] = {
    "medical_license":       [re.compile(r"\b(medical|physician|surgeon|nursing) license\b", re.I),
                              re.compile(r"\blicense (?:number|no\.?)\b", re.I)],
    "dea_certificate":       [re.compile(r"\bdrug enforcement administration\b", re.I),
                              re.compile(r"\bdea (?:registration|number)\b", re.I)],
    "board_certification":   [re.compile(r"\bamerican board of (?:internal medicine|family medicine|pediatrics|psychiatry)\b", re.I),
                              re.compile(r"\bdiplomate\b", re.I)],
    "malpractice_insurance": [re.compile(r"\bcertificate of insurance\b", re.I),
                              re.compile(r"\bprofessional liability\b", re.I)],
    "w9":                    [re.compile(r"\bform w-?9\b", re.I),
                              re.compile(r"\btaxpayer identification number\b", re.I)],
    "voided_check":          [re.compile(r"\bvoid\b.*\bcheck\b", re.I | re.S)],
    "drivers_license":       [re.compile(r"\bdriver'?s? license\b", re.I),
                              re.compile(r"\b(?:DL|LIC)\s?#\b", re.I)],
    "diploma":               [re.compile(r"\b(?:bachelor|master|doctor) of\b", re.I),
                              re.compile(r"\b(?:university|college) of\b", re.I)],
    "cv_resume":             [re.compile(r"\b(?:curriculum vitae|cv|resume)\b", re.I),
                              re.compile(r"\beducation\b.*\bexperience\b", re.I | re.S)],
}

_FIELD_PATTERNS: dict[DocClass, list[tuple[str, re.Pattern[str]]]] = {
    "medical_license": [
        ("license_number", re.compile(r"license\s*(?:number|no\.?)?[:\s]+([A-Z0-9\-]+)", re.I)),
        ("issuing_state",  re.compile(r"state of\s+([A-Za-z ]+)", re.I)),
        ("expiration",     re.compile(r"expir(?:es|ation)[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})", re.I)),
        ("holder_name",    re.compile(r"issued to[:\s]+([A-Z][A-Za-z'\-\s]+)", re.I)),
    ],
    "dea_certificate": [
        ("dea_number",     re.compile(r"\b([A-Z]{2}\d{7})\b")),
        ("expiration",     re.compile(r"expir(?:es|ation)[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})", re.I)),
    ],
    "w9": [
        ("ein",            re.compile(r"\b(\d{2}-\d{7})\b")),
        ("legal_name",     re.compile(r"\b(?:name|business name)[:\s]+([A-Z][A-Za-z0-9 .,&'\-]+)", re.I)),
    ],
    "malpractice_insurance": [
        ("policy_number",  re.compile(r"policy\s*(?:number|no\.?)?[:\s]+([A-Z0-9\-]+)", re.I)),
        ("aggregate_limit", re.compile(r"\$?\s?([\d,]+)\s+aggregate", re.I)),
        ("expiration",      re.compile(r"expir(?:es|ation)[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})", re.I)),
    ],
}


def _download(url: str) -> bytes:
    with urllib.request.urlopen(url) as resp:
        return resp.read()


def _images_from_bytes(data: bytes, content_type: str | None) -> tuple[list[Image.Image], int]:
    if content_type and "pdf" in content_type.lower():
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(data, dpi=200)
        return list(pages), len(pages)
    img = Image.open(BytesIO(data))
    return [img], 1


def _classify(text: str) -> tuple[DocClass, float]:
    best: tuple[DocClass, int] = ("other", 0)
    for cls, patterns in _FINGERPRINTS.items():
        hits = sum(1 for p in patterns if p.search(text))
        if hits > best[1]:
            best = (cls, hits)
    if best[1] == 0:
        return "other", 0.30
    # confidence ramps from 0.5 (1 hit) to 0.95 (3+ hits)
    confidence = min(0.95, 0.5 + (best[1] - 1) * 0.20)
    return best[0], round(confidence, 3)


def _extract_fields(text: str, cls: DocClass) -> list[ExtractedField]:
    patterns = _FIELD_PATTERNS.get(cls, [])
    out: list[ExtractedField] = []
    for name, pat in patterns:
        m = pat.search(text)
        if m:
            out.append(ExtractedField(name=name, value=m.group(1).strip(), confidence=0.80))
    return out


def ocr(document_url: str, correlation_id: str | None, expected_class: DocClass | None) -> OcrResponse:
    data = _download(document_url)
    # Best-effort content-type detection
    ct = "application/pdf" if data[:4] == b"%PDF" else "image/png"
    pages, page_count = _images_from_bytes(data, ct)

    import pytesseract
    full_text_parts: list[str] = []
    for img in pages:
        full_text_parts.append(pytesseract.image_to_string(img))
    text = "\n\n".join(full_text_parts)

    cls, conf = _classify(text)
    # Caller's hint can override low-confidence classifications
    if expected_class and conf < 0.7:
        cls = expected_class
        conf = 0.5

    fields = _extract_fields(text, cls)

    return OcrResponse(
        engine_version=ENGINE_VERSION,
        correlation_id=correlation_id,
        text=text,
        classified_as=cls,
        classification_confidence=conf,
        extracted_fields=fields,
        page_count=page_count,
    )


def warmup() -> None:
    """No model load needed for tesseract; this is a no-op kept for symmetry."""
    pass
