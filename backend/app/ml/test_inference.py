import joblib, time, numpy as np
from feature_pipeline import FEATURE_NAMES, CLASS_NAMES
from explainability import TreePathExplainer

clf = joblib.load('backend/app/models/rf_classifier.joblib')
explainer = TreePathExplainer(clf, FEATURE_NAMES, CLASS_NAMES)

# Test instance: High smoke, high temp, flame detected (LPG Fire scenario)
test_vec = np.array([55.0, 35.0, 450.0, 500.0, 0.95, 2.4, 45.0, 50.0, 1.11, 2.28])

t0 = time.perf_counter()
pred_idx = int(clf.predict(test_vec.reshape(1, -1))[0])
pred_prob = clf.predict_proba(test_vec.reshape(1, -1))[0]
explanation = explainer.explain_instance(test_vec, pred_idx)
elapsed_ms = (time.perf_counter() - t0) * 1000

print(f"Predicted Class: {CLASS_NAMES[pred_idx]}")
print(f"Inference + XAI Attribution Latency: {elapsed_ms:.2f} ms")
print(f"Base prior value: {explanation['base_value']:.4f}")
print("Top 4 Driving Attributions:")
for c in explanation['contributions'][:4]:
    print(f"  {c['feature']:28}: {c['contribution']:+.4f} ({c['direction']})")
