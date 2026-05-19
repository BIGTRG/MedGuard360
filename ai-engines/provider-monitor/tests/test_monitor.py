"""
pytest tests for the provider-monitor rules engine (monitor_v2.py).

Covers:
  - Expired license → critical alert
  - LEIE check overdue → warning alert
  - Billing spike 200% month-over-month → warning/critical alert
  - Clean provider → low risk, no requires_human_review
  - Multiple alerts → correct risk aggregation
  - Malpractice expiry at 14-day threshold → critical
  - High claim volume > 200 → warning
  - next_check_date is always ~30 days out
"""
from __future__ import annotations

import pytest
from datetime import date, timedelta

from app.models import ProviderMonitorRequest, MonitorResult
from app.monitor_v2 import monitor_provider, MODEL_VERSION


# --------------------------------------------------------------------------- #
# Helpers                                                                       #
# --------------------------------------------------------------------------- #

def _today_plus(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def _today_minus(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def _clean_provider(**overrides) -> ProviderMonitorRequest:
    """A baseline provider with all-current credentials and normal billing."""
    base = dict(
        provider_id="PRV-001",
        npi="1234567890",
        state_code="NC",
        license_expiry_date=_today_plus(180),
        dea_expiry_date=_today_plus(200),
        malpractice_expiry_date=_today_plus(120),
        last_leie_check=_today_minus(5),
        last_pecos_check=_today_minus(10),
        monthly_claim_count=80,
        monthly_claim_total=20000.0,
        prior_month_claim_count=75,
        prior_month_claim_total=18750.0,
    )
    base.update(overrides)
    return ProviderMonitorRequest(**base)


# --------------------------------------------------------------------------- #
# Test 1 — Expired license → critical alert                                   #
# --------------------------------------------------------------------------- #

def test_expired_license_generates_critical_alert():
    """A license that expired 10 days ago must trigger a critical alert."""
    req = _clean_provider(license_expiry_date=_today_minus(10))
    result = monitor_provider(req)

    critical_alerts = [a for a in result.alerts if a.severity == "critical"]
    assert len(critical_alerts) >= 1, f"Expected critical alert, got: {result.alerts}"

    credential_alerts = [a for a in critical_alerts if a.alert_type == "expiring_credential"]
    assert len(credential_alerts) >= 1

    alert = credential_alerts[0]
    assert "expired" in alert.description.lower()
    assert alert.days_until_expiry is not None and alert.days_until_expiry < 0

    assert result.overall_risk_level == "high"
    assert result.requires_human_review is True


# --------------------------------------------------------------------------- #
# Test 2 — LEIE check overdue → warning alert                                 #
# --------------------------------------------------------------------------- #

def test_leie_check_overdue_generates_warning():
    """LEIE check run 45 days ago (> 30 threshold) should trigger a warning."""
    req = _clean_provider(last_leie_check=_today_minus(45))
    result = monitor_provider(req)

    leie_alerts = [
        a for a in result.alerts
        if a.alert_type == "exclusion_check_overdue" and "LEIE" in a.description
    ]
    assert len(leie_alerts) >= 1, f"Expected LEIE overdue alert, got: {result.alerts}"
    assert leie_alerts[0].severity == "warning"
    assert "45" in leie_alerts[0].description


# --------------------------------------------------------------------------- #
# Test 3 — Billing spike 200% → warning or critical alert                     #
# --------------------------------------------------------------------------- #

def test_billing_spike_200pct_generates_alert():
    """Doubling claim count month-over-month should trigger a billing_spike alert."""
    req = _clean_provider(prior_month_claim_count=50, monthly_claim_count=100)
    result = monitor_provider(req)

    billing_alerts = [a for a in result.alerts if a.alert_type == "billing_spike"]
    assert len(billing_alerts) >= 1, f"Expected billing_spike alert, got: {result.alerts}"

    alert = billing_alerts[0]
    assert alert.severity in ("warning", "critical")
    assert result.billing_anomaly_score > 0


def test_billing_spike_300pct_generates_critical():
    """3x billing spike should produce a critical severity billing_spike alert."""
    req = _clean_provider(prior_month_claim_count=50, monthly_claim_count=150)
    result = monitor_provider(req)

    billing_alerts = [a for a in result.alerts if a.alert_type == "billing_spike"]
    assert len(billing_alerts) >= 1
    critical_billing = [a for a in billing_alerts if a.severity == "critical"]
    assert len(critical_billing) >= 1, (
        f"Expected critical billing spike alert, got severities: "
        f"{[a.severity for a in billing_alerts]}"
    )


# --------------------------------------------------------------------------- #
# Test 4 — Clean provider → low risk, no human review required                #
# --------------------------------------------------------------------------- #

def test_clean_provider_low_risk():
    """Provider with all-current credentials and normal billing → low risk."""
    req = _clean_provider()
    result = monitor_provider(req)

    assert result.overall_risk_level == "low", (
        f"Expected low risk, got {result.overall_risk_level}. Alerts: {result.alerts}"
    )
    assert result.alerts == [], f"Expected no alerts, got: {result.alerts}"
    assert result.billing_anomaly_score == 0.0
    assert result.requires_human_review is False


# --------------------------------------------------------------------------- #
# Test 5 — Malpractice at 14-day threshold → critical                         #
# --------------------------------------------------------------------------- #

def test_malpractice_14_day_critical():
    """Malpractice expiring in 14 days should be critical (threshold is 14 days)."""
    req = _clean_provider(malpractice_expiry_date=_today_plus(14))
    result = monitor_provider(req)

    crit_alerts = [
        a for a in result.alerts
        if a.severity == "critical" and a.alert_type == "expiring_credential"
        and "Malpractice" in a.description
    ]
    assert len(crit_alerts) >= 1, (
        f"Expected critical malpractice alert at 14 days, got: {result.alerts}"
    )


# --------------------------------------------------------------------------- #
# Test 6 — High claim volume > 200 → warning                                  #
# --------------------------------------------------------------------------- #

def test_high_claim_volume_generates_warning():
    """Monthly claim count of 250 should trigger a high_claim_volume warning."""
    req = _clean_provider(monthly_claim_count=250, prior_month_claim_count=240)
    result = monitor_provider(req)

    volume_alerts = [a for a in result.alerts if a.alert_type == "high_claim_volume"]
    assert len(volume_alerts) >= 1, f"Expected high_claim_volume alert, got: {result.alerts}"
    assert volume_alerts[0].severity == "warning"
    assert "250" in volume_alerts[0].description
    assert result.billing_anomaly_score >= 70.0


# --------------------------------------------------------------------------- #
# Test 7 — next_check_date is approximately 30 days out                       #
# --------------------------------------------------------------------------- #

def test_next_check_date_is_30_days():
    """next_check_date should be 30 days from today."""
    req = _clean_provider()
    result = monitor_provider(req)

    expected = (date.today() + timedelta(days=30)).isoformat()
    assert result.next_check_date == expected, (
        f"Expected {expected}, got {result.next_check_date}"
    )


# --------------------------------------------------------------------------- #
# Test 8 — response schema completeness                                        #
# --------------------------------------------------------------------------- #

def test_response_schema_fields_present():
    """All MonitorResult fields are present and correctly typed."""
    req = _clean_provider()
    result = monitor_provider(req)

    assert result.provider_id == req.provider_id
    assert result.npi == req.npi
    assert result.overall_risk_level in ("low", "medium", "high")
    assert isinstance(result.alerts, list)
    assert isinstance(result.billing_anomaly_score, float)
    assert isinstance(result.explanation, str) and len(result.explanation) > 0
    assert isinstance(result.requires_human_review, bool)


# --------------------------------------------------------------------------- #
# Test 9 — Multiple issues → medium or high risk                              #
# --------------------------------------------------------------------------- #

def test_multiple_warnings_elevates_to_medium_risk():
    """Two warning-level alerts should elevate overall risk to medium."""
    req = _clean_provider(
        last_leie_check=_today_minus(60),   # LEIE overdue → warning
        monthly_claim_count=250,             # high volume → warning
        prior_month_claim_count=240,
    )
    result = monitor_provider(req)

    warning_count = sum(1 for a in result.alerts if a.severity == "warning")
    assert warning_count >= 2, f"Expected >= 2 warnings, got: {result.alerts}"
    assert result.overall_risk_level in ("medium", "high")
    assert result.requires_human_review is True
