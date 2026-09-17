"""
Model Training & Evaluation Script for VIT FF180 Smart Fire Detection System.
Trains a Scikit-Learn RandomForestClassifier on multi-sensor features including
1st-order rate-of-rise metrics and interaction ratios.
Exports trained model artifact (.joblib) and comprehensive viva defense metrics (.json).
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

from feature_pipeline import FEATURE_NAMES, CLASS_NAMES

def train_and_evaluate(dataset_csv: str, model_output_path: str, metrics_output_path: str):
    print(f"[Training] Loading processed multi-class dataset from: {dataset_csv}")
    df = pd.read_csv(dataset_csv)
    print(f"[Training] Loaded {len(df)} samples across {df['hazard_label'].nunique()} classes.")

    X = df[FEATURE_NAMES].values
    y = df['hazard_label'].values

    # Stratified Train/Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[Training] Training set: {len(X_train)} samples, Test set: {len(X_test)} samples.")

    # Train Random Forest Classifier with balanced class weights
    print("[Training] Fitting RandomForestClassifier (100 estimators, max_depth=12)...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)

    # Predictions & Evaluation
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    weighted_f1 = f1_score(y_test, y_pred, average='weighted')
    cm = confusion_matrix(y_test, y_pred).tolist()
    clf_report = classification_report(y_test, y_pred, target_names=CLASS_NAMES, output_dict=True)

    print(f"\n=======================================================")
    print(f"MODEL EVALUATION METRICS (FOR MID-SEM VIVA DEFENSE)")
    print(f"=======================================================")
    print(f"Overall Accuracy:  {acc * 100:.2f}%")
    print(f"Macro F1-Score:    {macro_f1:.4f}")
    print(f"Weighted F1-Score: {weighted_f1:.4f}")
    print("\nPer-Class Breakdown:")
    for c_idx, c_name in enumerate(CLASS_NAMES):
        stats = clf_report[c_name]
        print(f"  {c_name:18} | Precision: {stats['precision']:.3f} | Recall: {stats['recall']:.3f} | F1: {stats['f1-score']:.3f} | Support: {stats['support']}")

    # Feature Importance (Mean Decrease in Impurity)
    feature_importances = {
        name: float(round(clf.feature_importances_[i], 4))
        for i, name in enumerate(FEATURE_NAMES)
    }
    sorted_importances = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)
    print("\nFeature Importances (MDI):")
    for feat, imp in sorted_importances:
        print(f"  {feat:28}: {imp * 100:.2f}%")

    # Serialize trained model artifact
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(clf, model_output_path)
    print(f"\n[Artifact] Model saved to: {model_output_path}")

    # Serialize rich metrics JSON for in-dashboard Viva Inspector & VIVA_DEFENSE.md
    metrics_payload = {
        "model_architecture": "RandomForestClassifier",
        "n_estimators": 100,
        "max_depth": 12,
        "features": FEATURE_NAMES,
        "classes": CLASS_NAMES,
        "overall_accuracy": round(float(acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "confusion_matrix": cm,
        "classification_report": clf_report,
        "feature_importances": sorted_importances,
        "dataset_sample_count": len(df),
        "train_sample_count": len(X_train),
        "test_sample_count": len(X_test)
    }

    os.makedirs(os.path.dirname(metrics_output_path), exist_ok=True)
    with open(metrics_output_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"[Artifact] Viva metrics JSON saved to: {metrics_output_path}")
    print("=======================================================\n")

if __name__ == '__main__':
    dataset_csv = "backend/data/processed_multiclass_dataset.csv"
    model_output_path = "backend/app/models/rf_classifier.joblib"
    metrics_output_path = "backend/app/models/rf_metrics.json"
    train_and_evaluate(dataset_csv, model_output_path, metrics_output_path)
