"""
fraud-ring-gnn — training pipeline (PyTorch Geometric).

Trains a GraphSAGE-style GNN on labeled fraud-ring graphs. Each node is an
entity (provider, patient, NPI, EIN, address, phone), each edge is a
relationship. Node-level binary classification: is_in_fraud_ring.

For real-world deployment, swap the synthetic graph generator with a
PostgreSQL extraction over confirmed-fraud cases. The schema of the trained
model is stable — `ring_detector.detect()` loads it and uses node embeddings
to score connected components.

Usage:
    pip install torch torch-geometric    # in addition to requirements.txt
    python train.py
    GNN_MODEL_PATH=./models/ring_v1.pt uvicorn app.main:app
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np


def synthetic_graph(n_clean: int = 800, n_ring_members: int = 50, seed: int = 42):
    """Generate a graph where most nodes are clean and some clusters are rings."""
    rng = np.random.default_rng(seed)
    total = n_clean + n_ring_members
    # Node features: 6-dim (volume, charge, distance, age, modifier, off-hours)
    features = rng.normal(size=(total, 6))
    labels = np.zeros(total, dtype=np.int64)
    edges = []

    # Clean nodes — sparse random edges
    for i in range(n_clean):
        for _ in range(rng.integers(1, 4)):
            j = int(rng.integers(0, n_clean))
            if i != j:
                edges.append((i, j))

    # Ring clusters — dense intra-cluster edges, anomalous feature distributions
    ring_start = n_clean
    cluster_size = 5
    for c in range(0, n_ring_members, cluster_size):
        nodes = list(range(ring_start + c, min(ring_start + c + cluster_size, ring_start + n_ring_members)))
        for n in nodes:
            features[n] = rng.normal(loc=2.0, scale=0.5, size=6)  # anomalous
            labels[n] = 1
            for m in nodes:
                if n != m:
                    edges.append((n, m))

    edge_index = np.array(edges, dtype=np.int64).T
    return features, edge_index, labels


def train(features: np.ndarray, edge_index: np.ndarray, labels: np.ndarray, out_path: Path) -> None:
    try:
        import torch
        from torch_geometric.data import Data
        from torch_geometric.nn import SAGEConv
        import torch.nn as nn
        import torch.nn.functional as F
    except ImportError:
        raise SystemExit(
            "Install: pip install torch torch-geometric\n"
            "(torch-geometric needs torch installed first; see PyG docs for CUDA-specific install.)"
        )

    class RingGNN(nn.Module):
        def __init__(self, in_dim: int, hidden: int = 32):
            super().__init__()
            self.conv1 = SAGEConv(in_dim, hidden)
            self.conv2 = SAGEConv(hidden, hidden)
            self.head  = nn.Linear(hidden, 2)
        def forward(self, x, edge_index):
            h = F.relu(self.conv1(x, edge_index))
            h = F.relu(self.conv2(h, edge_index))
            return self.head(h)

    data = Data(
        x=torch.tensor(features, dtype=torch.float),
        edge_index=torch.tensor(edge_index, dtype=torch.long),
        y=torch.tensor(labels, dtype=torch.long),
    )
    model = RingGNN(in_dim=features.shape[1])
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.CrossEntropyLoss()

    print(f"Training GNN on {features.shape[0]:,} nodes, {edge_index.shape[1]:,} edges.")
    for epoch in range(50):
        model.train()
        optimizer.zero_grad()
        logits = model(data.x, data.edge_index)
        loss = loss_fn(logits, data.y)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 10 == 0:
            pred = logits.argmax(dim=1)
            acc = (pred == data.y).float().mean().item()
            print(f"  epoch {epoch+1:3d}  loss {loss.item():.4f}  acc {acc:.3f}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_state": model.state_dict(),
        "in_dim": features.shape[1],
        "schema_version": 1,
    }, out_path)
    print(f"\n✅ Saved → {out_path}")
    print(f"Set GNN_MODEL_PATH={out_path} to serve it.")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="models/ring_v1.pt")
    args = p.parse_args()
    f, e, y = synthetic_graph()
    train(f, e, y, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
