"""
Tiered Alert & Composite Risk Engine for PYROSENTRY AI Industrial Telemetry System.
Implements the multi-tiered hazard mitigation matrix:
  - LOW RISK (< 35%): Normal status, silent logging
  - MEDIUM RISK (35% - 70%): Advisory alert to homeowner (Telegram/App mock)
  - CRITICAL EMERGENCY (> 70%): Local buzzer trigger + escalated emergency protocol
Includes debounce persistence filtering (requires 2 consecutive cycles for escalation)
and plain-English factor explanation.
"""

from typing import Dict, List, Tuple
from datetime import datetime

class AlertManager:
    CLASS_WEIGHTS = [0.0, 25.0, 65.0, 85.0, 100.0]

    def __init__(self):
        self.consecutive_high_risk = 0
        self.consecutive_medium_risk = 0
        self.buzzer_active = False
        self.acknowledged = False
        self.alert_history: List[Dict] = []

    def acknowledge_alert(self):
        self.acknowledged = True
        self.buzzer_active = False

    def evaluate(
        self,
        probabilities: Dict[str, float],
        features: Dict[str, float],
        predicted_class: str,
        class_idx: int
    ) -> Tuple[float, str, List[str], Dict]:
        """
        Evaluates risk score, alert tier, driving factors, and alert state.
        """
        # 1. Base probabilistic risk calculation
        prob_values = [
            probabilities.get("No Fire", 0.0),
            probabilities.get("Cooking Smoke", 0.0),
            probabilities.get("Gas Leak", 0.0),
            probabilities.get("Electrical Fire", 0.0),
            probabilities.get("LPG Fire", 0.0),
        ]
        
        base_risk = sum(w * p for w, p in zip(self.CLASS_WEIGHTS, prob_values))

        # 2. Dynamic rate-of-rise and optical flame booster
        temp = features.get("temp", 24.0)
        dT_dt = features.get("dT_dt", 0.0)
        flame = features.get("flame", 0.0)
        gas = features.get("lpg_gas", 0.0)
        smoke = features.get("smoke", 0.0)

        boost = 0.0
        # Thermal rate-of-rise boost during active combustion
        if dT_dt > 0.25 and (smoke > 45.0 or gas > 150.0):
            boost += min(20.0, dT_dt * 12.0)
        # Confirmed optical flame (correlated with thermal velocity or smoke)
        if flame > 0.35 and (dT_dt > 0.1 or smoke > 50.0 or gas > 150.0):
            boost += flame * 25.0
        # High heat boost
        if temp > 75.0 and smoke > 40.0:
            boost += min(25.0, (temp - 75.0) * 0.8)

        risk_score = min(100.0, max(0.0, base_risk + boost))
        risk_score = round(risk_score, 1)

        # 3. Identify human-readable driving factors
        factors = []
        if temp > 80.0:
            factors.append(f"DHT22 sensor saturation limit exceeded ({temp:.1f} °C > 80°C)")
        elif temp > 50.0:
            factors.append(f"High ambient thermal reading ({temp:.1f} °C)")

        if flame > 0.5:
            if dT_dt > 0.1 or smoke > 50.0:
                factors.append(f"Optical IR Flame detected (intensity: {flame:.2f})")
            else:
                factors.append(f"Optical IR Flame signal ({flame:.2f}) - evaluating thermal correlation")

        if dT_dt > 0.3:
            factors.append(f"Rapid thermal rate of rise ({dT_dt:+.2f} °C/s)")
        if gas > 250.0:
            factors.append(f"Combustible LPG gas concentration elevated ({gas:.0f} ppm)")
        if smoke > 120.0:
            factors.append(f"High aerosol/smoke particulate density ({smoke:.0f} ppm)")
        if class_idx == 1:
            factors.append("Particulate smoke without thermal acceleration (Cooking)")
        if not factors:
            factors.append("All sensor parameters within nominal ambient thresholds")

        # 4. Debounce persistence filter & alert tiering
        if risk_score >= 70.0:
            self.consecutive_high_risk += 1
            self.consecutive_medium_risk = 0
            if self.consecutive_high_risk >= 2:
                tier = "CRITICAL"
                if not self.acknowledged:
                    self.buzzer_active = True
                message = f"CRITICAL HAZARD: {predicted_class.upper()} CONFIRMED! Siren engaged."
            else:
                tier = "MEDIUM"
                message = f"Elevated hazard onset ({predicted_class}) - verifying across cycles."
        elif risk_score >= 35.0:
            self.consecutive_medium_risk += 1
            self.consecutive_high_risk = 0
            tier = "MEDIUM"
            self.buzzer_active = False
            self.acknowledged = False
            message = f"ADVISORY WARNING: Elevated readings ({predicted_class}). Notification dispatched."
        else:
            self.consecutive_high_risk = 0
            self.consecutive_medium_risk = 0
            tier = "LOW"
            self.buzzer_active = False
            self.acknowledged = False
            message = "NOMINAL: Environmental sensors normal. Silent logging."

        alert_state = {
            "alert_tier": tier,
            "buzzer_active": self.buzzer_active,
            "escalation_level": 3 if tier == "CRITICAL" else (2 if tier == "MEDIUM" else 1),
            "acknowledged": self.acknowledged,
            "message": message,
        }

        # Log significant alerts (avoid duplicate flood)
        if tier != "LOW":
            timestamp = datetime.now().strftime("%H:%M:%S")
            if not self.alert_history or self.alert_history[-1]["tier"] != tier or len(self.alert_history) > 100:
                self.alert_history.append({
                    "timestamp": timestamp,
                    "tier": tier,
                    "risk_score": risk_score,
                    "hazard": predicted_class,
                    "message": message
                })

        return risk_score, tier, factors, alert_state
