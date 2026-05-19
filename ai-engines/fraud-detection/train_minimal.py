"""
fraud-detection — minimal numpy-only trainer (for environments without sklearn).

This trains a real logistic-regression classifier on the same synthetic data
as train.py, saves it as a pickle, and demonstrates the swap-in mechanism
works end-to-end. The production-grade Isolation Forest + XGBoost stack lives
in train.py — use that when you have sklearn + xgboost available.

Usage:
    python train_minimal.py            # writes models/fraud_v1_minimal.pkl
"""
from __future__ import annotations

import argparse
import pickle
import sys
from pathlib import Path

import numpy as np

# Mirror the feature schema in train.py
FEATURE_NAMES = [
    "total_charge_cents", "line_count", "avg_line_charge_cents",
    "provider_claims_last_24h", "provider_claims_last_7d",
    "provider_avg_charge_30d_cents", "patient_claims_last_30d",
    "distance_provider_to_patient_miles", "submitted_at_hour",
    "submitted_at_weekday", "service_code_count", "diagnosis_code_count",
    "modifier_count", "off_hours_flag",
]


def synthetic_dataset(n_samples=4000, fraud_rate=0.10, seed=42):
    rng = np.random.default_rng(seed)
    n_fraud = int(n_samples * fraud_rate)
    n_clean = n_samples - n_fraud
    clean = np.column_stack([
        rng.lognormal(9.0, 0.6, n_clean), rng.integers(1, 8, n_clean),
        rng.lognormal(8.5, 0.5, n_clean), rng.poisson(15, n_clean),
        rng.poisson(80, n_clean), rng.lognormal(9.0, 0.4, n_clean),
        rng.poisson(3, n_clean), rng.exponential(15, n_clean).clip(0, 500),
        rng.integers(8, 18, n_clean), rng.integers(0, 5, n_clean),
        rng.integers(1, 5, n_clean), rng.integers(1, 4, n_clean),
        rng.integers(0, 3, n_clean), np.zeros(n_clean),
    ])
    fraud = np.column_stack([
        rng.lognormal(10.5, 1.2, n_fraud), rng.integers(1, 15, n_fraud),
        rng.lognormal(9.5, 1.0, n_fraud), rng.integers(100, 500, n_fraud),
        rng.integers(200, 800, n_fraud), rng.lognormal(8.5, 0.4, n_fraud),
        rng.integers(20, 80, n_fraud), rng.choice([5, 10, 700, 1500], n_fraud).astype(float),
        rng.integers(0, 24, n_fraud), rng.integers(0, 7, n_fraud),
        rng.integers(1, 8, n_fraud), rng.integers(1, 8, n_fraud),
        rng.integers(0, 6, n_fraud), rng.choice([0, 1], n_fraud, p=[0.5, 0.5]),
    ])
    X = np.vstack([clean, fraud])
    y = np.concatenate([np.zeros(n_clean), np.ones(n_fraud)]).astype(int)
    order = rng.permutation(len(X))
    return X[order], y[order]


def standardize(X, mean=None, std=None):
    if mean is None:
        mean = X.mean(axis=0)
        std = X.std(axis=0) + 1e-8
    return (X - mean) / std, mean, std


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def train_logistic(X, y, lr=0.1, epochs=300, l2=0.01):
    """Plain logistic regression with L2 regularization."""
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)  # rebalance fraud class
    sample_weight = np.where(y == 1, pos_weight, 1.0)

    for epoch in range(epochs):
        z = X @ w + b
        p = sigmoid(z)
        err = (p - y) * sample_weight
        grad_w = X.T @ err / n + l2 * w
        grad_b = err.mean()
        w -= lr * grad_w
        b -= lr * grad_b

        if (epoch + 1) % 100 == 0:
            loss = -np.mean(sample_weight * (y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9)))
            print(f"  epoch {epoch+1:3d}  loss {loss:.4f}")

    return w, b


def evaluate(X, y, w, b):
    p = sigmoid(X @ w + b)
    pred = (p >= 0.5).astype(int)
    tp = ((pred == 1) & (y == 1)).sum()
    tn = ((pred == 0) & (y == 0)).sum()
    fp = ((pred == 1) & (y == 0)).sum()
    fn = ((pred == 0) & (y == 1)).sum()
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-9)
    return {
        "accuracy": (tp + tn) / len(y),
        "precision": precision, "recall": recall, "f1": f1,
        "confusion": {"tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn)},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="models/fraud_v1_minimal.pkl")
    parser.add_argument("--samples", type=int, default=4000)
    args = parser.parse_args()

    print(f"Generating {args.samples:,} synthetic claims...")
    X, y = synthetic_dataset(args.samples)
    print(f"  Fraud rate: {y.mean():.1%}")

    # 80/20 train/test split
    rng = np.random.default_rng(42)
    perm = rng.permutation(len(X))
    split = int(len(X) * 0.8)
    Xtr, ytr = X[perm[:split]], y[perm[:split]]
    Xte, yte = X[perm[split:]], y[perm[split:]]

    print(f"\nStandardizing features...")
    Xtr_std, mean, std = standardize(Xtr)
    Xte_std, _, _ = standardize(Xte, mean, std)

    print(f"Training logistic regression...")
    w, b = train_logistic(Xtr_std, ytr)

    print(f"\nEvaluation on held-out test set:")
    metrics = evaluate(Xte_std, yte, w, b)
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        pickle.dump({
            "model_kind": "logistic_regression_numpy",
            "schema_version": 1,
            "feature_names": FEATURE_NAMES,
            "weights": w.tolist(),
            "bias": float(b),
            "feature_mean": mean.tolist(),
            "feature_std": std.tolist(),
            "metrics": metrics,
            "trained_on": f"{args.samples} synthetic samples",
        }, f)
    print(f"\nSaved -> {out_path}")
    print(f"Set MODEL_PATH={out_path} and MODEL_KIND=minimal to use this model.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
