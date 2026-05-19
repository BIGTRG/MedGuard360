"""
pa-nlp-matcher — fine-tuning pipeline.

Fine-tunes a sentence-transformer on (clinical_text, criterion_text, label)
triples where label ∈ {met, not_met, indeterminate}. The base model is
`sentence-transformers/all-MiniLM-L6-v2`; clinical accuracy improves a lot if
you start from a clinical-domain base like `pritamdeka/S-BioBert-snli-multinli-stsb`.

Real-data source: pa_criterion_evaluations rows where a human reviewer's
final decision agrees / disagrees with the AI status. Disagreements are
gold-standard negatives.

Usage:
    python train.py                                    # synthetic
    python train.py --csv pa_eval_pairs.csv            # your data
    PA_NLP_MODEL=./models/pa_v1 uvicorn app.main:app   # serve trained model
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np


def synthetic_pairs(n: int = 5000, seed: int = 42) -> list[tuple[str, str, float]]:
    """Generate (clinical_text, criterion_text, similarity_label) triples.

    similarity_label is the supervised signal: 1.0 for met, 0.5 for indeterminate,
    0.0 for not_met. sentence-transformers fine-tunes on cosine similarity.
    """
    rng = np.random.default_rng(seed)
    template_pairs = [
        ("Patient with documented major depressive disorder; PHQ-9 score 18 indicates moderately severe symptoms.",
         "Documented diagnosis of major depressive disorder with PHQ-9 ≥ 10.", 1.0),
        ("Patient failed two SSRIs over the past 14 weeks: sertraline 100mg and escitalopram 20mg.",
         "Patient must have failed first-line therapy for at least 30 days.", 1.0),
        ("Vitals stable; patient denies any current symptoms.",
         "Patient must have failed first-line therapy for at least 30 days.", 0.0),
        ("Patient reports occasional headaches; no neuro findings.",
         "Documented diagnosis of refractory migraine.", 0.5),
        ("CPAP titration study completed at sleep center; AHI 24 events/hour.",
         "Polysomnography confirming OSA with AHI ≥ 15.", 1.0),
        ("Patient declined sleep study citing cost.",
         "Polysomnography confirming OSA with AHI ≥ 15.", 0.0),
        ("Type 2 diabetes well controlled, HbA1c 6.8% on metformin.",
         "Documented uncontrolled diabetes (HbA1c > 9.0%).", 0.0),
        ("HbA1c trending: 8.9 → 9.4 → 10.2 over last three measurements.",
         "Documented uncontrolled diabetes (HbA1c > 9.0%).", 1.0),
    ]
    triples = []
    for _ in range(n):
        idx = rng.integers(0, len(template_pairs))
        a, b, label = template_pairs[idx]
        # Add a little jitter to texts
        triples.append((a, b, float(label)))
    return triples


def load_csv(path: str) -> list[tuple[str, str, float]]:
    import csv
    out = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            out.append((row["clinical_text"], row["criterion_text"], float(row["label"])))
    return out


def train(triples: list[tuple[str, str, float]], out_dir: Path) -> None:
    try:
        from sentence_transformers import SentenceTransformer, losses, InputExample
        from torch.utils.data import DataLoader
    except ImportError:
        raise SystemExit(
            "Install training deps: pip install sentence-transformers torch"
        )

    base = os.environ.get("PA_NLP_BASE_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    print(f"Loading base model: {base}")
    model = SentenceTransformer(base)

    examples = [InputExample(texts=[t[0], t[1]], label=t[2]) for t in triples]
    loader = DataLoader(examples, batch_size=16, shuffle=True)
    loss = losses.CosineSimilarityLoss(model)

    epochs = int(os.environ.get("PA_NLP_EPOCHS", "1"))
    print(f"Fine-tuning {len(examples):,} pairs for {epochs} epochs.")
    model.fit(train_objectives=[(loader, loss)], epochs=epochs, show_progress_bar=True)

    out_dir.mkdir(parents=True, exist_ok=True)
    model.save(str(out_dir))
    print(f"\n✅ Saved fine-tuned model → {out_dir}")
    print(f"Set PA_NLP_MODEL={out_dir} to serve it.")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--csv", help="CSV with columns clinical_text,criterion_text,label")
    p.add_argument("--out", default="models/pa_v1")
    args = p.parse_args()
    data = load_csv(args.csv) if args.csv else synthetic_pairs()
    train(data, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
