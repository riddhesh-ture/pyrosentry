"""
Backend Entrypoint Script for PYROSENTRY AI Industrial Telemetry SCADA.
Launches FastAPI daemon on port 8000 (or PORT env var) with uvicorn.
Works seamlessly both locally and when containerized.
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    # Ensure backend/app is in PYTHONPATH
    current_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.join(current_dir, "app")
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)

    port = int(os.environ.get("PORT", 8000))
    print(f"[Backend Launcher] Starting FastAPI Daemon on http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")
