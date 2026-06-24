from __future__ import annotations

from fastapi.testclient import TestClient

from app.detector import detect
from app.main import app


def test_detect_flags_want_to_die_as_immediate_suicidal_crisis() -> None:
    result = detect("Patient stated they want to die and have given up hope.", "clinical_note")

    assert result.is_crisis is True
    assert result.severity in {"high", "critical"}
    assert result.recommended_action == "page_crisis_team_immediately"
    assert any(signal.category == "suicidal_ideation" for signal in result.signals)
    assert any("want to die" in excerpt for signal in result.signals for excerpt in signal.excerpts)


def test_detect_endpoint_uses_deployed_v1_schema_for_want_to_die_phrase() -> None:
    client = TestClient(app)

    response = client.post(
        "/v1/detect",
        json={
            "text": "Caller says they are going to die tonight and need help.",
            "context": "hub_chat",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_crisis"] is True
    assert body["severity"] in {"high", "critical"}
    assert body["recommended_action"] == "page_crisis_team_immediately"
    assert body["signals"][0]["category"] == "suicidal_ideation"
    assert body["engine_version"].startswith("crisis-detector/")


def test_detect_keeps_routine_clinical_note_out_of_crisis_queue() -> None:
    result = detect(
        "Patient reports mild sore throat and cough for two days. Vitals stable.",
        "clinical_note",
    )

    assert result.is_crisis is False
    assert result.severity == "none"
    assert result.recommended_action == "no_action"
    assert result.signals[0].category == "none"
