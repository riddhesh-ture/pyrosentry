"""
Backend Entrypoint Script for VIT FF180 Smart Fire Detection System.
Launches FastAPI on port 8000 with uvicorn.
"""

import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add backend directory to PYTHONPATH
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
    print("[Backend Launcher] Starting FastAPI Daemon on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
