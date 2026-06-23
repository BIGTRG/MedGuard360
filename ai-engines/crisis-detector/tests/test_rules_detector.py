"""Tests for crisis-detector v1 rules engine (app.main in Docker)."""
from __future__ import annotations

from app.detector import ENGINE_VERSION, detect


def test_want_to_die_triggers_crisis():
    result = detect("Patient stated they want to die and have given up hope.")
    assert result.is_crisis is True
    assert result.severity in ("moderate", "high", "critical")
    assert any(s.category == "suicidal_ideation" for s in result.signals)


def test_routine_note_no_crisis():
    result = detect(
        "Patient presents with mild upper respiratory infection. "
        "Vital signs stable. Prescribed amoxicillin."
    )
    assert result.is_crisis is False
    assert result.severity == "none"


def test_engine_version():
    result = detect("routine follow-up")
    assert result.engine_version == ENGINE_VERSION