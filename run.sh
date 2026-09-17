#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "  VIT PUNE - PROJECT FF NO. 180 (GROUP TY-CS-L9)"
echo "  AI-BASED SMART FIRE DETECTION & EMERGENCY RESPONSE SYSTEM"
echo "=============================================================================="
echo "[1/4] Checking system prerequisites..."

command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || {
    echo "[ERROR] Python is not installed or not in PATH!" >&2
    exit 1
}

command -v npm >/dev/null 2>&1 || {
    echo "[ERROR] Node.js / npm is not installed or not in PATH!" >&2
    exit 1
}

PY_CMD="python"
if command -v python3 >/dev/null 2>&1; then
    PY_CMD="python3"
fi

echo "[OK] Python ($PY_CMD) and Node.js detected."

echo ""
echo "[2/4] Verifying Machine Learning Model and Benchmark Datasets..."
if [ ! -f "backend/app/models/rf_classifier.joblib" ]; then
    echo "[INFO] Model artifact not found. Training Random Forest classifier on Kaggle IoT dataset..."
    $PY_CMD backend/app/ml/train_model.py
else
    echo "[OK] Trained Random Forest model artifact verified."
fi

echo ""
echo "[3/4] Verifying Frontend Dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] Installing frontend packages..."
    (cd frontend && npm install)
else
    echo "[OK] Frontend packages verified."
fi

echo ""
echo "[4/4] Launching System Services..."
echo "[INFO] Starting FastAPI Daemon on http://127.0.0.1:8000..."
$PY_CMD backend/run_backend.py &
BACKEND_PID=$!

trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

sleep 2

# Open browser depending on OS
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" &
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:5173" &
fi

echo "[INFO] Starting Vite Frontend Server on http://localhost:5173..."
cd frontend && npm run dev
