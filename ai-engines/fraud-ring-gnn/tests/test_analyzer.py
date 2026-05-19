"""
pytest tests for the fraud-ring-gnn analyzer (heuristic path).

Covers:
  - 2 providers + 5 shared patients → detects ring
  - overall_risk_score > 0 when suspicious nodes exist
  - requires_human_review is always True
  - clean graph (no suspicious providers/patients) → no rings
  - response schema fields present
  - high-volume provider triggers suspicious node detection
"""
from __future__ import annotations

import pytest

from app.analyzer import analyze_ring, MODEL_VERSION
from app.models import (
    ClaimEdge,
    PatientNode,
    ProviderNode,
    RingAnalysisRequest,
    RingAnalysisResponse,
)


# --------------------------------------------------------------------------- #
# Fixtures                                                                      #
# --------------------------------------------------------------------------- #

def _make_request(
    num_providers: int = 2,
    num_patients: int = 5,
    shared: bool = True,
    provider_claim_count: int = 50,
) -> RingAnalysisRequest:
    """Build a synthetic graph with num_providers sharing all num_patients."""
    providers = [
        ProviderNode(
            provider_id=f"PRV-{i}",
            npi=f"111111000{i}",
            state_code="NC",
            monthly_claim_count=provider_claim_count,
            avg_claim_amount=250.0,
        )
        for i in range(num_providers)
    ]
    patients = [
        PatientNode(patient_id=f"PAT-{j}", state_code="NC", monthly_visit_count=2)
        for j in range(num_patients)
    ]
    edges = []
    if shared:
        for provider in providers:
            for patient in patients:
                edges.append(
                    ClaimEdge(
                        provider_id=provider.provider_id,
                        patient_id=patient.patient_id,
                        claim_count=4,
                        total_amount=1000.0,
                        date_range_days=30,
                    )
                )
    return RingAnalysisRequest(
        providers=providers,
        patients=patients,
        edges=edges,
        analysis_period_days=90,
    )


# --------------------------------------------------------------------------- #
# Test 1 — 2 providers + 5 shared patients → ring detected                    #
# --------------------------------------------------------------------------- #

def test_two_providers_five_shared_patients_detects_ring():
    """2 providers billing the same 5 patients → at least one ring found."""
    req = _make_request(num_providers=2, num_patients=5, shared=True)
    result = analyze_ring(req)

    assert isinstance(result, RingAnalysisResponse)
    assert len(result.detected_rings) >= 1, (
        f"Expected at least 1 ring, got {len(result.detected_rings)}"
    )


# --------------------------------------------------------------------------- #
# Test 2 — overall_risk_score > 0 when suspicious nodes present               #
# --------------------------------------------------------------------------- #

def test_overall_risk_score_positive_with_suspicious_nodes():
    """When suspicious providers/patients exist the overall_risk_score must be > 0."""
    req = _make_request(num_providers=2, num_patients=5, shared=True)
    result = analyze_ring(req)

    assert result.overall_risk_score > 0, (
        f"Expected overall_risk_score > 0, got {result.overall_risk_score}"
    )
    assert result.suspicious_node_count > 0, (
        f"Expected suspicious_node_count > 0, got {result.suspicious_node_count}"
    )


# --------------------------------------------------------------------------- #
# Test 3 — requires_human_review is always True                               #
# --------------------------------------------------------------------------- #

def test_requires_human_review_always_true():
    """AI governance: requires_human_review must be True regardless of risk score."""
    for shared in (True, False):
        req = _make_request(shared=shared)
        result = analyze_ring(req)
        assert result.requires_human_review is True, (
            f"requires_human_review was False for shared={shared}"
        )


# --------------------------------------------------------------------------- #
# Test 4 — clean graph → risk score low, 0 suspicious nodes                  #
# --------------------------------------------------------------------------- #

def test_clean_graph_no_sharing_no_suspicious_nodes():
    """Providers with no shared patients and low volumes should produce no rings."""
    providers = [
        ProviderNode(
            provider_id=f"PRV-{i}",
            npi=f"222222000{i}",
            state_code="SC",
            monthly_claim_count=20,
            avg_claim_amount=150.0,
        )
        for i in range(3)
    ]
    patients = [
        PatientNode(patient_id=f"PAT-{j}", state_code="SC", monthly_visit_count=1)
        for j in range(9)
    ]
    # Each provider bills their own exclusive set of 3 patients
    edges = [
        ClaimEdge(
            provider_id=f"PRV-{i}",
            patient_id=f"PAT-{i * 3 + k}",
            claim_count=2,
            total_amount=300.0,
            date_range_days=30,
        )
        for i in range(3)
        for k in range(3)
    ]
    req = RingAnalysisRequest(
        providers=providers, patients=patients, edges=edges, analysis_period_days=30
    )
    result = analyze_ring(req)

    assert result.detected_rings == [], (
        f"Expected no rings for clean graph, got {result.detected_rings}"
    )
    assert result.suspicious_node_count == 0, (
        f"Expected 0 suspicious nodes, got {result.suspicious_node_count}"
    )
    assert result.overall_risk_score == 0.0


# --------------------------------------------------------------------------- #
# Test 5 — high-volume provider triggers suspicious node tracking             #
# --------------------------------------------------------------------------- #

def test_high_volume_provider_flagged():
    """Provider with >150 monthly claims should be flagged as suspicious."""
    req = _make_request(
        num_providers=1,
        num_patients=3,
        shared=True,
        provider_claim_count=200,  # above 150 threshold
    )
    result = analyze_ring(req)

    assert result.suspicious_node_count >= 1, (
        "High-volume provider should produce at least one suspicious node"
    )
    assert result.requires_human_review is True


# --------------------------------------------------------------------------- #
# Test 6 — response schema completeness                                       #
# --------------------------------------------------------------------------- #

def test_response_schema_fields_present():
    """All required response fields are present and correctly typed."""
    req = _make_request()
    result = analyze_ring(req)

    assert isinstance(result.detected_rings, list)
    assert isinstance(result.total_nodes_analyzed, int)
    assert result.total_nodes_analyzed == len(req.providers) + len(req.patients)
    assert isinstance(result.suspicious_node_count, int)
    assert isinstance(result.overall_risk_score, float)
    assert isinstance(result.explanation, str) and len(result.explanation) > 0
    assert result.model_version == MODEL_VERSION


# --------------------------------------------------------------------------- #
# Test 7 — patient shared by many providers flagged                           #
# --------------------------------------------------------------------------- #

def test_patient_shared_by_many_providers_flagged():
    """A patient billed by 6+ providers should appear in suspicious nodes."""
    providers = [
        ProviderNode(
            provider_id=f"PRV-{i}",
            npi=f"333333000{i}",
            state_code="GA",
            monthly_claim_count=30,
            avg_claim_amount=100.0,
        )
        for i in range(8)  # 8 providers all billing the same patient
    ]
    patient = PatientNode(patient_id="PAT-SHARED", state_code="GA", monthly_visit_count=1)
    edges = [
        ClaimEdge(
            provider_id=f"PRV-{i}",
            patient_id="PAT-SHARED",
            claim_count=3,
            total_amount=300.0,
            date_range_days=30,
        )
        for i in range(8)
    ]
    req = RingAnalysisRequest(
        providers=providers, patients=[patient], edges=edges, analysis_period_days=90
    )
    result = analyze_ring(req)

    suspicious_patient_ids = {
        m.node_id
        for ring in result.detected_rings
        for m in ring.members
        if m.node_type == "patient"
    }
    assert "PAT-SHARED" in suspicious_patient_ids, (
        "Patient billed by 8 providers should be flagged in a detected ring"
    )
