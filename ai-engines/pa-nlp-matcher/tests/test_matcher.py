"""
pytest tests for the pa-nlp-matcher engine.

All tests run with SKIP_WARMUP=1 to force the TF-IDF fallback — no weights
downloaded, no network access required, fast CI.
"""
from __future__ import annotations

import os
import pytest

# Force TF-IDF fallback for all tests
os.environ["SKIP_WARMUP"] = "1"


# --------------------------------------------------------------------------- #
# Fixtures                                                                      #
# --------------------------------------------------------------------------- #

@pytest.fixture(autouse=True)
def reset_model_state():
    """Reset the module-level model cache before each test."""
    import app.matcher as m
    m._loaded_model = None
    m._model_backend = "unloaded"
    yield
    m._loaded_model = None
    m._model_backend = "unloaded"


@pytest.fixture()
def tfidf_model():
    """Return a freshly loaded TF-IDF model."""
    from app.matcher import load_model
    return load_model()


# --------------------------------------------------------------------------- #
# Test 1 — TF-IDF fallback loads and works                                    #
# --------------------------------------------------------------------------- #

def test_tfidf_fallback_loads():
    """With SKIP_WARMUP=1 the TF-IDF backend should be selected."""
    from app.matcher import load_model, _model_backend
    load_model()
    # Re-import module attribute after load
    import app.matcher as m
    assert m._model_backend == "tfidf"
    assert m._loaded_model is not None


def test_tfidf_similarity_returns_float_in_range(tfidf_model):
    """compute_similarity should return a float in [0.0, 1.0]."""
    from app.matcher import compute_similarity
    import app.matcher as m
    m._model_backend = "tfidf"

    score = compute_similarity(
        "Patient has documented hypertension and diabetes.",
        "Hypertension and type 2 diabetes are present.",
        tfidf_model,
    )
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_tfidf_identical_texts_high_similarity(tfidf_model):
    """Identical texts should produce a similarity score close to 1.0."""
    from app.matcher import compute_similarity
    import app.matcher as m
    m._model_backend = "tfidf"

    text = "Patient failed first-line therapy for six weeks before this request."
    score = compute_similarity(text, text, tfidf_model)
    assert score >= 0.95, f"Expected score >= 0.95 for identical texts, got {score}"


def test_tfidf_unrelated_texts_low_similarity(tfidf_model):
    """Completely unrelated texts should produce a low similarity score."""
    from app.matcher import compute_similarity
    import app.matcher as m
    m._model_backend = "tfidf"

    score = compute_similarity(
        "Patient has stage 3 chronic kidney disease.",
        "The weather forecast calls for rain on Tuesday.",
        tfidf_model,
    )
    assert score < 0.4, f"Expected low similarity for unrelated texts, got {score}"


# --------------------------------------------------------------------------- #
# Test 2 — Outcome threshold logic (met / not_met / indeterminate)             #
# --------------------------------------------------------------------------- #

def test_met_outcome_when_above_threshold():
    """When similarity >= threshold_met, outcome should be 'met'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    load_model()

    # Use very similar clinical text and criterion to get a high TF-IDF score
    req = MatchRequest(
        clinical_text=(
            "Patient has been diagnosed with severe persistent asthma. "
            "Patient requires inhaled corticosteroid therapy daily. "
            "Spirometry confirms FEV1 below 60% predicted."
        ),
        criteria=[
            "Patient must have severe persistent asthma requiring inhaled corticosteroid therapy."
        ],
        threshold_met=0.01,   # very low threshold so TF-IDF can clear it
        threshold_not_met=0.001,
    )
    response = match_criteria(req)
    assert len(response.criterion_matches) == 1
    match = response.criterion_matches[0]
    assert match.outcome.value == "met", (
        f"Expected 'met', got '{match.outcome.value}' "
        f"(score={match.similarity_score}, threshold={req.threshold_met})"
    )


def test_not_met_outcome_when_below_threshold():
    """When similarity <= threshold_not_met, outcome should be 'not_met'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    load_model()

    req = MatchRequest(
        clinical_text="Patient is in good general health with no chronic conditions.",
        criteria=["Patient must have documented end-stage renal disease requiring dialysis."],
        threshold_met=0.99,     # near-perfect match required → will be not_met
        threshold_not_met=0.95, # anything below 0.95 is not_met
    )
    response = match_criteria(req)
    match = response.criterion_matches[0]
    assert match.outcome.value == "not_met", (
        f"Expected 'not_met', got '{match.outcome.value}' (score={match.similarity_score})"
    )


def test_indeterminate_outcome_between_thresholds():
    """When similarity falls between thresholds, outcome should be 'indeterminate'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    load_model()

    # Force a specific similarity score using a mock
    import numpy as np

    class _FakeTFIDF:
        """Returns a fixed similarity matrix regardless of input."""
        def __init__(self, score: float):
            self._score = score

        def fit_transform(self, texts):
            return None  # not used directly

    original_batch = m._batch_tfidf_similarity

    def _mock_batch(q, d, model):
        return np.full((len(q), len(d)), 0.50)

    m._batch_tfidf_similarity = _mock_batch
    try:
        req = MatchRequest(
            clinical_text="Some clinical note here.",
            criteria=["Some criterion here."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        match = response.criterion_matches[0]
        assert match.outcome.value == "indeterminate", (
            f"Expected 'indeterminate', got '{match.outcome.value}'"
        )
    finally:
        m._batch_tfidf_similarity = original_batch


# --------------------------------------------------------------------------- #
# Test 3 — Overall recommendation logic                                        #
# --------------------------------------------------------------------------- #

def test_overall_approve_when_all_criteria_met():
    """All criteria met → overall_recommendation = 'approve'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    import numpy as np

    load_model()

    original_batch = m._batch_tfidf_similarity

    def _mock_high(q, d, model):
        return np.full((len(q), len(d)), 0.95)  # all above threshold_met=0.70

    m._batch_tfidf_similarity = _mock_high
    try:
        req = MatchRequest(
            clinical_text="Comprehensive clinical documentation.",
            criteria=["Criterion A.", "Criterion B.", "Criterion C."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        assert response.overall_recommendation == "approve"
        assert all(m.outcome.value == "met" for m in response.criterion_matches)
    finally:
        m._batch_tfidf_similarity = original_batch


def test_overall_deny_when_any_criterion_not_met():
    """Any not_met criterion → overall_recommendation = 'deny'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    import numpy as np

    load_model()

    call_count = [0]
    original_batch = m._batch_tfidf_similarity

    def _mock_mixed(q, d, model):
        # First criterion sentence gets high score, rest get very low
        result = np.full((len(q), len(d)), 0.95)
        if len(q) > 1:
            result[1:, :] = 0.05  # second criterion and beyond → not_met
        return result

    m._batch_tfidf_similarity = _mock_mixed
    try:
        req = MatchRequest(
            clinical_text="Partial clinical documentation.",
            criteria=["Criterion A — documented.", "Criterion B — not in notes."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        assert response.overall_recommendation == "deny"
    finally:
        m._batch_tfidf_similarity = original_batch


def test_overall_needs_more_info_with_indeterminate():
    """Mix of met and indeterminate → overall_recommendation = 'needs_more_info'."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    import numpy as np

    load_model()

    original_batch = m._batch_tfidf_similarity

    def _mock_indeterminate(q, d, model):
        result = np.full((len(q), len(d)), 0.50)  # all indeterminate
        if len(q) > 0:
            result[0, :] = 0.90  # first criterion is met
        return result

    m._batch_tfidf_similarity = _mock_indeterminate
    try:
        req = MatchRequest(
            clinical_text="Some notes.",
            criteria=["Criterion A.", "Criterion B."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        assert response.overall_recommendation == "needs_more_info"
    finally:
        m._batch_tfidf_similarity = original_batch


# --------------------------------------------------------------------------- #
# Test 4 — requires_human_review is ALWAYS True                                #
# --------------------------------------------------------------------------- #

def test_requires_human_review_always_true_approve():
    """Even when recommendation is 'approve', requires_human_review must be True."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    import numpy as np

    load_model()

    original_batch = m._batch_tfidf_similarity

    def _mock_all_met(q, d, model):
        return np.full((len(q), len(d)), 0.99)

    m._batch_tfidf_similarity = _mock_all_met
    try:
        req = MatchRequest(
            clinical_text="Complete documentation.",
            criteria=["Every criterion is met."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        assert response.requires_human_review is True, (
            "requires_human_review must always be True per AI governance policy."
        )
    finally:
        m._batch_tfidf_similarity = original_batch


def test_requires_human_review_always_true_deny():
    """When recommendation is 'deny', requires_human_review must still be True."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model
    import app.matcher as m
    import numpy as np

    load_model()

    original_batch = m._batch_tfidf_similarity

    def _mock_all_not_met(q, d, model):
        return np.full((len(q), len(d)), 0.01)

    m._batch_tfidf_similarity = _mock_all_not_met
    try:
        req = MatchRequest(
            clinical_text="Irrelevant clinical note.",
            criteria=["Critical unmet criterion."],
            threshold_met=0.70,
            threshold_not_met=0.30,
        )
        response = match_criteria(req)
        assert response.requires_human_review is True


    finally:
        m._batch_tfidf_similarity = original_batch


def test_requires_human_review_always_true_no_clinical_text():
    """With no clinical text, outcome is needs_more_info but requires_human_review is still True."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model

    load_model()

    req = MatchRequest(
        clinical_text="",
        criteria=["Patient must have documented COPD."],
        threshold_met=0.70,
        threshold_not_met=0.30,
    )
    response = match_criteria(req)
    assert response.requires_human_review is True
    assert response.overall_recommendation == "needs_more_info"


# --------------------------------------------------------------------------- #
# Test 5 — Empty criteria list is handled gracefully                           #
# --------------------------------------------------------------------------- #

def test_empty_criteria_list():
    """An empty criteria list should return needs_more_info without errors."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model

    load_model()

    req = MatchRequest(
        clinical_text="Patient has hypertension.",
        criteria=[],
    )
    response = match_criteria(req)
    assert response.overall_recommendation == "needs_more_info"
    assert response.criterion_matches == []
    assert response.requires_human_review is True


# --------------------------------------------------------------------------- #
# Test 6 — model_used reflects backend                                         #
# --------------------------------------------------------------------------- #

def test_model_used_contains_tfidf():
    """model_used field should include 'tfidf' when using the fallback backend."""
    from app.models import MatchRequest
    from app.matcher import match_criteria, load_model

    load_model()

    req = MatchRequest(
        clinical_text="Patient has well-controlled type 2 diabetes.",
        criteria=["Patient must have diabetes mellitus."],
    )
    response = match_criteria(req)
    assert "tfidf" in response.model_used.lower(), (
        f"Expected 'tfidf' in model_used, got: {response.model_used}"
    )
