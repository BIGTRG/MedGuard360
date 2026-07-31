from __future__ import annotations

from fastapi.testclient import TestClient

from app.detector import ENGINE_VERSION, detect
from app.main import app


def test_live_detector_flags_demo_flow_crisis_phrase() -> None:
    result = detect(
        "Patient stated they want to die and have given up hope.",
        context="clinical_note",
    )

    assert result.is_crisis is True
    assert result.severity in ("high", "critical")
    assert result.recommended_action == "page_crisis_team_immediately"
    assert result.engine_version == ENGINE_VERSION
    assert [signal.category for signal in result.signals] == ["suicidal_ideation"]
    assert result.signals[0].confidence == 0.75
    assert "want to die" in result.signals[0].excerpts[0]
    assert "triage aid" in result.explanation


def test_live_detector_returns_no_action_for_routine_note() -> None:
    result = detect(
        "Patient reports mild headache, stable vitals, and improved sleep.",
        context="clinical_note",
    )

    assert result.is_crisis is False
    assert result.severity == "none"
    assert result.recommended_action == "no_action"
    assert len(result.signals) == 1
    assert result.signals[0].category == "none"
    assert result.signals[0].confidence == 0.99
    assert result.signals[0].excerpts == []


def test_live_detector_escalates_multiple_signals_and_caps_confidence() -> None:
    result = detect(
        "Patient said they are going to kill myself, took all of my pills, "
        "feels better off dead with no reason to live, and disclosed their "
        "partner threatened them.",
        context="hub_chat",
    )

    categories = {signal.category for signal in result.signals}

    assert result.is_crisis is True
    assert result.severity == "critical"
    assert result.recommended_action == "page_crisis_team_immediately"
    assert categories == {
        "suicidal_ideation",
        "substance_overdose",
        "domestic_violence",
    }
    suicidal = next(
        signal for signal in result.signals if signal.category == "suicidal_ideation"
    )
    assert suicidal.confidence == 0.95
    assert len(suicidal.excerpts) == 3
    assert "Detected 3 crisis-language signal(s)" in result.explanation


def test_live_detector_endpoint_response_matches_demo_contract() -> None:
    client = TestClient(app)

    response = client.post(
        "/v1/detect",
        json={
            "text": "Patient stated they want to die and have given up hope.",
            "context": "clinical_note",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["engine_version"] == ENGINE_VERSION
    assert body["is_crisis"] is True
    assert body["severity"] in ("high", "critical")
    assert body["recommended_action"] == "page_crisis_team_immediately"
    assert body["signals"][0]["category"] == "suicidal_ideation"
