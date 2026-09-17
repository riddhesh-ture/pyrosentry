"""
Physics-Based Telemetry Generator & Sensor Emulation Engine.
Generates mathematically grounded time-series profiles reflecting physical hazard dynamics:
- NOMINAL: Ambient thermal equilibrium with sensor jitter
- COOKING_SMOKE: Aerosol particulate ramp without thermal acceleration (dT/dt ~ 0)
- GAS_LEAK: Diffusive LPG fuel accumulation without flame
- ELECTRICAL_FIRE: Ohmic heating (Joule heating dT/dt > 0) + smoldering smoke ramp
- LPG_FIRE: Compound catastrophe: gas pre-saturation + rapid thermal runaway + flame
Supports real-time manual slider overrides and sensor fault emulation.
"""

import math
import random
from typing import Dict, Optional

class PhysicsSimulator:
    def __init__(self):
        self.active_scenario = "NOMINAL"
        self.step_count = 0
        
        # State variables
        self.temp = 24.5
        self.humidity = 52.0
        self.smoke = 20.0
        self.lpg_gas = 25.0
        self.flame = 0.0

        # Manual slider override state
        self.manual_override_active = False
        self.manual_values = {
            "temp": 24.5,
            "humidity": 52.0,
            "smoke": 20.0,
            "lpg_gas": 25.0,
            "flame": 0.0,
        }

        # Fault injection toggles
        self.mq2_disconnected = False
        self.dht22_frozen = False
        self.frozen_temp = 24.5
        self.frozen_humidity = 52.0

    def set_scenario(self, scenario: str):
        valid = ["NOMINAL", "COOKING_SMOKE", "GAS_LEAK", "ELECTRICAL_FIRE", "LPG_FIRE"]
        if scenario in valid:
            self.active_scenario = scenario
            self.manual_override_active = False  # Switching scenario clears manual override
            self.step_count = 0

    def set_manual_override(self, values: Dict[str, Optional[float]]):
        self.manual_override_active = True
        for k, v in values.items():
            if v is not None and k in self.manual_values:
                self.manual_values[k] = float(v)

    def clear_manual_override(self):
        self.manual_override_active = False

    def set_fault(self, fault_type: str, active: bool):
        if fault_type == "mq2_disconnected":
            self.mq2_disconnected = active
        elif fault_type == "dht22_frozen":
            self.dht22_frozen = active
            if active:
                self.frozen_temp = self.manual_values["temp"] if self.manual_override_active else self.temp
                self.frozen_humidity = self.manual_values["humidity"] if self.manual_override_active else self.humidity

    def step(self) -> Dict[str, float]:
        """
        Advances the simulation by 1 second and returns raw sensor readings.
        """
        self.step_count += 1
        t = float(self.step_count)

        if self.manual_override_active:
            # When manual override is active, use values set by the controller sliders
            # with slight Gaussian micro-jitter for physical realism
            self.temp = self.manual_values["temp"] + random.gauss(0, 0.05)
            self.humidity = self.manual_values["humidity"] + random.gauss(0, 0.1)
            self.smoke = max(0.0, self.manual_values["smoke"] + random.gauss(0, 0.5))
            self.lpg_gas = max(0.0, self.manual_values["lpg_gas"] + random.gauss(0, 0.5))
            self.flame = max(0.0, min(1.0, self.manual_values["flame"]))

        elif self.active_scenario == "NOMINAL":
            self.temp = 24.0 + 0.4 * math.sin(t * 0.05) + random.gauss(0, 0.1)
            self.humidity = 52.0 + 0.8 * math.cos(t * 0.03) + random.gauss(0, 0.2)
            self.smoke = max(12.0, 22.0 + random.gauss(0, 1.5))
            self.lpg_gas = max(15.0, 28.0 + random.gauss(0, 2.0))
            self.flame = 0.0

        elif self.active_scenario == "COOKING_SMOKE":
            target_smoke = 22.0 + 340.0 * (1.0 - math.exp(-t / 18.0))
            self.smoke = max(20.0, target_smoke + random.gauss(0, 8.0))
            self.temp = 25.0 + 0.05 * math.sin(t * 0.1) + random.gauss(0, 0.15)
            self.humidity = 48.0 - 5.0 * (1.0 - math.exp(-t / 25.0)) + random.gauss(0, 0.3)
            self.lpg_gas = 35.0 + random.gauss(0, 2.5)
            self.flame = 0.0

        elif self.active_scenario == "GAS_LEAK":
            target_gas = 28.0 + 780.0 * (1.0 - math.exp(-t / 12.0))
            self.lpg_gas = max(25.0, target_gas + random.gauss(0, 12.0))
            self.smoke = 24.0 + random.gauss(0, 1.8)
            self.temp = 23.8 - 0.5 * (1.0 - math.exp(-t / 20.0)) + random.gauss(0, 0.1)
            self.humidity = 51.0 + random.gauss(0, 0.2)
            self.flame = 0.0

        elif self.active_scenario == "ELECTRICAL_FIRE":
            self.temp = min(68.0, 26.0 + 0.45 * t + random.gauss(0, 0.2))
            target_smoke = 20.0 + 190.0 * (1.0 - math.exp(-t / 22.0))
            self.smoke = max(20.0, target_smoke + random.gauss(0, 6.0))
            self.lpg_gas = 45.0 + 15.0 * (1.0 - math.exp(-t / 30.0)) + random.gauss(0, 3.0)
            self.humidity = max(18.0, 50.0 - 0.25 * t + random.gauss(0, 0.4))
            if t > 15.0:
                self.flame = min(1.0, max(0.0, 0.45 + 0.35 * math.sin(t * 0.8) + random.gauss(0, 0.1)))
            else:
                self.flame = 0.0

        elif self.active_scenario == "LPG_FIRE":
            self.temp = min(92.0, 27.0 + 58.0 * (1.0 - math.exp(-t / 8.0)) + 0.35 * t + random.gauss(0, 0.4))
            target_gas = 450.0 + 600.0 * (1.0 - math.exp(-t / 10.0))
            self.lpg_gas = max(300.0, target_gas + random.gauss(0, 15.0))
            target_smoke = 180.0 + 520.0 * (1.0 - math.exp(-t / 12.0))
            self.smoke = max(150.0, target_smoke + random.gauss(0, 18.0))
            self.humidity = max(12.0, 48.0 - 0.5 * t + random.gauss(0, 0.5))
            self.flame = min(1.0, 0.90 + random.gauss(0, 0.05))

        # Fault Injections
        output_temp = self.frozen_temp if self.dht22_frozen else self.temp
        output_hum = self.frozen_humidity if self.dht22_frozen else self.humidity
        output_smoke = 0.0 if self.mq2_disconnected else self.smoke

        return {
            "temp": round(float(output_temp), 2),
            "humidity": round(float(output_hum), 1),
            "smoke": round(float(output_smoke), 1),
            "lpg_gas": round(float(self.lpg_gas), 1),
            "flame": round(float(self.flame), 2),
        }
