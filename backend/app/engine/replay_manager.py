"""
CSV Replay Manager for PYROSENTRY AI Industrial Telemetry System.
Reads and streams pre-recorded benchmark runs (e.g., from Stefan Blattmann Kaggle dataset)
at 1 Hz through the live signal processing, ML classification, and XAI pipeline.
"""

import os
import glob
from typing import Dict, List, Optional
import pandas as pd

class CsvReplayManager:
    def __init__(self, benchmark_dir: str):
        self.benchmark_dir = benchmark_dir
        self.active_file: Optional[str] = None
        self.df: Optional[pd.DataFrame] = None
        self.current_frame = 0
        self.is_playing = True
        
        # Load default file if present
        files = self.list_files()
        if files:
            self.load_file(files[0])

    def list_files(self) -> List[str]:
        if not os.path.exists(self.benchmark_dir):
            return []
        files = glob.glob(os.path.join(self.benchmark_dir, "*.csv"))
        return [os.path.basename(f) for f in sorted(files)]

    def load_file(self, filename: str) -> bool:
        path = os.path.join(self.benchmark_dir, filename)
        if not os.path.exists(path):
            return False
        try:
            self.df = pd.read_csv(path)
            self.active_file = filename
            self.current_frame = 0
            self.is_playing = True
            return True
        except Exception as e:
            print(f"[ReplayManager] Error reading {filename}: {e}")
            return False

    def play(self):
        self.is_playing = True

    def pause(self):
        self.is_playing = False

    def rewind(self):
        self.current_frame = 0

    def seek(self, frame_idx: int):
        if self.df is not None:
            self.current_frame = max(0, min(frame_idx, len(self.df) - 1))

    def step(self) -> Dict[str, float]:
        """
        Returns the next 1 Hz row of telemetry readings.
        Loops seamlessly when reaching the end of the benchmark file.
        """
        if self.df is None or len(self.df) == 0:
            return {
                "temp": 24.0,
                "humidity": 50.0,
                "smoke": 20.0,
                "lpg_gas": 25.0,
                "flame": 0.0,
            }

        row = self.df.iloc[self.current_frame]
        
        if self.is_playing:
            self.current_frame = (self.current_frame + 1) % len(self.df)

        return {
            "temp": float(row.get("temp", 24.0)),
            "humidity": float(row.get("humidity", 50.0)),
            "smoke": float(row.get("smoke", 20.0)),
            "lpg_gas": float(row.get("lpg_gas", 25.0)),
            "flame": float(row.get("flame", 0.0)),
        }
