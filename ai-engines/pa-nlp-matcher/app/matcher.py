"""
BERT semantic-similarity matcher for prior-authorization criteria.

Approach:
  1. For each criterion text in the request, split it into sentences.
  2. Split the clinical_text into sentences.
  3. Compute the max cosine similarity between any clinical sentence and
     any sentence in the criterion.
  4. Apply per-request thresholds: >= threshold_met → met,
     <= threshold_not_met → not_met, else indeterminate.
  5. Generate a plain-language explanation per criterion.
  6. Aggregate: all met → approve, any not_met → deny, else needs_more_info.
  7. requires_human_review is always True (CLAUDE.md AI governance).

Model loading:
  - Tries sentence_transformers first (all-MiniLM-L6-v2 or MODEL_NAME env var).
  - Falls back to TF-IDF cosine similarity from scikit-learn if
    sentence_transformers is not installed or SKIP_WARMUP=1 is set.
"""
from __future__ import annotations

import os
import re
from typing import List, Optional, Tuple

from .models import (
    CriterionMatch,
    CriterionOutcome,
    MatchRequest,
    MatchResponse,
)

# Default model name — override via MODEL_NAME env var
_DEFAULT_MODEL_NAME = "all-MiniLM-L6-v2"
MODEL_NAME = os.environ.get("MODEL_NAME", _DEFAULT_MODEL_NAME)

# Cached model object (loaded lazily or during lifespan startup)
_loaded_model: Optional[object] = None
_model_backend: str = "unloaded"   # "sentence_transformers" | "tfidf" | "unloaded"


# --------------------------------------------------------------------------- #
# Model loading                                                                 #
# --------------------------------------------------------------------------- #

def load_model() -> object:
    """
    Load the semantic similarity model.

    Primary: sentence_transformers.SentenceTransformer
    Fallback: scikit-learn TF-IDF vectorizer (no download required, no GPU)

    Returns the loaded model object and sets module-level state.
    """
    global _loaded_model, _model_backend

    skip_warmup = os.environ.get("SKIP_WARMUP", "").strip() == "1"
    if skip_warmup:
        # Use TF-IDF fallback — fast, no weights download, suitable for tests
        _loaded_model = _build_tfidf_model()
        _model_backend = "tfidf"
        return _loaded_model

    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model = SentenceTransformer(MODEL_NAME)
        # Warmup pass so first request is fast
        model.encode(["warmup"], convert_to_tensor=False)
        _loaded_model = model
        _model_backend = "sentence_transformers"
        return model
    except (ImportError, Exception):
        # sentence_transformers not installed or model download failed → TF-IDF
        _loaded_model = _build_tfidf_model()
        _model_backend = "tfidf"
        return _loaded_model


def _build_tfidf_model() -> object:
    """Return a lightweight TF-IDF vectorizer fitted on a generic English corpus."""
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    # Return an unfitted vectorizer; we fit it on-the-fly per request.
    return TfidfVectorizer(ngram_range=(1, 2), max_features=8192, sublinear_tf=True)


def _get_model() -> object:
    """Return the currently loaded model, loading it if necessary."""
    global _loaded_model
    if _loaded_model is None:
        load_model()
    return _loaded_model


# --------------------------------------------------------------------------- #
# Text utilities                                                                #
# --------------------------------------------------------------------------- #

def _split_sentences(text: str) -> List[str]:
    """Split text into sentences. Handles clinical note formatting."""
    if not text or not text.strip():
        return []
    # Split on sentence-ending punctuation followed by whitespace or end-of-string
    raw = re.split(r"(?<=[.!?])\s+", text.strip())
    # Also split on newlines (common in clinical notes)
    sentences: List[str] = []
    for chunk in raw:
        sub = [s.strip() for s in chunk.split("\n") if s.strip()]
        sentences.extend(sub)
    return [s for s in sentences if len(s) >= 5]


# --------------------------------------------------------------------------- #
# Similarity computation                                                        #
# --------------------------------------------------------------------------- #

def compute_similarity(text1: str, text2: str, model: object) -> float:
    """Compute cosine similarity between two texts using the loaded model."""
    if _model_backend == "sentence_transformers":
        return _sbert_similarity(text1, text2, model)
    else:
        return _tfidf_similarity(text1, text2, model)


def _sbert_similarity(text1: str, text2: str, model) -> float:
    """SBERT cosine similarity (vectors are L2-normalised so dot = cosine)."""
    import numpy as np
    vectors = model.encode([text1, text2], normalize_embeddings=True, convert_to_tensor=False)
    score = float(np.dot(vectors[0], vectors[1]))
    return max(0.0, min(1.0, score))


def _tfidf_similarity(text1: str, text2: str, model) -> float:
    """TF-IDF cosine similarity via scikit-learn."""
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine  # type: ignore
    import numpy as np

    # Fit the vectorizer on both texts together, then score
    tfidf = model.__class__(**{
        k: v for k, v in model.get_params().items()
    })
    try:
        matrix = tfidf.fit_transform([text1, text2])
        score = float(sk_cosine(matrix[0], matrix[1])[0, 0])
        return max(0.0, min(1.0, score))
    except Exception:
        return 0.0


def _batch_tfidf_similarity(query_texts: List[str], doc_texts: List[str], model) -> "np.ndarray":  # type: ignore
    """
    Compute a (len(query_texts), len(doc_texts)) cosine similarity matrix
    using a fresh TF-IDF vectorizer fitted on all texts at once.
    More efficient than calling compute_similarity in a double loop.
    """
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine  # type: ignore

    all_texts = query_texts + doc_texts
    tfidf = TfidfVectorizer(ngram_range=(1, 2), max_features=8192, sublinear_tf=True)
    try:
        matrix = tfidf.fit_transform(all_texts)
        q_mat = matrix[: len(query_texts)]
        d_mat = matrix[len(query_texts):]
        sim = sk_cosine(q_mat, d_mat)
        return np.clip(sim, 0.0, 1.0)
    except Exception:
        return np.zeros((len(query_texts), len(doc_texts)))


def _batch_sbert_similarity(query_texts: List[str], doc_texts: List[str], model) -> "np.ndarray":  # type: ignore
    """
    Compute a (len(query_texts), len(doc_texts)) cosine similarity matrix
    using a SBERT model — a single encode call for all texts.
    """
    import numpy as np
    all_texts = query_texts + doc_texts
    vectors = model.encode(all_texts, normalize_embeddings=True, convert_to_tensor=False)
    q_vecs = vectors[: len(query_texts)]
    d_vecs = vectors[len(query_texts):]
    sim = q_vecs @ d_vecs.T
    return np.clip(sim, 0.0, 1.0)


# --------------------------------------------------------------------------- #
# Core matching logic                                                           #
# --------------------------------------------------------------------------- #

def match_criteria(request: MatchRequest) -> MatchResponse:
    """
    For each criterion in request.criteria:
      1. Split the criterion into sentences.
      2. Compute max cosine similarity between any clinical sentence and any
         criterion sentence (cross-product).
      3. Apply thresholds (request.threshold_met, request.threshold_not_met).
      4. Generate a plain-language explanation.

    Aggregation:
      - all met                           → approve
      - any not_met                       → deny
      - otherwise (mix of met/indeterminate) → needs_more_info

    requires_human_review is ALWAYS True per CLAUDE.md AI governance policy.
    """
    model = _get_model()
    model_used = f"pa-nlp-matcher/{_model_backend}/{MODEL_NAME}"

    clinical_sentences = _split_sentences(request.clinical_text)

    if not clinical_sentences:
        # No clinical text — everything is indeterminate
        matches = [
            CriterionMatch(
                criterion_text=crit,
                similarity_score=0.0,
                outcome=CriterionOutcome.indeterminate,
                explanation=(
                    "No clinical documentation was provided. Cannot evaluate this criterion. "
                    "Submit clinical notes and resubmit the request."
                ),
            )
            for crit in request.criteria
        ]
        return MatchResponse(
            overall_recommendation="needs_more_info",
            overall_confidence=0.0,
            explanation=(
                "No clinical text provided. All criteria are indeterminate. "
                "A prior authorization specialist must review and request documentation."
            ),
            criterion_matches=matches,
            model_used=model_used,
            requires_human_review=True,
        )

    # Build sentence lists for each criterion
    criterion_sentence_lists: List[List[str]] = []
    for crit in request.criteria:
        sents = _split_sentences(crit)
        if not sents:
            sents = [crit]  # treat entire criterion as one sentence if unsplittable
        criterion_sentence_lists.append(sents)

    # Flatten all criterion sentences with a lookup back to criterion index
    all_crit_sents: List[str] = []
    crit_sent_bounds: List[Tuple[int, int]] = []  # (start, end) index per criterion
    for sents in criterion_sentence_lists:
        start = len(all_crit_sents)
        all_crit_sents.extend(sents)
        crit_sent_bounds.append((start, len(all_crit_sents)))

    # Compute similarity matrix: all_crit_sents × clinical_sentences
    if _model_backend == "sentence_transformers":
        sim_matrix = _batch_sbert_similarity(all_crit_sents, clinical_sentences, model)
    else:
        sim_matrix = _batch_tfidf_similarity(all_crit_sents, clinical_sentences, model)

    # Build per-criterion results
    criterion_matches: List[CriterionMatch] = []
    for idx, crit in enumerate(request.criteria):
        start, end = crit_sent_bounds[idx]
        # Max similarity across all (criterion_sentence, clinical_sentence) pairs
        crit_block = sim_matrix[start:end, :]  # shape: (n_crit_sents, n_clin_sents)
        best_score = float(crit_block.max()) if crit_block.size > 0 else 0.0

        # Determine outcome
        if best_score >= request.threshold_met:
            outcome = CriterionOutcome.met
            explanation = (
                f"Criterion is met (similarity score {best_score:.2f} >= "
                f"threshold {request.threshold_met:.2f}). "
                f"Clinical documentation supports this criterion."
            )
        elif best_score <= request.threshold_not_met:
            outcome = CriterionOutcome.not_met
            explanation = (
                f"Criterion is not met (similarity score {best_score:.2f} <= "
                f"threshold {request.threshold_not_met:.2f}). "
                f"No matching clinical documentation found for this criterion."
            )
        else:
            outcome = CriterionOutcome.indeterminate
            explanation = (
                f"Criterion outcome is indeterminate (similarity score {best_score:.2f}, "
                f"between thresholds {request.threshold_not_met:.2f}–{request.threshold_met:.2f}). "
                f"Partial documentation match detected; specialist review required."
            )

        criterion_matches.append(CriterionMatch(
            criterion_text=crit,
            similarity_score=round(best_score, 4),
            outcome=outcome,
            explanation=explanation,
        ))

    # Aggregate recommendation
    outcomes = [m.outcome for m in criterion_matches]
    n_total = len(outcomes)
    n_met = outcomes.count(CriterionOutcome.met)
    n_not_met = outcomes.count(CriterionOutcome.not_met)

    if n_total == 0:
        overall_recommendation = "needs_more_info"
        overall_confidence = 0.0
    elif n_not_met > 0:
        overall_recommendation = "deny"
        overall_confidence = round(
            sum(m.similarity_score for m in criterion_matches if m.outcome == CriterionOutcome.not_met)
            / n_total,
            4,
        )
    elif n_met == n_total:
        overall_recommendation = "approve"
        overall_confidence = round(
            sum(m.similarity_score for m in criterion_matches) / n_total, 4
        )
    else:
        overall_recommendation = "needs_more_info"
        overall_confidence = round(
            sum(m.similarity_score for m in criterion_matches) / n_total, 4
        )

    # Plain-language overall explanation
    overall_explanation = _build_overall_explanation(
        overall_recommendation, n_total, n_met, n_not_met, overall_confidence
    )

    return MatchResponse(
        overall_recommendation=overall_recommendation,
        overall_confidence=overall_confidence,
        explanation=overall_explanation,
        criterion_matches=criterion_matches,
        model_used=model_used,
        requires_human_review=True,  # ALWAYS — AI governance
    )


def _build_overall_explanation(
    recommendation: str,
    n_total: int,
    n_met: int,
    n_not_met: int,
    confidence: float,
) -> str:
    n_indeterminate = n_total - n_met - n_not_met
    parts = [
        f"Evaluated {n_total} criterion/criteria: "
        f"{n_met} met, {n_not_met} not met, {n_indeterminate} indeterminate "
        f"(overall confidence {confidence:.0%})."
    ]
    if recommendation == "approve":
        parts.append(
            "All criteria are supported by clinical documentation. "
            "AI recommendation: APPROVE."
        )
    elif recommendation == "deny":
        parts.append(
            "One or more required criteria are not supported by the clinical documentation. "
            "AI recommendation: DENY."
        )
    else:
        parts.append(
            "Some criteria could not be conclusively evaluated. "
            "AI recommendation: NEEDS MORE INFORMATION."
        )
    parts.append(
        "Per AI governance policy, final approval or denial MUST be made "
        "by a licensed prior authorization specialist."
    )
    return " ".join(parts)
