#!/usr/bin/env python
"""
Train ML risk model for Aapda Setu.

Generates synthetic historical data from existing GeoJSON habitations
and trains a RandomForestClassifier. Saves model to app/ml/model.joblib.
"""

import sys
sys.path.insert(0, ".")

from app.ml.risk_predictor import RiskPredictor


if __name__ == "__main__":
    print("Training ML risk model...")
    predictor = RiskPredictor()
    result = predictor.train(n_samples=5000)
    print(f"Model trained: {result}")
    print(f"Train accuracy: {result['train_accuracy']:.3f}")
    print(f"Test accuracy: {result['test_accuracy']:.3f}")
    print("Model saved to app/ml/model.joblib")