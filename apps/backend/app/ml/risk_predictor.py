"""
Lightweight ML Risk Predictor for Aapda Setu.

Trains a RandomForestClassifier on synthetic historical data generated from
the existing GeoJSON features. Provides probabilistic risk predictions
alongside the deterministic risk engine.
"""

import json
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.services.data_layer import get_habitations, HabitationResponse
from app.services.intelligence import calculate_risk_score, RiskAssessmentResponse, RiskLevel


MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "model.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"


# Risk level encoding
RISK_LEVEL_ORDER = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.RED_ZONE]
RISK_TO_IDX = {level: i for i, level in enumerate(RISK_LEVEL_ORDER)}
IDX_TO_RISK = {i: level for i, level in enumerate(RISK_LEVEL_ORDER)}


def _generate_synthetic_history(n_samples: int = 2000, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic historical training data from current habitations.

    Features (matching deterministic risk factors):
    - vulnerability_score (0-1)
    - max_hazard_exposure (0-1)
    - population_factor (0-1)
    - accessibility_factor (0 or 0.3)
    - priority_factor (0-1)
    - rainfall_7d_mm (0-500)
    - river_level_m (0-10)
    - soil_moisture_pct (0-100)
    - antecedent_rainfall_30d_mm (0-1000)

    Target: risk level (0=LOW, 1=MEDIUM, 2=HIGH, 3=RED_ZONE)
    """
    random.seed(seed)
    np.random.seed(seed)

    habitations = get_habitations()
    if not habitations:
        raise ValueError("No habitations available for training data generation")

    X = []
    y = []

    for _ in range(n_samples):
        hab = random.choice(habitations)

        # Base deterministic factors
        det = calculate_risk_score(hab)
        vuln = hab.vulnerability_score

        flood_exp, erosion_exp, storm_exp = 0.0, 0.0, 0.0
        for hazard in hab.hazard_exposure:
            htype = hazard.get("hazard_type", "").lower()
            severity = hazard.get("severity", "low").lower()
            weight = {"low": 0.2, "medium": 0.5, "high": 0.8, "extreme": 1.0}.get(severity, 0.2)
            if htype == "flood":
                flood_exp = max(flood_exp, weight)
            elif htype == "erosion":
                erosion_exp = max(erosion_exp, weight)
            elif htype == "storm_surge":
                storm_exp = max(storm_exp, weight)
        max_hazard = max(flood_exp, erosion_exp, storm_exp)

        pop_factor = min(1.0, hab.population / 5000.0)
        access_factor = 0.0 if hab.is_accessible else 0.3
        priority_factor = 0.0
        if hab.priority_rank:
            priority_factor = max(0.0, 1.0 - (hab.priority_rank - 1) / 12.0)

        # Weather/antecedent features (synthetic)
        rainfall_7d = np.random.exponential(50)  # mm
        river_level = np.random.uniform(0, 8)  # meters
        soil_moisture = np.random.uniform(20, 95)  # %
        antecedent_30d = np.random.exponential(200)  # mm

        # Add noise to deterministic score to create variation
        base_score = (
            vuln * 0.35 +
            max_hazard * 0.25 +
            pop_factor * 0.15 +
            access_factor * 0.10 +
            priority_factor * 0.15
        )
        # Weather influence
        weather_boost = min(0.3, (rainfall_7d / 500) * 0.15 + (river_level / 10) * 0.1 + (soil_moisture / 100) * 0.05)
        final_score = min(1.0, base_score + weather_boost + np.random.normal(0, 0.05))

        # Determine risk level from final score
        if final_score >= 0.85:
            risk_idx = 3  # RED_ZONE
        elif final_score >= 0.7:
            risk_idx = 2  # HIGH
        elif final_score >= 0.5:
            risk_idx = 1  # MEDIUM
        else:
            risk_idx = 0  # LOW

        X.append([
            vuln,
            max_hazard,
            pop_factor,
            access_factor,
            priority_factor,
            rainfall_7d,
            river_level,
            soil_moisture,
            antecedent_30d,
        ])
        y.append(risk_idx)

    return np.array(X), np.array(y)


class RiskPredictor:
    """ML-based risk prediction using RandomForest."""

    def __init__(self):
        self.model: Optional[RandomForestClassifier] = None
        self.feature_names = [
            "vulnerability_score",
            "max_hazard_exposure",
            "population_factor",
            "accessibility_factor",
            "priority_factor",
            "rainfall_7d_mm",
            "river_level_m",
            "soil_moisture_pct",
            "antecedent_rainfall_30d_mm",
        ]
        self._load_or_train()

    def _load_or_train(self):
        """Load existing model or train new one."""
        if MODEL_PATH.exists():
            self.model = joblib.load(MODEL_PATH)
            with open(METADATA_PATH) as f:
                metadata = json.load(f)
            self.model_version = metadata.get("version", "unknown")
            self.trained_at = metadata.get("trained_at", "unknown")
        else:
            self.train()

    def train(self, n_samples: int = 2000) -> Dict:
        """Train the model on synthetic data."""
        X, y = _generate_synthetic_history(n_samples=n_samples)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        train_acc = self.model.score(X_train, y_train)
        test_acc = self.model.score(X_test, y_test)

        # Save model and metadata
        import datetime
        self.model_version = "random_forest_v1_synthetic"
        self.trained_at = datetime.datetime.utcnow().isoformat() + "Z"

        joblib.dump(self.model, MODEL_PATH)
        with open(METADATA_PATH, "w") as f:
            json.dump({
                "version": self.model_version,
                "trained_at": self.trained_at,
                "n_samples": n_samples,
                "train_accuracy": float(train_acc),
                "test_accuracy": float(test_acc),
                "feature_names": self.feature_names,
                "risk_levels": RISK_LEVEL_ORDER,
                "data_source": "synthetic_demo_data_barpeta",
            }, f, indent=2)

        return {
            "version": self.model_version,
            "trained_at": self.trained_at,
            "train_accuracy": train_acc,
            "test_accuracy": test_acc,
        }

    def _extract_features(self, habitation: HabitationResponse, weather: Optional[Dict] = None) -> np.ndarray:
        """Extract feature vector for a habitation."""
        # Deterministic factors
        vuln = habitation.vulnerability_score

        flood_exp, erosion_exp, storm_exp = 0.0, 0.0, 0.0
        for hazard in habitation.hazard_exposure:
            htype = hazard.get("hazard_type", "").lower()
            severity = hazard.get("severity", "low").lower()
            weight = {"low": 0.2, "medium": 0.5, "high": 0.8, "extreme": 1.0}.get(severity, 0.2)
            if htype == "flood":
                flood_exp = max(flood_exp, weight)
            elif htype == "erosion":
                erosion_exp = max(erosion_exp, weight)
            elif htype == "storm_surge":
                storm_exp = max(storm_exp, weight)
        max_hazard = max(flood_exp, erosion_exp, storm_exp)

        pop_factor = min(1.0, habitation.population / 5000.0)
        access_factor = 0.0 if habitation.is_accessible else 0.3
        priority_factor = 0.0
        if habitation.priority_rank:
            priority_factor = max(0.0, 1.0 - (habitation.priority_rank - 1) / 12.0)

        # Weather features (defaults for demo)
        if weather:
            rainfall_7d = weather.get("rainfall_7d_mm", 0)
            river_level = weather.get("river_level_m", 0)
            soil_moisture = weather.get("soil_moisture_pct", 50)
            antecedent_30d = weather.get("antecedent_rainfall_30d_mm", 0)
        else:
            # Synthetic defaults for demo
            rainfall_7d = 0.0
            river_level = 0.0
            soil_moisture = 50.0
            antecedent_30d = 0.0

        return np.array([[
            vuln,
            max_hazard,
            pop_factor,
            access_factor,
            priority_factor,
            rainfall_7d,
            river_level,
            soil_moisture,
            antecedent_30d,
        ]])

    def predict(self, habitation: HabitationResponse, weather: Optional[Dict] = None) -> Tuple[str, Dict[str, float]]:
        """
        Predict risk level for a habitation.

        Returns:
            (risk_level, probability_dict)
        """
        if self.model is None:
            self._load_or_train()

        X = self._extract_features(habitation, weather)
        probs = self.model.predict_proba(X)[0]
        pred_idx = int(np.argmax(probs))
        risk_level = IDX_TO_RISK[pred_idx]

        prob_dict = {IDX_TO_RISK[i]: float(probs[i]) for i in range(len(probs))}

        return risk_level, prob_dict

    def predict_batch(self, habitations: List[HabitationResponse], weather: Optional[Dict] = None) -> List[Tuple[str, Dict[str, float]]]:
        """Predict for multiple habitations."""
        return [self.predict(h, weather) for h in habitations]


# Global instance
_predictor: Optional[RiskPredictor] = None


def get_predictor() -> RiskPredictor:
    """Get or create the global predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = RiskPredictor()
    return _predictor


def predict_risk_score(habitation: HabitationResponse, weather: Optional[Dict] = None) -> RiskAssessmentResponse:
    """
    ML-enhanced risk prediction that wraps the deterministic engine.

    Returns a RiskAssessmentResponse with ML probability distribution
    added to the explanation.
    """
    det = calculate_risk_score(habitation)
    predictor = get_predictor()
    ml_risk, probs = predictor.predict(habitation, weather)

    # Use ML risk if it's higher (more conservative), else deterministic
    # In practice, could blend or use ML as primary with det as fallback
    final_risk = ml_risk if RISK_TO_IDX[ml_risk] >= RISK_TO_IDX[det.risk_level] else det.risk_level

    ml_explanation = (
        f"ML prediction: {ml_risk} (probabilities: "
        f"LOW={probs.get(RiskLevel.LOW, 0):.2f}, "
        f"MEDIUM={probs.get(RiskLevel.MEDIUM, 0):.2f}, "
        f"HIGH={probs.get(RiskLevel.HIGH, 0):.2f}, "
        f"RED_ZONE={probs.get(RiskLevel.RED_ZONE, 0):.2f}). "
        f"Deterministic: {det.risk_level}. Final: {final_risk}."
    )

    return RiskAssessmentResponse(
        habitation_id=det.habitation_id,
        habitation_name=det.habitation_name,
        total_score=det.total_score,
        risk_level=final_risk,
        factors=det.factors,
        explanation=ml_explanation,
    )