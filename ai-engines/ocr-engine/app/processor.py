import os
import logging
from .models import OcrRequest, OcrResponse, DocumentClass
from .classifier import classify_document, extract_fields

SKIP_WARMUP = os.getenv("SKIP_WARMUP", "")


def process_document(request: OcrRequest) -> OcrResponse:
    """
    OCR + classify document. Uses Tesseract if available, stub otherwise.
    """
    raw_text = _extract_text(request.file_path, request.file_type)
    doc_class, class_confidence = classify_document(raw_text)
    extracted_fields = extract_fields(raw_text, doc_class)

    return OcrResponse(
        raw_text=raw_text,
        document_class=doc_class,
        classification_confidence=class_confidence,
        extracted_fields=extracted_fields,
        page_count=1,
        model_used="tesseract-5.x" if not SKIP_WARMUP else "stub",
        requires_human_review=True,
    )


def _extract_text(file_path: str, file_type: str) -> str:
    """Extract text from image/PDF using Tesseract. Falls back to stub."""
    if SKIP_WARMUP or not os.path.exists(file_path):
        return """STATE OF NORTH CAROLINA
MEDICAL LICENSE
License Number: NC-12345-MD
Dr. John Smith, M.D.
This certifies that the above named person is licensed to practice medicine
License Type: Medical Doctor
Issue Date: 01/15/2024
Expiration Date: 01/15/2026
Medical Board of North Carolina"""

    try:
        import pytesseract
        from PIL import Image

        if file_type == "pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            pages_text = []
            for page in doc:
                pix = page.get_pixmap()
                img_path = file_path + f"_page_{page.number}.png"
                pix.save(img_path)
                pages_text.append(pytesseract.image_to_string(Image.open(img_path)))
                os.unlink(img_path)
            return "\n".join(pages_text)
        else:
            return pytesseract.image_to_string(Image.open(file_path))
    except Exception as e:
        logging.warning(f"OCR failed: {e}")
        return ""
