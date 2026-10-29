"""
Inference & Multi-Sensor Physics Verification Suite for PYROSENTRY AI.
Verifies model predictions across realistic physical combustion and nuisance scenarios:
1. Smoldering Electrical Fire (T=65°C, Flame=0) -> Electrical Fire
2. Warm Kitchen Cooking Smoke (T=34°C, Smoke=350, Flame=0) -> Cooking Smoke
3. Extreme Combustion / Thermal Flashover (T=110°C, Flame=0.9) -> LPG Fire
4. Optical Glint / Sunlight Reflection (Flame=0.85, Ambient T & Smoke) -> No Fire
5. Combustible LPG Gas Leak (LPG=750, Flame=0) -> Gas Leak
"""

import os
import sys
import time
import joblib
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from feature_pipeline import FEATURE_NAMES, CLASS_NAMES
from explainability import TreePathExplainer

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "rf_classifier.joblib")
print(f"[Verification] Loading model from: {MODEL_PATH}")
clf = joblib.load(MODEL_PATH)
explainer = TreePathExplainer(clf, FEATURE_NAMES, CLASS_NAMES)

test_scenarios = [
    {
        "name": "1. Smoldering Electrical Fire (T=65°C, Flame=0, smoke ramp)",
        "features": [65.0, 30.0, 90.0, 35.0, 0.0, 0.5, 3.0, 0.0, 0.4, 0.0],
        "expected_class": "Electrical Fire"
    },
    {
        "name": "2. Warm Kitchen Cooking Smoke (T=34°C, Smoke=350 ppm, Flame=0)",
        "features": [34.0, 60.0, 350.0, 30.0, 0.0, 0.01, 1.0, 0.0, 0.09, 0.0],
        "expected_class": "Cooking Smoke"
    },
    {
        "name": "3. Thermal Flashover / LPG Fire (T=110°C, Gas=550 ppm, Flame=0.9)",
        "features": [110.0, 20.0, 450.0, 550.0, 0.9, 1.2, 15.0, 20.0, 1.22, 1.08],
        "expected_class": "LPG Fire"
    },
    {
        "name": "4. Optical Glint / Sunlight False Alarm (Flame=0.85, Ambient T & Smoke)",
        "features": [22.0, 50.0, 20.0, 25.0, 0.85, 0.0, 0.0, 0.0, 1.25, 0.0],
        "expected_class": "No Fire"
    },
    {
        "name": "5. Combustible Fuel / LPG Gas Leak (LPG=750 ppm, Flame=0)",
        "features": [24.0, 50.0, 25.0, 750.0, 0.0, 0.0, 0.0, 15.0, 28.8, 0.0],
        "expected_class": "Gas Leak"
    }
]

print("\n" + "="*70)
print("RUNNING MULTI-SENSOR PHYSICS TEST CASES")
print("="*70)

all_passed = True
for tc in test_scenarios:
    vec = np.array(tc["features"], dtype=np.float32).reshape(1, -1)
    t0 = time.perf_counter()
    pred_idx = int(clf.predict(vec)[0])
    pred_probs = clf.predict_proba(vec)[0]
    latency_ms = (time.perf_counter() - t0) * 1000
    
    predicted_class = CLASS_NAMES[pred_idx]
    confidence = pred_probs[pred_idx]
    passed = (predicted_class == tc["expected_class"])
    status_str = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False

    print(f"\nScenario: {tc['name']}")
    print(f"  Target: {tc['expected_class']} | Predicted: {predicted_class} ({confidence*100:.1f}%) | Latency: {latency_ms:.2f} ms | [{status_str}]")
    
    # Run XAI attribution for this scenario
    explanation = explainer.explain_instance(vec, pred_idx)
    top_factor = explanation["contributions"][0]
    print(f"  Top XAI Driver: {top_factor['feature']} (impact: {top_factor['contribution']:+.3f}, val: {top_factor['current_value']})")

print("\n" + "="*70)
if all_passed:
    print("ALL 5 PHYSICS & DEMO CONTROLLER TEST CASES PASSED WITH 100% INTEGRITY!")
else:
    print("ONE OR MORE TEST CASES FAILED - CHECK DECISION BOUNDARIES.")
print("="*70 + "\n")
