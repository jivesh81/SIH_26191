"""
Tests for ML predictive risk layer.
"""

import pytest
import numpy as np
from pathlib import Path

from app.services.data_layer import get_habitations, get_habitation_by_id
from app.services.intelligence import calculate_risk_score, RiskLevel
from app.ml.risk_predictor import RiskPredictor, get_predictor, predict_risk_score, _generate_synthetic_history


class TestMLRiskPredictor:
    """Tests for ML risk prediction."""

    def test_synthetic_data_generation(self):
        """Test that synthetic training data can be generated."""
        X, y = _generate_synthetic_history(n_samples=100, seed=42)

        assert X.shape == (100, 9)
        assert y.shape == (100,)
        assert np.all(y >= 0)
        assert np.all(y <= 3)

    def test_predictor_initialization(self):
        """Test that predictor initializes and trains."""
        predictor = RiskPredictor()
        assert predictor.model is not None
        assert hasattr(predictor, 'model_version')
        assert hasattr(predictor, 'trained_at')

    def test_predict_single_habitation(self):
        """Test prediction for a single habitation."""
        predictor = get_predictor()
        habitations = get_habitations()
        hab = habitations[0]

        risk_level, probs = predictor.predict(hab)

        assert risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE]
        assert isinstance(probs, dict)
        assert set(probs.keys()) == {RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE}
        assert all(0 <= v <= 1 for v in probs.values())
        assert abs(sum(probs.values()) - 1.0) < 0.001

    def test_predict_batch(self):
        """Test batch prediction for all habitations."""
        predictor = get_predictor()
        habitations = get_habitations()

        results = predictor.predict_batch(habitations[:5])

        assert len(results) == 5
        for risk_level, probs in results:
            assert risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE]
            assert isinstance(probs, dict)

    def test_predict_with_weather(self):
        """Test prediction with weather data."""
        predictor = get_predictor()
        habitations = get_habitations()
        hab = habitations[0]

        weather = {
            "rainfall_7d_mm": 150.0,
            "river_level_m": 5.0,
            "soil_moisture_pct": 85.0,
            "antecedent_rainfall_30d_mm": 400.0,
        }

        risk_level, probs = predictor.predict(hab, weather)

        assert risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE]

    def test_predict_risk_score_integration(self):
        """Test integration with deterministic risk engine."""
        habitations = get_habitations()
        hab = habitations[0]

        result = predict_risk_score(hab)

        from app.schemas.domain import RiskAssessmentResponse
        assert isinstance(result, RiskAssessmentResponse)
        assert result.habitation_id == hab.id
        assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE]
        assert "ML prediction" in result.explanation
        assert "Deterministic" in result.explanation
        assert "Final" in result.explanation

    def test_ml_risk_conservative(self):
        """Test that ML risk is used when higher than deterministic (conservative)."""
        predictor = get_predictor()
        habitations = get_habitations()

        for hab in habitations[:5]:
            det = calculate_risk_score(hab)
            ml_risk, _ = predictor.predict(hab)
            result = predict_risk_score(hab)

            # Final should be max of both
            from app.ml.risk_predictor import RISK_TO_IDX
            det_idx = RISK_TO_IDX[det.risk_level]
            ml_idx = RISK_TO_IDX[ml_risk]
            final_idx = RISK_TO_IDX[result.risk_level]
            assert final_idx == max(det_idx, ml_idx)

    def test_model_persistence(self):
        """Test that model is saved and can be loaded."""
        predictor = RiskPredictor()
        version = predictor.model_version
        trained_at = predictor.trained_at

        # Create new predictor - should load existing model
        predictor2 = RiskPredictor()
        assert predictor2.model_version == version
        assert predictor2.trained_at == trained_at