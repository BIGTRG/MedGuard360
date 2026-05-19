"""
fraud-detection — training pipeline.

Trains an Isolation Forest + XGBoost stacked model on (claim features → label).
Real deployment: labels come from confirmed-fraud + cleared cases out of the
`fraud_cases` table. For initial bootstrap we synthesize a dataset that lets
the pipeline complete end-to-end and ships a model file the inference can load.

Usage:
    cd ai-engines/fraud-detection
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python train.py                          # uses synthetic data
    python train.py --csv claims_labeled.csv # uses your CSV

The output `models/fraud_v1.joblib` is what `app/scorer.py` loads when
`MODEL_PATH=models/fraud_v1.joblib` is set in the environment.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
import xgboost as xgb


# 14-dim feature vector matching ClaimFeatures in app/schemas.py
FEATURE_NAMES = [
    "total_charge_cents", "line_count", "avg_line_charge_cents",
    "provider_claims_last_24h", "provider_claims_last_7d",
    "provider_avg_charge_30d_cents", "patient_claims_last_30d",
    "distance_provider_to_patient_miles", "submitted_at_hour",
    "submitted_at_weekday", "service_code_count", "diagnosis_code_count",
    "modifier_count", "off_hours_flag",
]


def synthetic_dataset(n_samples: int = 20000, fraud_rate: float = 0.08, seed: int = 42):
    """Generate labelled features matching the production schema."""
    rng = np.random.default_rng(seed)
    n_fraud = int(n_samples * fraud_rate)
    n_clean = n_samples - n_fraud

    # Clean claims: tight distributions, business hours, sensible charges
    clean = np.column_stack([
        rng.lognormal(mean=9.0, sigma=0.6, size=n_clean),         # total_charge_cents
        rng.integers(1, 8, n_clean),                               # line_count
        rng.lognormal(mean=8.5, sigma=0.5, size=n_clean),         # avg_line_charge_cents
        rng.poisson(15, n_clean),                                  # provider_claims_24h
        rng.poisson(80, n_clean),                                  # provider_claims_7d
        rng.lognormal(mean=9.0, sigma=0.4, size=n_clean),         # provider_avg_charge_30d_cents
        rng.poisson(3, n_clean),                                   # patient_claims_30d
        rng.exponential(15, n_clean).clip(0, 500),                 # distance miles
        rng.integers(8, 18, n_clean),                              # hour (business hours)
        rng.integers(0, 5, n_clean),                               # weekday (mon-fri)
        rng.integers(1, 5, n_clean),                               # service_code_count
        rng.integers(1, 4, n_clean),                               # diagnosis_code_count
        rng.integers(0, 3, n_clean),                               # modifier_count
        np.zeros(n_clean),                                          # off_hours_flag
    ])

    # Fraud claims: at least one anomaly factor each (charge spike, volume
    # spike, off-hours, distance anomaly, modifier stacking)
    fraud = np.column_stack([
        rng.lognormal(mean=10.5, sigma=1.2, size=n_fraud),        # high charge
        rng.integers(1, 15, n_fraud),
        rng.lognormal(mean=9.5, sigma=1.0, size=n_fraud),
        rng.integers(100, 500, n_fraud),                          # unusual volume
        rng.integers(200, 800, n_fraud),
        rng.lognormal(mean=8.5, sigma=0.4, size=n_fraud),
        rng.integers(20, 80, n_fraud),                            # patient overutilization
        rng.choice([5, 10, 700, 1500], n_fraud),                  # distance anomalies
        rng.integers(0, 24, n_fraud),
        rng.integers(0, 7, n_fraud),
        rng.integers(1, 8, n_fraud),
        rng.integers(1, 8, n_fraud),
        rng.integers(0, 6, n_fraud),                              # modifier stacking
        rng.choice([0, 1], n_fraud, p=[0.5, 0.5]),
    ])

    X = np.vstack([clean, fraud])
    y = np.concatenate([np.zeros(n_clean), np.ones(n_fraud)]).astype(int)
    order = rng.permutation(len(X))
    return X[order], y[order]


def load_csv(path: str):
    import pandas as pd
    df = pd.read_csv(path)
    missing = set(FEATURE_NAMES) - set(df.columns)
    if missing:
        raise SystemExit(f"CSV missing columns: {sorted(missing)}")
    if "is_fraud" not in df.columns:
        raise SystemExit("CSV must include an 'is_fraud' column with 0/1 labels")
    return df[FEATURE_NAMES].to_numpy(), df["is_fraud"].astype(int).to_numpy()


def train(X, y, out_path: Path) -> None:
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print(f"Training on {len(Xtr):,} examples ({ytr.mean():.1%} fraud).")

    # Layer 1: Isolation Forest — unsupervised anomaly score (catches new patterns)
    iforest = IsolationForest(
        n_estimators=200, contamination=float(ytr.mean()),
        max_samples="auto", random_state=42, n_jobs=-1,
    )
    iforest.fit(Xtr)
    iforest_train = -iforest.score_samples(Xtr).reshape(-1, 1)   # higher = more anomalous
    iforest_test  = -iforest.score_samples(Xte).reshape(-1, 1)

    # Layer 2: XGBoost on (features + iforest score) — supervised, catches known patterns
    Xtr_aug = np.hstack([Xtr, iforest_train])
    Xte_aug = np.hstack([Xte, iforest_test])
    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.1,
        scale_pos_weight=(1 - ytr.mean()) / max(ytr.mean(), 0.001),
        eval_metric="aucpr", n_jobs=-1, random_state=42,
    )
    model.fit(Xtr_aug, ytr, eval_set=[(Xte_aug, yte)], verbose=False)

    proba = model.predict_proba(Xte_aug)[:, 1]
    pred = (proba >= 0.5).astype(int)
    print(f"\nHeld-out ROC-AUC: {roc_auc_score(yte, proba):.4f}")
    print(classification_report(yte, pred, target_names=["clean", "fraud"], digits=3))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "iforest": iforest,
        "xgb": model,
        "feature_names": FEATURE_NAMES,
        "schema_version": 1,
    }, out_path)
    print(f"\n✅ Saved → {out_path}")
    print("Set MODEL_PATH={} to switch the inference engine to this model.".format(out_path))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", help="Labeled training data (with 'is_fraud' column).")
    parser.add_argument("--out", default="models/fraud_v1.joblib")
    parser.add_argument("--samples", type=int, default=20000)
    args = parser.parse_args()

    if args.csv:
        X, y = load_csv(args.csv)
    else:
        print("No --csv provided; generating synthetic dataset.")
        X, y = synthetic_dataset(args.samples)

    train(X, y, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
