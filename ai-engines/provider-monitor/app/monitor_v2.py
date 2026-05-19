"""
Provider monitoring rules engine (v2 — uses models.py schema).

Runs monthly checks on individual provider records:
  1. License expiry: warn at 90 days, critical at 30 days
  2. DEA expiry: same thresholds
  3. Malpractice expiry: warn at 60 days, critical at 14 days
  4. LEIE/PECOS check overdue: flag if last check > 30 days ago
  5. Billing spike: flag if monthly_claim_count > 150% of prior month
  6. High volume: flag if monthly_claim_count > 200
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List

from .models import ProviderMonitorRequest, MonitorResult, MonitorAlert

MODEL_VERSION = "provider-monitor-v2.0"


def monitor_provider(request: ProviderMonitorRequest) -> MonitorResult:
    """
    Run monthly monitoring checks against a single provider snapshot.

    Returns a MonitorResult with all triggered alerts, an overall risk level,
    a billing anomaly score (0-100), and the next scheduled check date.
    All consequential findings route to human review before any provider action.
    """
    alerts: List[MonitorAlert] = []
    today = date.today()

    # ------------------------------------------------------------------ #
    # Helper: credential expiry checks                                     #
    # ------------------------------------------------------------------ #
    def check_expiry(
        expiry_str: str | None,
        doc_type: str,
        warn_days: int,
        crit_days: int,
    ) -> None:
        if not expiry_str:
            return
        try:
            expiry = datetime.strptime(expiry_str, "%Y-%m-%d").date()
        except ValueError:
            return
        days_left = (expiry - today).days

        if days_left < 0:
            alerts.append(
                MonitorAlert(
                    alert_type="expiring_credential",
                    severity="critical",
                    description=f"{doc_type} expired {abs(days_left)} day(s) ago (expired {expiry_str})",
                    days_until_expiry=days_left,
                    recommended_action=f"Immediately suspend billing until {doc_type} is renewed",
                )
            )
        elif days_left <= crit_days:
            alerts.append(
                MonitorAlert(
                    alert_type="expiring_credential",
                    severity="critical",
                    description=f"{doc_type} expires in {days_left} day(s) on {expiry_str}",
                    days_until_expiry=days_left,
                    recommended_action=f"Renew {doc_type} immediately — billing will be suspended at expiry",
                )
            )
        elif days_left <= warn_days:
            alerts.append(
                MonitorAlert(
                    alert_type="expiring_credential",
                    severity="warning",
                    description=f"{doc_type} expires in {days_left} day(s) on {expiry_str}",
                    days_until_expiry=days_left,
                    recommended_action=f"Schedule renewal of {doc_type} within the next {days_left} days",
                )
            )

    # ------------------------------------------------------------------ #
    # 1. Credential expiry checks                                          #
    # ------------------------------------------------------------------ #
    check_expiry(request.license_expiry_date, "Medical License", warn_days=90, crit_days=30)
    check_expiry(request.dea_expiry_date, "DEA Certificate", warn_days=90, crit_days=30)
    check_expiry(request.malpractice_expiry_date, "Malpractice Insurance", warn_days=60, crit_days=14)

    # ------------------------------------------------------------------ #
    # 2. LEIE exclusion check overdue (> 30 days)                         #
    # ------------------------------------------------------------------ #
    if request.last_leie_check:
        try:
            last_check = datetime.strptime(request.last_leie_check, "%Y-%m-%d").date()
            age_days = (today - last_check).days
            if age_days > 30:
                alerts.append(
                    MonitorAlert(
                        alert_type="exclusion_check_overdue",
                        severity="warning",
                        description=(
                            f"LEIE exclusion check last run {age_days} days ago "
                            f"(last: {request.last_leie_check})"
                        ),
                        recommended_action=(
                            "Run LEIE and SAM.gov exclusion check immediately — "
                            "42 CFR Part 455 requires monthly screening"
                        ),
                    )
                )
        except ValueError:
            pass

    # ------------------------------------------------------------------ #
    # 3. PECOS enrollment check overdue (> 30 days)                       #
    # ------------------------------------------------------------------ #
    if request.last_pecos_check:
        try:
            last_check = datetime.strptime(request.last_pecos_check, "%Y-%m-%d").date()
            age_days = (today - last_check).days
            if age_days > 30:
                alerts.append(
                    MonitorAlert(
                        alert_type="exclusion_check_overdue",
                        severity="warning",
                        description=(
                            f"PECOS enrollment check last run {age_days} days ago "
                            f"(last: {request.last_pecos_check})"
                        ),
                        recommended_action=(
                            "Verify PECOS enrollment status immediately"
                        ),
                    )
                )
        except ValueError:
            pass

    # ------------------------------------------------------------------ #
    # 4. Billing spike: > 150% of prior month                             #
    # ------------------------------------------------------------------ #
    billing_anomaly_score = 0.0

    if request.prior_month_claim_count > 0:
        growth = request.monthly_claim_count / request.prior_month_claim_count
        if growth > 1.5:
            billing_anomaly_score = round(min(100.0, (growth - 1.0) * 60), 2)
            alerts.append(
                MonitorAlert(
                    alert_type="billing_spike",
                    severity="warning" if growth < 2.0 else "critical",
                    description=(
                        f"Billing volume increased {int((growth - 1) * 100)}% month-over-month "
                        f"({request.prior_month_claim_count} → {request.monthly_claim_count} claims)"
                    ),
                    recommended_action="Review claim patterns for potential billing irregularities",
                )
            )

    # ------------------------------------------------------------------ #
    # 5. High absolute volume: > 200 claims/month                         #
    # ------------------------------------------------------------------ #
    if request.monthly_claim_count > 200:
        billing_anomaly_score = round(max(billing_anomaly_score, 70.0), 2)
        alerts.append(
            MonitorAlert(
                alert_type="high_claim_volume",
                severity="warning",
                description=(
                    f"Provider billed {request.monthly_claim_count} claims this month (threshold: 200)"
                ),
                recommended_action="Initiate utilization review",
            )
        )

    # ------------------------------------------------------------------ #
    # 6. Compute overall risk level and review flag                        #
    # ------------------------------------------------------------------ #
    critical_count = sum(1 for a in alerts if a.severity == "critical")
    warning_count = sum(1 for a in alerts if a.severity == "warning")

    if critical_count > 0:
        overall_risk = "high"
        requires_review = True
    elif warning_count > 1:
        overall_risk = "medium"
        requires_review = True
    else:
        overall_risk = "low"
        requires_review = warning_count > 0  # any single warning still warrants attention

    next_check = (today + timedelta(days=30)).isoformat()

    explanation = (
        f"Monthly monitor for NPI {request.npi}: {len(alerts)} alert(s). "
        + (f"Critical issues: {critical_count}. " if critical_count else "")
        + (f"Warnings: {warning_count}." if warning_count else "No issues found.")
    )

    return MonitorResult(
        provider_id=request.provider_id,
        npi=request.npi,
        overall_risk_level=overall_risk,
        alerts=alerts,
        billing_anomaly_score=billing_anomaly_score,
        explanation=explanation,
        next_check_date=next_check,
        requires_human_review=requires_review,
    )
