"""
Continuous provider monitor.

Runs nightly (or on demand) over provider snapshots from provider-service +
credentialing-service + claims-service. Surfaces:
  - Credentialing drift (license / DEA / malpractice expiring or expired)
  - Billing-pattern anomalies (volume spike, charge spike, distinct-patient drop)
  - Stale PSV checks

The schema is stable for swap to a real anomaly-detection model later.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Iterable

from .schemas import MonitorFinding, MonitorResponse, ProviderSnapshot

ENGINE_VERSION = "provider-monitor/0.1.0"

WARN_DAYS = 60     # license/DEA/malpractice expiring within this window
CRITICAL_DAYS = 14
PSV_STALE_DAYS = 90


def _days_until(d: str | None) -> int | None:
    if not d:
        return None
    try:
        target = datetime.strptime(d[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    return (target - date.today()).days


def _spike_factor(current: float, baseline: float) -> float:
    if baseline <= 0:
        return 0.0 if current <= 0 else 99.0
    return current / baseline


def monitor(snapshots: list[ProviderSnapshot]) -> MonitorResponse:
    findings: list[MonitorFinding] = []

    for s in snapshots:
        # Expiration checks
        for label, code_base, expires in [
            ("license", "LICENSE", s.license_expires_at),
            ("DEA registration", "DEA", s.dea_expires_at),
            ("malpractice insurance", "MALPRACTICE", s.malpractice_expires_at),
        ]:
            days = _days_until(expires)
            if days is None:
                continue
            if days < 0:
                findings.append(MonitorFinding(
                    provider_id=s.provider_id, severity="critical",
                    code=f"{code_base}_EXPIRED",
                    label=f"{label.capitalize()} expired {abs(days)} day(s) ago",
                    detail=f"Provider {s.provider_id} has an expired {label}. Suspend billing until renewed.",
                ))
            elif days <= CRITICAL_DAYS:
                findings.append(MonitorFinding(
                    provider_id=s.provider_id, severity="critical",
                    code=f"{code_base}_EXPIRING_NOW",
                    label=f"{label.capitalize()} expires in {days} day(s)",
                    detail=f"Provider {s.provider_id} {label} expires {expires}. Immediate action needed.",
                ))
            elif days <= WARN_DAYS:
                findings.append(MonitorFinding(
                    provider_id=s.provider_id, severity="warn",
                    code=f"{code_base}_EXPIRING_SOON",
                    label=f"{label.capitalize()} expires in {days} day(s)",
                    detail=f"Provider {s.provider_id} {label} expires {expires}. Schedule renewal.",
                ))

        # PSV staleness
        psv_age = _days_until(s.last_psv_checked_at)
        if psv_age is not None and psv_age < -PSV_STALE_DAYS:
            findings.append(MonitorFinding(
                provider_id=s.provider_id, severity="warn",
                code="PSV_STALE",
                label=f"PSV checks are {abs(psv_age)} days old",
                detail=f"Re-run PSV (NPI/PECOS/LEIE/SAM/state board/DEA) for provider {s.provider_id}.",
            ))

        # Billing volume spike
        vol_factor = _spike_factor(s.monthly_claims_30d, s.avg_monthly_claims)
        if vol_factor >= 3 and s.monthly_claims_30d >= 30:
            findings.append(MonitorFinding(
                provider_id=s.provider_id,
                severity="critical" if vol_factor >= 5 else "warn",
                code="BILLING_VOLUME_SPIKE",
                label=f"Claim volume is {vol_factor:.1f}× provider's monthly average",
                detail=f"Last 30d: {s.monthly_claims_30d} claims vs avg {s.avg_monthly_claims:.0f}/month.",
            ))

        # Charge spike
        charge_factor = _spike_factor(s.avg_claim_charge_30d_cents, s.avg_claim_charge_cents)
        if charge_factor >= 2.5:
            findings.append(MonitorFinding(
                provider_id=s.provider_id,
                severity="warn",
                code="CHARGE_SPIKE",
                label=f"Average claim charge is {charge_factor:.1f}× the provider's baseline",
                detail=f"Last 30d avg: ${s.avg_claim_charge_30d_cents/100:,.2f} vs baseline ${s.avg_claim_charge_cents/100:,.2f}.",
            ))

        # Distinct patients drop (potential identity/duplicate billing)
        if s.avg_distinct_patients_per_month > 30 and s.distinct_patients_30d < s.avg_distinct_patients_per_month * 0.3:
            findings.append(MonitorFinding(
                provider_id=s.provider_id,
                severity="warn",
                code="PATIENT_DIVERSITY_DROP",
                label="Sharp drop in distinct patients while billing continues",
                detail=(f"30d distinct patients: {s.distinct_patients_30d} vs baseline "
                        f"{s.avg_distinct_patients_per_month:.0f}/month. Check for repeated billing on a few patients."),
            ))

    return MonitorResponse(engine_version=ENGINE_VERSION, findings=findings)
