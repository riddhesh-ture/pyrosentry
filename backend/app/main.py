"""
FastAPI Backend Daemon for PYROSENTRY AI Industrial Multi-Sensor Fire & Hazard Telemetry System.
Streams 1 Hz real-time telemetry packets over WebSockets containing:
- Multi-sensor readings & 1st-order rate-of-rise metrics
- Scikit-Learn Random Forest 5-class hazard classification
- Instant Tree-Path XAI feature attributions
- Composite Fire Risk Score (0-100%) & Tiered Emergency Alerting
- Interactive Simulation Scenario Overrides & CSV Replay Mode
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np

# Ensure local imports resolve correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ml.feature_pipeline import FEATURE_NAMES, CLASS_NAMES, FeatureBuffer
from ml.explainability import TreePathExplainer
from engine.simulator import PhysicsSimulator
from engine.replay_manager import CsvReplayManager
from engine.alert_manager import AlertManager
from engine.serial_fallback import SerialFallbackAdapter
from models.schemas import (
    SensorReadings,
    RollingDerivatives,
    FeatureAttribution,
    HazardPrediction,
    AlertState,
    SensorFaultState,
    TelemetryPacket,
    ScenarioSwitchRequest,
    ModeSwitchRequest,
    ReplayControlRequest,
    FaultInjectionRequest,
    ManualOverrideRequest
)

# ---------------------------------------------------------
# App & Dependency Initialization
# ---------------------------------------------------------
app = FastAPI(
    title="PYROSENTRY AI — Industrial Hazard & Fire Telemetry SCADA",
    description="Real-Time Sensor Fusion, Random Forest Hazard Classifier, and Explainable AI (XAI) Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained Random Forest model artifact
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_classifier.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "models", "rf_metrics.json")
BENCHMARK_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "benchmark_runs"))

print(f"[Backend] Loading trained model from: {MODEL_PATH}")
clf = joblib.load(MODEL_PATH)
print("[Backend] Initializing TreePathExplainer (Saabas / exact TreeSHAP proxy)...")
explainer = TreePathExplainer(clf, FEATURE_NAMES, CLASS_NAMES)

# Pre-load Viva metrics
with open(METRICS_PATH, "r") as f:
    viva_metrics_data = json.load(f)

# Core state engines
feature_buffer = FeatureBuffer(window_size=5)
simulator = PhysicsSimulator()
replay_manager = CsvReplayManager(benchmark_dir=BENCHMARK_DIR)
alert_manager = AlertManager()
serial_adapter = SerialFallbackAdapter()

# System global state
current_mode = "SIMULATION"  # "SIMULATION" | "CSV_REPLAY" | "HARDWARE_SERIAL"
frame_counter = 0
active_websockets: Set[WebSocket] = set()

# ---------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# ---------------------------------------------------------
# 1 Hz Telemetry Async Worker Daemon
# ---------------------------------------------------------
async def telemetry_worker():
    global frame_counter, current_mode
    print("[Daemon] 1 Hz Telemetry Streaming Daemon started.")
    
    while True:
        try:
            frame_counter += 1
            start_time = time.perf_counter()

            # 1. Acquire raw sensor readings based on active mode
            if current_mode == "HARDWARE_SERIAL" and serial_adapter.is_connected:
                raw_packet = serial_adapter.read_packet()
                if raw_packet is None:
                    raw_packet = simulator.step()
            elif current_mode == "CSV_REPLAY":
                raw_packet = replay_manager.step()
            else:
                raw_packet = simulator.step()

            # 2. Update Feature Buffer & Extract 10D Feature Vector
            features = feature_buffer.update(
                temp=raw_packet["temp"],
                humidity=raw_packet["humidity"],
                smoke=raw_packet["smoke"],
                lpg_gas=raw_packet["lpg_gas"],
                flame=raw_packet["flame"]
            )
            x_vec = feature_buffer.get_feature_vector(features)

            # 3. Model Inference (Random Forest)
            pred_probs = clf.predict_proba(x_vec)[0]
            pred_idx = int(np.argmax(pred_probs))
            predicted_class = CLASS_NAMES[pred_idx]
            confidence = float(round(pred_probs[pred_idx], 4))

            prob_dict = {
                c_name: float(round(pred_probs[i], 4))
                for i, c_name in enumerate(CLASS_NAMES)
            }

            # 4. Instant XAI Feature Attribution (Saabas Tree-Path Decomposition)
            explanation = explainer.explain_instance(x_vec, pred_idx)
            xai_list = [
                FeatureAttribution(
                    feature=c["feature"],
                    current_value=c["current_value"],
                    contribution=c["contribution"],
                    direction=c["direction"],
                    abs_impact=c["abs_impact"]
                )
                for c in explanation["contributions"]
            ]

            # 5. Composite Fire Risk Score & Tiered Alert Evaluation
            risk_score, alert_tier, driving_factors, alert_state_dict = alert_manager.evaluate(
                probabilities=prob_dict,
                features=features,
                predicted_class=predicted_class,
                class_idx=pred_idx
            )

            # 6. Assemble Strict Typed Packet
            sensors_payload = SensorReadings(
                temp=features["temp"],
                humidity=features["humidity"],
                smoke=features["smoke"],
                lpg_gas=features["lpg_gas"],
                flame=features["flame"]
            )

            derivatives_payload = RollingDerivatives(
                dT_dt=features["dT_dt"],
                dSmoke_dt=features["dSmoke_dt"],
                dGas_dt=features["dGas_dt"],
                gas_to_smoke_ratio=features["gas_to_smoke_ratio"],
                thermal_optical_interaction=features["thermal_optical_interaction"]
            )

            prediction_payload = HazardPrediction(
                predicted_class=predicted_class,
                class_index=pred_idx,
                confidence=confidence,
                probabilities=prob_dict,
                risk_score=risk_score,
                alert_tier=alert_tier,
                driving_factors=driving_factors
            )

            alert_payload = AlertState(
                alert_tier=alert_state_dict["alert_tier"],
                buzzer_active=alert_state_dict["buzzer_active"],
                escalation_level=alert_state_dict["escalation_level"],
                acknowledged=alert_state_dict["acknowledged"],
                message=alert_state_dict["message"]
            )

            fault_payload = SensorFaultState(
                mq2_disconnected=simulator.mq2_disconnected,
                dht22_frozen=simulator.dht22_frozen
            )

            active_scenario_name = (
                replay_manager.active_file if current_mode == "CSV_REPLAY"
                else simulator.active_scenario
            )

            telemetry_packet = TelemetryPacket(
                timestamp=datetime.now().strftime("%H:%M:%S"),
                frame_id=frame_counter,
                mode=current_mode,
                active_scenario=active_scenario_name,
                sensors=sensors_payload,
                derivatives=derivatives_payload,
                prediction=prediction_payload,
                xai_attributions=xai_list,
                alert_state=alert_payload,
                faults=fault_payload
            )

            # 7. Broadcast to all active WebSocket clients
            packet_json = telemetry_packet.model_dump_json()
            await manager.broadcast(packet_json)

        except Exception as e:
            print(f"[Daemon Error] Unexpected exception in telemetry cycle: {e}")

        # Maintain exact 1 Hz pacing
        elapsed = time.perf_counter() - start_time
        sleep_time = max(0.05, 1.0 - elapsed)
        await asyncio.sleep(sleep_time)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(telemetry_worker())

# ---------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and accept client control messages if any
            client_msg = await websocket.receive_text()
            # Can parse client actions here if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# ---------------------------------------------------------
# REST Control API Endpoints
# ---------------------------------------------------------
@app.get("/api/status")
def get_status():
    return {
        "status": "ONLINE",
        "mode": current_mode,
        "scenario": simulator.active_scenario,
        "replay_file": replay_manager.active_file,
        "replay_playing": replay_manager.is_playing,
        "frame_id": frame_counter,
        "connected_clients": len(manager.active_connections),
        "hardware_serial_connected": serial_adapter.is_connected,
        "manual_override_active": simulator.manual_override_active,
        "manual_values": simulator.manual_values
    }

@app.post("/api/simulator/manual")
def manual_override(req: ManualOverrideRequest):
    global current_mode
    current_mode = "SIMULATION"
    if req.enabled:
        simulator.set_manual_override({
            "temp": req.temp,
            "humidity": req.humidity,
            "smoke": req.smoke,
            "lpg_gas": req.lpg_gas,
            "flame": req.flame
        })
    else:
        simulator.clear_manual_override()
    return {
        "status": "SUCCESS",
        "manual_override_active": simulator.manual_override_active,
        "values": simulator.manual_values
    }

@app.post("/api/simulator/reset")
def reset_simulator():
    simulator.clear_manual_override()
    return {
        "status": "SUCCESS",
        "manual_override_active": False,
        "scenario": simulator.active_scenario
    }


@app.post("/api/scenario")
def switch_scenario(req: ScenarioSwitchRequest):
    global current_mode
    current_mode = "SIMULATION"
    simulator.set_scenario(req.scenario)
    return {"status": "SUCCESS", "active_scenario": simulator.active_scenario, "mode": current_mode}

@app.post("/api/mode")
def switch_mode(req: ModeSwitchRequest):
    global current_mode
    if req.mode in ["SIMULATION", "CSV_REPLAY"]:
        current_mode = req.mode
        return {"status": "SUCCESS", "mode": current_mode}
    raise HTTPException(status_code=400, detail="Invalid mode. Choose SIMULATION or CSV_REPLAY.")

@app.get("/api/replay/files")
def list_replay_files():
    files = replay_manager.list_files()
    return {"files": files, "active_file": replay_manager.active_file}

@app.post("/api/replay/select")
def select_replay_file(req: ReplayControlRequest):
    global current_mode
    if not req.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    success = replay_manager.load_file(req.filename)
    if success:
        current_mode = "CSV_REPLAY"
        return {"status": "SUCCESS", "active_file": replay_manager.active_file, "mode": current_mode}
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/api/replay/control")
def control_replay(req: ReplayControlRequest):
    if req.action == "play":
        replay_manager.play()
    elif req.action == "pause":
        replay_manager.pause()
    elif req.action == "rewind":
        replay_manager.rewind()
    elif req.action == "seek" and req.seek_frame is not None:
        replay_manager.seek(req.seek_frame)
    return {
        "status": "SUCCESS",
        "is_playing": replay_manager.is_playing,
        "current_frame": replay_manager.current_frame
    }

@app.post("/api/fault")
def inject_fault(req: FaultInjectionRequest):
    simulator.set_fault(req.fault_type, req.active)
    return {"status": "SUCCESS", "fault_type": req.fault_type, "active": req.active}

@app.post("/api/alert/acknowledge")
def acknowledge_alert():
    alert_manager.acknowledge_alert()
    return {"status": "SUCCESS", "acknowledged": True, "buzzer_active": False}

@app.get("/api/metrics")
def get_metrics():
    return viva_metrics_data

@app.get("/api/alerts")
def get_alerts():
    return alert_manager.alert_history
