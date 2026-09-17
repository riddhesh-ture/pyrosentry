@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo   VIT PUNE - PROJECT FF NO. 180 (GROUP TY-CS-L9)
echo   AI-BASED SMART FIRE DETECTION & EMERGENCY RESPONSE SYSTEM
echo ==============================================================================
echo [1/4] Checking system prerequisites...

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [OK] Python and Node.js detected.

echo.
echo [2/4] Verifying Machine Learning Model and Benchmark Datasets...
if not exist "backend\app\models\rf_classifier.joblib" (
    echo [INFO] Model artifact not found. Training Random Forest classifier on Kaggle IoT dataset...
    python backend\app\ml\train_model.py
) else (
    echo [OK] Trained Random Forest model artifact verified.
)

echo.
echo [3/4] Verifying Frontend Dependencies...
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend packages...
    cd frontend && npm install && cd ..
) else (
    echo [OK] Frontend packages verified.
)

echo.
echo [4/4] Launching System Services...
echo [INFO] Starting FastAPI Daemon on http://127.0.0.1:8000...
start "VIT-FF180-Backend" cmd /c "python backend\run_backend.py"

timeout /t 2 >nul

echo [INFO] Opening SCADA Avionics Dashboard in default browser...
start http://localhost:5173

echo [INFO] Starting Vite Frontend Server on http://localhost:5173...
cd frontend && npm run dev
