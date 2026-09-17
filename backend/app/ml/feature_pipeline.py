"""
Feature Pipeline & Rolling Window Derivative Engine for VIT FF180 Fire Detection.
Computes 1st-order discrete rate-of-rise metrics (dT/dt, dSmoke/dt, dGas/dt)
and multi-sensor interaction ratios over a sliding window (W=5s).
"""

from collections import deque
from typing import Dict, List, Optional, Tuple
import numpy as np

# Exact feature ordering required by the trained Random Forest model
FEATURE_NAMES = [
    "temp",
    "humidity",
    "smoke",
    "lpg_gas",
    "flame",
    "dT_dt",
    "dSmoke_dt",
    "dGas_dt",
    "gas_to_smoke_ratio",
    "thermal_optical_interaction",
]

CLASS_NAMES = [
    "No Fire",
    "Cooking Smoke",
    "Gas Leak",
    "Electrical Fire",
    "LPG Fire",
]

class FeatureBuffer:
    """
    Maintains a rolling ring buffer of raw sensor telemetry (default W=5 seconds at 1 Hz).
    Computes real-time discrete rate-of-rise derivatives and interaction features on each cycle.
    """

    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.history: deque = deque(maxlen=window_size)

    def reset(self):
        """Clears the buffer."""
        self.history.clear()

    def update(
        self,
        temp: float,
        humidity: float,
        smoke: float,
        lpg_gas: float,
        flame: float,
    ) -> Dict[str, float]:
        """
        Pushes a new 1 Hz sensor reading into the sliding window and
        computes the complete 10-dimensional feature dictionary.
        """
        current_reading = {
            "temp": float(temp),
            "humidity": float(humidity),
            "smoke": float(smoke),
            "lpg_gas": float(lpg_gas),
            "flame": float(flame),
        }
        self.history.append(current_reading)

        # Discrete 1st-order backward differences over the sliding window
        # dt is equal to the number of elapsed steps (min 1, max window_size)
        dt = float(max(1, len(self.history) - 1))
        oldest_reading = self.history[0]

        if dt > 0 and len(self.history) > 1:
            dT_dt = (current_reading["temp"] - oldest_reading["temp"]) / dt
            dSmoke_dt = (current_reading["smoke"] - oldest_reading["smoke"]) / dt
            dGas_dt = (current_reading["lpg_gas"] - oldest_reading["lpg_gas"]) / dt
        else:
            dT_dt = 0.0
            dSmoke_dt = 0.0
            dGas_dt = 0.0

        # Multi-sensor interaction terms
        # R_GS: High in pure gas leaks, Low in pure particulate cooking smoke
        gas_to_smoke_ratio = (current_reading["lpg_gas"] + 1.0) / (current_reading["smoke"] + 1.0)
        
        # Thermal-Optical Cross-Product: High only when rapid thermal rise co-occurs with optical flame
        thermal_optical_interaction = current_reading["flame"] * max(0.0, dT_dt)

        features = {
            "temp": round(current_reading["temp"], 2),
            "humidity": round(current_reading["humidity"], 1),
            "smoke": round(current_reading["smoke"], 1),
            "lpg_gas": round(current_reading["lpg_gas"], 1),
            "flame": round(current_reading["flame"], 2),
            "dT_dt": round(dT_dt, 3),
            "dSmoke_dt": round(dSmoke_dt, 2),
            "dGas_dt": round(dGas_dt, 2),
            "gas_to_smoke_ratio": round(gas_to_smoke_ratio, 3),
            "thermal_optical_interaction": round(thermal_optical_interaction, 3),
        }
        return features

    def get_feature_vector(self, features: Dict[str, float]) -> np.ndarray:
        """Returns the numpy 1D vector aligned to FEATURE_NAMES."""
        return np.array([features[k] for k in FEATURE_NAMES], dtype=np.float32).reshape(1, -1)
