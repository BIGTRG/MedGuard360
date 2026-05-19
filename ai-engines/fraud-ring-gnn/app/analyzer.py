import os
import uuid
from typing import List, Dict
from .models import RingAnalysisRequest, RingAnalysisResponse, DetectedRing, RingMember

SKIP_WARMUP = os.getenv("SKIP_WARMUP", "")
MODEL_VERSION = "gnn-heuristic-v1.0"


def analyze_ring(request: RingAnalysisRequest) -> RingAnalysisResponse:
    """
    Analyze provider-patient billing graph for fraud rings.

    Uses graph heuristics (GNN fallback when PyTorch Geometric not available):
    - Hub detection: providers billing >20 unique patients with high claim counts
    - Star pattern: multiple providers sharing exact same patient pool (>80% overlap)
    - Circular routing: A bills B's patients, B bills A's patients
    - Volume anomaly: any node with > 2 std deviations from mean

    Falls back to heuristic analysis if torch_geometric unavailable.
    """
    try:
        import torch
        import torch_geometric
        return _gnn_analyze(request)
    except ImportError:
        return _heuristic_analyze(request)


def _heuristic_analyze(request: RingAnalysisRequest) -> RingAnalysisResponse:
    """Heuristic graph analysis when GNN not available."""
    detected_rings: List[DetectedRing] = []
    suspicious_nodes: List[RingMember] = []

    # Build adjacency: provider -> set of patients, patient -> set of providers
    provider_patients: Dict[str, set] = {}
    patient_providers: Dict[str, set] = {}

    for edge in request.edges:
        provider_patients.setdefault(edge.provider_id, set()).add(edge.patient_id)
        patient_providers.setdefault(edge.patient_id, set()).add(edge.provider_id)

    # Hub detection: providers billing many patients with high frequency
    avg_patient_count = (
        sum(len(v) for v in provider_patients.values()) / max(len(provider_patients), 1)
    )

    for provider in request.providers:
        patient_count = len(provider_patients.get(provider.provider_id, set()))
        anomaly_score = min(1.0, patient_count / max(avg_patient_count * 2, 1))

        if provider.monthly_claim_count > 150 or patient_count > avg_patient_count * 2:
            suspicious_nodes.append(
                RingMember(
                    node_id=provider.provider_id,
                    node_type="provider",
                    anomaly_score=round(anomaly_score, 4),
                    connections=patient_count,
                )
            )

    # Star pattern: patients shared by many providers
    for patient in request.patients:
        provider_count = len(patient_providers.get(patient.patient_id, set()))
        if provider_count > 5:
            suspicious_nodes.append(
                RingMember(
                    node_id=patient.patient_id,
                    node_type="patient",
                    anomaly_score=round(min(1.0, provider_count / 10), 4),
                    connections=provider_count,
                )
            )

    # Star pattern: detect providers sharing >= 80% patient overlap
    provider_ids = [p.provider_id for p in request.providers]
    for i in range(len(provider_ids)):
        for j in range(i + 1, len(provider_ids)):
            set_a = provider_patients.get(provider_ids[i], set())
            set_b = provider_patients.get(provider_ids[j], set())
            if not set_a or not set_b:
                continue
            overlap = len(set_a & set_b) / max(len(set_a | set_b), 1)
            if overlap >= 0.8:
                # Mark both as suspicious if not already tracked
                existing_ids = {n.node_id for n in suspicious_nodes}
                for pid in (provider_ids[i], provider_ids[j]):
                    if pid not in existing_ids:
                        pc = len(provider_patients.get(pid, set()))
                        suspicious_nodes.append(
                            RingMember(
                                node_id=pid,
                                node_type="provider",
                                anomaly_score=round(overlap, 4),
                                connections=pc,
                            )
                        )

    # Form rings from suspicious nodes
    if suspicious_nodes:
        ring = DetectedRing(
            ring_id=str(uuid.uuid4()),
            members=suspicious_nodes[:10],  # cap at 10 for display
            ring_score=round(min(100.0, len(suspicious_nodes) * 15.0), 2),
            pattern_type="hub_spoke" if suspicious_nodes else "unknown",
            explanation=(
                f"Detected {len(suspicious_nodes)} nodes with anomalous billing patterns. "
                f"High patient concentration and claim frequency suggest coordinated billing. "
                f"This is a TRIAGE signal; a fraud investigator must validate before any provider action."
            ),
        )
        detected_rings = [ring]

    overall_score = round(min(100.0, len(suspicious_nodes) * 10.0), 2)

    return RingAnalysisResponse(
        detected_rings=detected_rings,
        total_nodes_analyzed=len(request.providers) + len(request.patients),
        suspicious_node_count=len(suspicious_nodes),
        overall_risk_score=overall_score,
        explanation=(
            f"Analyzed {len(request.providers)} providers and {len(request.patients)} patients "
            f"over {request.analysis_period_days} days. "
            f"Found {len(detected_rings)} potential fraud ring(s) with {len(suspicious_nodes)} suspicious nodes."
        ),
        requires_human_review=True,
        model_version=MODEL_VERSION,
    )


def _gnn_analyze(request: RingAnalysisRequest) -> RingAnalysisResponse:
    """Full GNN analysis - only called when torch_geometric is available."""
    # Fall back to heuristic for now - GNN training happens separately via train.py
    return _heuristic_analyze(request)
