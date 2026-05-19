"""
Tests for ocr-engine classifier and field extractor.
Run with: pytest ai-engines/ocr-engine/tests/
"""
import sys
import os

# Allow running tests without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import DocumentClass
from app.classifier import classify_document, extract_fields


MEDICAL_LICENSE_TEXT = """
STATE OF NORTH CAROLINA
MEDICAL LICENSE
License Number: NC-12345-MD
Dr. John Smith, M.D.
This certifies that the above named person is licensed to practice medicine
and surgery in the State of North Carolina.
License Type: Medical Doctor
Issue Date: 01/15/2024
Expiration: 01/15/2026
Medical Board of North Carolina
State Board of Medical Examiners
"""

DEA_CERTIFICATE_TEXT = """
DRUG ENFORCEMENT ADMINISTRATION
CERTIFICATE OF REGISTRATION
DEA Number: AB1234567
This certifies registration under the Controlled Substances Act
DEA Registration Number: AB1234567
Schedules: II, IIN, III, IIIN, IV, V
Expiration Date: 03/31/2026
"""

NPI_LETTER_TEXT = """
NATIONAL PROVIDER IDENTIFIER STANDARD
NPPES — National Plan and Provider Enumeration System
National Provider Identifier (NPI): 1234567890
NPI Number: 1234567890
Provider Type: Individual
Taxonomy: 207Q00000X — Family Medicine
"""

BOARD_CERTIFICATION_TEXT = """
AMERICAN BOARD OF INTERNAL MEDICINE
This certifies that
DR. JANE DOE, M.D.
is a Diplomate of the American Board of Internal Medicine
Board Certified in Internal Medicine
Specialty: Cardiovascular Disease
Certification Date: 2022-06-15
"""

MALPRACTICE_TEXT = """
CERTIFICATE OF PROFESSIONAL LIABILITY INSURANCE
This certifies malpractice coverage for:
Policy Number: MPL-2024-789012
Per Occurrence Limit: $1,000,000 per occurrence
Aggregate Limit: $3,000,000 aggregate
Insurer: MedPro Group
Policy Period: 01/01/2024 to 12/31/2024
"""


class TestClassifyDocument:
    def test_classify_medical_license(self):
        doc_class, confidence = classify_document(MEDICAL_LICENSE_TEXT)
        assert doc_class == DocumentClass.medical_license
        assert confidence > 0.50

    def test_classify_dea_certificate(self):
        doc_class, confidence = classify_document(DEA_CERTIFICATE_TEXT)
        assert doc_class == DocumentClass.dea_certificate
        assert confidence > 0.50

    def test_classify_npi_letter(self):
        doc_class, confidence = classify_document(NPI_LETTER_TEXT)
        assert doc_class == DocumentClass.npi_letter
        assert confidence > 0.50

    def test_classify_board_certification(self):
        doc_class, confidence = classify_document(BOARD_CERTIFICATION_TEXT)
        assert doc_class == DocumentClass.board_certification
        assert confidence > 0.50

    def test_classify_malpractice_insurance(self):
        doc_class, confidence = classify_document(MALPRACTICE_TEXT)
        assert doc_class == DocumentClass.malpractice_insurance
        assert confidence > 0.50

    def test_classify_unknown_returns_other(self):
        doc_class, confidence = classify_document("This is a random document with no relevant keywords.")
        assert doc_class == DocumentClass.other
        assert confidence == 0.50

    def test_confidence_bounded(self):
        """Confidence must always be in [0, 1]."""
        for text in [MEDICAL_LICENSE_TEXT, DEA_CERTIFICATE_TEXT, NPI_LETTER_TEXT, "random text"]:
            _, confidence = classify_document(text)
            assert 0.0 <= confidence <= 1.0


class TestExtractFields:
    def test_extract_license_number_from_medical_license(self):
        fields = extract_fields(MEDICAL_LICENSE_TEXT, DocumentClass.medical_license)
        field_names = [f.field_name for f in fields]
        field_values = {f.field_name: f.value for f in fields}

        assert "license_number" in field_names
        assert field_values["license_number"] == "NC-12345-MD"

    def test_extract_expiration_date_from_medical_license(self):
        fields = extract_fields(MEDICAL_LICENSE_TEXT, DocumentClass.medical_license)
        field_values = {f.field_name: f.value for f in fields}
        assert "expiration_date" in field_values
        assert field_values["expiration_date"] == "01/15/2026"

    def test_extract_issuing_state_from_medical_license(self):
        fields = extract_fields(MEDICAL_LICENSE_TEXT, DocumentClass.medical_license)
        field_values = {f.field_name: f.value for f in fields}
        assert "issuing_state" in field_values
        # The regex captures "North Carolina" from "State of North Carolina"
        assert "North" in field_values["issuing_state"]

    def test_extract_dea_number(self):
        fields = extract_fields(DEA_CERTIFICATE_TEXT, DocumentClass.dea_certificate)
        field_values = {f.field_name: f.value for f in fields}
        assert "dea_number" in field_values
        assert field_values["dea_number"] == "AB1234567"

    def test_extract_npi_number(self):
        fields = extract_fields(NPI_LETTER_TEXT, DocumentClass.npi_letter)
        field_values = {f.field_name: f.value for f in fields}
        assert "npi_number" in field_values
        assert field_values["npi_number"] == "1234567890"

    def test_extract_policy_number_from_malpractice(self):
        fields = extract_fields(MALPRACTICE_TEXT, DocumentClass.malpractice_insurance)
        field_values = {f.field_name: f.value for f in fields}
        assert "policy_number" in field_values
        assert field_values["policy_number"] == "MPL-2024-789012"

    def test_extract_fields_confidence_in_range(self):
        fields = extract_fields(MEDICAL_LICENSE_TEXT, DocumentClass.medical_license)
        for field in fields:
            assert 0.0 <= field.confidence <= 1.0

    def test_no_extractors_for_unknown_class(self):
        """DocumentClass.other has no extractors — should return empty list."""
        fields = extract_fields("some text", DocumentClass.other)
        assert fields == []

    def test_missing_field_not_included(self):
        """Fields with no regex match should be omitted, not returned with empty value."""
        sparse_text = "MEDICAL LICENSE\nLicense to practice medicine."
        fields = extract_fields(sparse_text, DocumentClass.medical_license)
        # license_number regex won't match sparse_text
        field_names = [f.field_name for f in fields]
        assert "license_number" not in field_names
