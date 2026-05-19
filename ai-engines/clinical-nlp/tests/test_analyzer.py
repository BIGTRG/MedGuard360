import pytest

@pytest.fixture(autouse=True)
def _skip_scispacy(monkeypatch):
    monkeypatch.delenv("USE_SCISPACY", raising=False)


def test_finds_depression_and_suggests_f32_9():
    from app.analyzer import analyze
    out = analyze("Patient presents with major depressive disorder and difficulty sleeping.", "e1")
    assert any(c.code == "F32.9" for c in out.suggested_diagnosis_codes)
    assert any(e.type == "disease" for e in out.entities)


def test_finds_psychotherapy_and_suggests_90837():
    from app.analyzer import analyze
    out = analyze("60 min psychotherapy session for ongoing anxiety symptoms.", None)
    codes = {c.code for c in out.suggested_procedure_codes}
    assert "90837" in codes


def test_empty_note_returns_no_entities():
    from app.analyzer import analyze
    out = analyze("This note contains no medical information whatsoever.", None)
    assert out.suggested_diagnosis_codes == []
    assert out.suggested_procedure_codes == []
