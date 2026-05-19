# fraud-ring-gnn

Fraud-ring / collusion detection. Port **8005**. Called by `fraud-engine-service`
periodically (e.g. nightly) to surface ring patterns invisible to per-claim
scoring.

## Endpoint

`POST /v1/detect` with a graph of entities + edges → returns ranked rings.

Strong-tie relations (shared address, phone, bank, EIN, NPI) are weighted
heavily; everything else is informational.

## Algorithm

1. Build a graph of (provider/patient/facility) × (address/phone/bank/EIN/NPI)
2. Project to entity-entity strong-tie edges via shared attributes
3. Extract connected components ≥ `min_ring_size` (default 3)
4. Score each component on:
   - **Edge density** within the cluster
   - **Number of distinct shared-attribute types**
   - **Cluster size**

## Upgrade path

Swap `ring_detector.detect()` to use PyTorch Geometric GNN node embeddings
trained on labeled rings. Schema unchanged.
