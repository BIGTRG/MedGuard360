"""
crisis-detector — fine-tuning pipeline.

Fine-tunes a RoBERTa classifier on crisis-language vs neutral text. Output
swaps in as the headline scorer; the pattern-based detector in app/detector.py
stays as a high-recall safety net.

Real data: clinical notes annotated by trained reviewers, supplemented with
public corpora like CLEFT2023 / SI Reddit corpus (with proper IRB approval).

Usage:
    python train.py                              # synthetic
    python train.py --csv crisis_labeled.csv     # your data
    CRISIS_MODEL_PATH=./models/crisis_v1 uvicorn app.main:app
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np


CATEGORIES = [
    "none", "suicidal_ideation", "self_harm", "homicidal_ideation",
    "substance_overdose", "domestic_violence", "child_abuse", "severe_psychosis",
]

# (text, category) seed pairs we expand for synthetic training
SEEDS = [
    ("Patient denies SI/HI, sleeping well, eating well.", "none"),
    ("Vitals stable, follow-up in 3 months.", "none"),
    ("Patient reports occasional sadness without ideation.", "none"),
    ("I have a plan to end my life.", "suicidal_ideation"),
    ("I want to kill myself.", "suicidal_ideation"),
    ("I'm cutting myself to cope.", "self_harm"),
    ("I burned my arm last night.", "self_harm"),
    ("I want to hurt my neighbor.", "homicidal_ideation"),
    ("Took 30 pills of acetaminophen this morning.", "substance_overdose"),
    ("My husband hit me last night.", "domestic_violence"),
    ("I hit my child when I was angry.", "child_abuse"),
    ("The voices are telling me to do things.", "severe_psychosis"),
]


def synthetic_dataset(n: int = 8000, seed: int = 42):
    rng = np.random.default_rng(seed)
    texts, labels = [], []
    for _ in range(n):
        idx = rng.integers(0, len(SEEDS))
        t, c = SEEDS[idx]
        # Slight paraphrasing via prefix/suffix to add variety
        if rng.random() < 0.3:
            t = "Per patient: " + t
        if rng.random() < 0.3:
            t = t + " Plan documented."
        texts.append(t)
        labels.append(CATEGORIES.index(c))
    return texts, np.array(labels)


def load_csv(path: str):
    import csv
    texts, labels = [], []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["category"] not in CATEGORIES:
                continue
            texts.append(row["text"])
            labels.append(CATEGORIES.index(row["category"]))
    return texts, np.array(labels)


def train(texts: list[str], labels: np.ndarray, out_dir: Path) -> None:
    try:
        from transformers import (
            AutoTokenizer, AutoModelForSequenceClassification,
            Trainer, TrainingArguments,
        )
        import torch
        from torch.utils.data import Dataset
    except ImportError:
        raise SystemExit("Install: pip install transformers torch")

    base = "roberta-base"
    print(f"Loading {base}...")
    tokenizer = AutoTokenizer.from_pretrained(base)
    model = AutoModelForSequenceClassification.from_pretrained(
        base, num_labels=len(CATEGORIES),
    )

    class CrisisDataset(Dataset):
        def __init__(self, texts, labels):
            self.enc = tokenizer(texts, truncation=True, padding="max_length",
                                  max_length=128, return_tensors="pt")
            self.labels = torch.tensor(labels, dtype=torch.long)
        def __len__(self): return len(self.labels)
        def __getitem__(self, i):
            return {**{k: v[i] for k, v in self.enc.items()}, "labels": self.labels[i]}

    # 80/20 split
    n = len(texts)
    perm = np.random.default_rng(42).permutation(n)
    split = int(n * 0.8)
    train_ds = CrisisDataset([texts[i] for i in perm[:split]], labels[perm[:split]])
    eval_ds  = CrisisDataset([texts[i] for i in perm[split:]], labels[perm[split:]])

    out_dir.mkdir(parents=True, exist_ok=True)
    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=str(out_dir),
            per_device_train_batch_size=16,
            per_device_eval_batch_size=32,
            num_train_epochs=int(__import__("os").environ.get("CRISIS_EPOCHS", "2")),
            evaluation_strategy="epoch",
            logging_steps=50,
            save_strategy="epoch",
            load_best_model_at_end=True,
        ),
        train_dataset=train_ds, eval_dataset=eval_ds,
    )
    trainer.train()
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))

    print(f"\n✅ Saved fine-tuned model → {out_dir}")
    print(f"Categories ({len(CATEGORIES)}): {', '.join(CATEGORIES)}")
    print(f"Set CRISIS_MODEL_PATH={out_dir} to serve it.")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--csv", help="CSV with columns: text,category")
    p.add_argument("--out", default="models/crisis_v1")
    args = p.parse_args()
    texts, labels = (load_csv(args.csv) if args.csv else synthetic_dataset())
    train(texts, labels, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
