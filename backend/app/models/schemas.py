"""
Pydantic Schemas for PYROSENTRY AI Industrial Telemetry System.
Provides strict typing for telemetry streaming, model inferences, XAI attributions, and controls.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class SensorReadings(BaseModel):
    temp: float = Field(..., description="DHT22 Temperature in °C")
    humidity: float = Field(..., description="DHT22 Relative Humidity in %")
    smoke: float = Field(..., description="MQ-2 Smoke concentration in ppm")
    lpg_gas: float = Field(..., description="MQ-5 LPG/Combustible gas concentration in ppm")
    flame: float = Field(..., description="Optical IR Flame sensor reading (0.0 to 1.0)")

class RollingDerivatives(BaseModel):
    dT_dt: float = Field(..., description="Temperature rate of rise in °C/s")
    dSmoke_dt: float = Field(..., description="Smoke rate of change in ppm/s")
    dGas_dt: float = Field(..., description="Gas rate of change in ppm/s")
    gas_to_smoke_ratio: float = Field(..., description="LPG Gas to Smoke ratio R_GS")
    thermal_optical_interaction: float = Field(..., description="Flame x max(0, dT/dt) cross product")

class FeatureAttribution(BaseModel):
    feature: str
    current_value: float
    contribution: float
    direction: str  # "positive" or "negative"
    abs_impact: float

class HazardPrediction(BaseModel):
    predicted_class: str
    class_index: int
    confidence: float
    probabilities: Dict[str, float]
    risk_score: float  # 0 to 100
    alert_tier: str    # "LOW", "MEDIUM", "CRITICAL"
    driving_factors: List[str]

class AlertState(BaseModel):
    alert_tier: str
    buzzer_active: bool
    escalation_level: int
    acknowledged: bool
    message: str

class SensorFaultState(BaseModel):
    mq2_disconnected: bool = False
    dht22_frozen: bool = False
    dht22_saturated: bool = False  # Set true if temperature > 80.0°C (hardware rating limit)

class TelemetryPacket(BaseModel):
    timestamp: str
    frame_id: int
    mode: str  # "SIMULATION", "CSV_REPLAY", "HARDWARE_SERIAL"
    hardware_source: str = "VIRTUAL_CONTROLLER"  # "ESP32_HARDWARE (COM3)" or "VIRTUAL_CONTROLLER"
    active_scenario: str
    sensors: SensorReadings
    derivatives: RollingDerivatives
    prediction: HazardPrediction
    xai_attributions: List[FeatureAttribution]
    alert_state: AlertState
    faults: SensorFaultState

# Control Request Schemas
class ScenarioSwitchRequest(BaseModel):
    scenario: str  # "NOMINAL", "COOKING_SMOKE", "GAS_LEAK", "ELECTRICAL_FIRE", "LPG_FIRE"

class ModeSwitchRequest(BaseModel):
    mode: str  # "SIMULATION", "CSV_REPLAY", "HARDWARE_SERIAL"

class ReplayControlRequest(BaseModel):
    filename: Optional[str] = None
    action: str  # "play", "pause", "rewind", "seek"
    seek_frame: Optional[int] = None

class FaultInjectionRequest(BaseModel):
    fault_type: str  # "mq2_disconnected", "dht22_frozen"
    active: bool

class ManualOverrideRequest(BaseModel):
    enabled: bool = True
    temp: Optional[float] = None
    humidity: Optional[float] = None
    smoke: Optional[float] = None
    lpg_gas: Optional[float] = None
    flame: Optional[float] = None
