#!/usr/bin/env python
"""
Train ML risk model for Aapda Setu.

Uses training data derived from PUBLIC flood/landslide datasets for Assam:
- IMD Daily Rainfall (1990-2024) for Barpeta district
- CWC River Gauge Data: Beki, Manas, Kaldia rivers (2000-2024)
- NASA SMAP L4 Soil Moisture for Assam (2015-2024)
- SRTM 30m DEM / NASADEM for elevation
- HydroSHEDS / Bhuvan River Network for distance-to-river
- Census 2011 + SECC 2011 for population/vulnerability
- ASDMA Historical Flood Records (1988-2024)

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