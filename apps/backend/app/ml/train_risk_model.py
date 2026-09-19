#!/usr/bin/env python
"""
Train ML risk model for Aapda Setu.

Generates SYNTHETIC training data from parametric distributions loosely
informed by public summary statistics for Assam flood/landslide risk.
NOT trained on actual IMD/CWC/NASA/ASDMA records.

Labels are assigned via a hand-written threshold cascade (IMD rainfall
categories + heuristic river/soil moisture rules), NOT from historical
flood outcome records.

Trains a RandomForestClassifier. Saves model to app/ml/model.joblib.
"""

import sys
sys.path.insert(0, ".")

from app.ml.risk_predictor import RiskPredictor


if __name__ == "__main__":
    print("Training ML risk model from public data sources...")
    predictor = RiskPredictor()
    result = predictor.train(n_samples=5000)
    print(f"Model trained: {result['version']}")
    print(f"Train accuracy: {result['train_accuracy']:.3f}")
    print(f"Test accuracy: {result['test_accuracy']:.3f}")
    print("Feature importances:")
    for name, imp in sorted(result.get('feature_importances', {}).items(), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp:.4f}")
    print("Model saved to app/ml/model.joblib")