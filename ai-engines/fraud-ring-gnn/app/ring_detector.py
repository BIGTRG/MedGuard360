"""
Fraud-ring detection.

The production architecture is a graph neural network (PyTorch Geometric)
trained on labeled fraud-ring data. The detection signal is "this node's
embedding clusters with other suspicious nodes via shared attributes."

For dev / cold-start we ship a NetworkX-based detector that:
  1. Treats shared phone/address/bank as strong-tie edges
  2. Finds connected components of strong-tie edges with size >= min_ring_size
  3. Scores each component by:
       - how many distinct attribute types they share
       - how dense the billing graph is between the providers/patients in the ring
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable

import networkx as nx

from .schemas import DetectedRing, DetectResponse, EdgeInput, NodeInput

ENGINE_VERSION = "fraud-ring-gnn/0.1.0-networkx"

STRONG_TIE_RELATIONS = {
    "lives_at", "shares_address",      # shared physical location
    "phone_for", "shares_phone",        # shared phone number
    "shared_bank", "shared_account",    # shared bank account
    "shared_ein", "shared_npi",         # entity sharing
}


def detect(nodes: list[NodeInput], edges: list[EdgeInput], min_ring_size: int) -> DetectResponse:
    G = nx.Graph()
    node_type: dict[str, str] = {}
    for n in nodes:
        G.add_node(n.id)
        node_type[n.id] = n.type

    # Build strong-tie subgraph: a node-node tie inferred via a shared attribute
    # (provider->address<-provider becomes provider-provider strong tie).
    attribute_groups: dict[str, list[str]] = defaultdict(list)  # attribute_id → [entity_ids]
    for e in edges:
        if e.relation in STRONG_TIE_RELATIONS:
            G.add_edge(e.source, e.target, weight=e.weight, relation=e.relation)

        # Aggregate: any entity linked to a shared attribute (address/phone/bank)
        # node gets bucketed with all others linked to the same attribute.
        if node_type.get(e.target) in ("address", "phone", "bank_account", "npi", "ein"):
            attribute_groups[e.target].append(e.source)

    # Infer strong-tie cliques: every pair of entities sharing an attribute is tied
    for attr_id, members in attribute_groups.items():
        if len(members) < 2:
            continue
        attr_type = node_type.get(attr_id, "attribute")
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                G.add_edge(members[i], members[j], shared_via=attr_type, weight=2.0)

    # Restrict to non-attribute entity nodes for ring extraction
    entity_subgraph = G.subgraph([n for n in G.nodes if node_type.get(n) not in ("address","phone","bank_account","npi","ein")])

    rings: list[DetectedRing] = []
    for component in nx.connected_components(entity_subgraph):
        if len(component) < min_ring_size:
            continue
        sub = entity_subgraph.subgraph(component)

        # Score: shared attribute diversity + edge density
        shared_attrs: set[str] = set()
        for _, _, data in sub.edges(data=True):
            sv = data.get("shared_via")
            if sv: shared_attrs.add(sv)

        density = nx.density(sub)
        size_factor = min(1.0, len(component) / 10.0)
        attr_factor = min(1.0, len(shared_attrs) / 3.0)
        suspicion = round(0.4 * density + 0.3 * size_factor + 0.3 * attr_factor, 3)

        explanation = (
            f"Cluster of {len(component)} entities ({', '.join(sorted({node_type.get(n,'?') for n in component}))}) "
            f"sharing {len(shared_attrs)} attribute type(s): {sorted(shared_attrs) or 'none'}. "
            f"Internal edge density: {density:.2f}. "
            f"This is a TRIAGE signal; a fraud investigator must validate before any provider action."
        )

        rings.append(DetectedRing(
            members=sorted(component),
            size=len(component),
            suspicion_score=suspicion,
            shared_attributes=sorted(shared_attrs),
            explanation=explanation,
        ))

    rings.sort(key=lambda r: r.suspicion_score, reverse=True)
    return DetectResponse(
        engine_version=ENGINE_VERSION,
        rings=rings,
        total_nodes=len(nodes),
        total_edges=len(edges),
    )
