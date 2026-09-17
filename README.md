# PYROSENTRY AI: Multi-Sensor Hazard Telemetry & Early Response System
### Industrial IoT Telemetry, Tabular Random Forest Classifier & Real-Time Explainable AI (XAI)

---

## Executive Summary
**PYROSENTRY AI** is an enterprise-grade industrial telemetry and early hazard response platform designed to replace naive single-sensor threshold alarms with **multi-sensor fusion and Explainable AI (XAI)**. 

The system evaluates a 10-dimensional feature space—incorporating dynamic 1st-order rate-of-rise metrics ($\frac{dT}{dt}, \frac{dSmoke}{dt}, \frac{dGas}{dt}$) and multi-sensor interaction ratios—classifying environmental hazards across 5 operational classes:
1. `No Fire` (Nominal Ambient Baseline)
2. `Cooking Smoke` (Particulate aerosol smoke without thermal acceleration)
3. `Gas Leak` (Combustible fuel/LPG spike without flame)
4. `Electrical Fire` (Ohmic thermal build-up + smoldering smoke ramp)
5. `LPG Fire` (Catastrophic open flame + thermal runaway + gas saturation)

Every 1 Hz inference is decomposed in real time via **exact Tree-Path Shapley feature contributions ($\phi_i$)** in $< 2\text{ ms}$, accompanied by tiered alerting and an industrial SCADA avionics dashboard.

---

## Key Capabilities & Architecture

- **Trained on Benchmark Data**: Built upon Stefan Blattmann's 62,630-sample IoT Smoke Detection Kaggle dataset, with 5 benchmark CSV runs for live replay.
- **Zero Hardware Friction**: Backend automatically checks for an active microcontroller serial connection; if absent, it boots silently into high-fidelity physics simulation with zero `SerialException` crashes.
- **Explainable AI (XAI)**: Decomposes Random Forest decision paths into signed local feature contributions ($\phi_i(x)$), delivering transparent root-cause reasons.
- **Industrial SCADA UI**: Built with React, Material-UI (MUI), and high-performance SVG telemetry charts with animation disabled on 60s rolling buffers to eliminate render jank.
- **Fault Emulation Mode**: Real-time emulation of disconnected MQ-2 or frozen DHT22 sensors to verify multi-sensor fault tolerance.
- **Model Audit & Specifications Modal**: In-dashboard inspector displaying the 5x5 confusion matrix, per-class F1-scores, mathematical formulations, and edge DAQ benchmark justifications.

---

## Quickstart (One-Click Launch)

### On Windows
Double-click `run.bat` or execute in PowerShell / Command Prompt:
```cmd
run.bat
```

### On Linux / macOS / Git Bash
```bash
chmod +x run.sh
./run.sh
```

The script will:
1. Verify Python 3.10+ and Node.js.
2. Verify the trained Random Forest model and benchmark runs.
3. Verify frontend dependencies.
4. Launch the FastAPI backend daemon on `http://127.0.0.1:8000`.
5. Launch the Vite frontend on `http://localhost:5173`.
6. Open your default web browser to the SCADA dashboard.

---

## Manual Execution (Step-by-Step)

### 1. Backend Setup & Model Training
```bash
# Optional: create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate | Linux: source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn websockets scikit-learn pandas numpy joblib

# Run data harmonizer & train Random Forest model
python backend/app/ml/data_harmonizer.py
python backend/app/ml/train_model.py

# Launch FastAPI backend daemon (Port 8000)
python backend/run_backend.py
```

### 2. Frontend Launch
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Technical Stack
- **Machine Learning**: Scikit-Learn (Random Forest Ensemble, 100 trees, balanced weights)
- **Explainability (XAI)**: Saabas Tree-Path Decomposition (Exact TreeSHAP Proxy in $< 2\text{ ms}$)
- **Backend**: FastAPI, Asyncio, WebSockets (1 Hz streaming daemon), Pydantic v2
- **Frontend**: React 18, Material UI (MUI v5), Vite, Custom High-Performance SVG Telemetry Canvas
- **Telemetry Standards**: Discrete backward differences, rolling window ring buffers ($W=5\text{s}$)
