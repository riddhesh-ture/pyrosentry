# PYROSENTRY AI: System Context & Scientific Audit

## 1. Project Overview & Operational Modes
PYROSENTRY AI is an industrial IoT multi-sensor fire and hazard early-warning system. It operates on two data pathways:
1. **Live Hardware Telemetry (ESP32/MCU via UART)**: When physical hardware is connected, it reads JSON frames over 115200 baud serial (`temp`, `humidity`, `smoke`, `lpg_gas`, `flame`).
2. **Virtual Controller & Mock Simulation**: When ESP32 is absent, the system automatically falls back to the Virtual Controller (`/controller` route) allowing interactive slider overrides, preset hazard curves, and benchmark CSV replays without crashing.

---

## 2. Critical Logical & Scientific Bugs Identified

| Issue | Current Behavior | Scientific / Logical Reality | Impact |
| :--- | :--- | :--- | :--- |
| **Max Temperature Capped at 95°C** | Sliders capped at 95°C, dataset clipped to `[18.0, 95.0]`, simulation capped at 92°C. | DHT22 hardware rating is **-40°C to +80°C** (melts/fails above 80°C). Real combustion reaches **300°C–1200°C+** (measured by thermocouples/IR pyrometers). | Unphysical temperature ceiling; misrepresents sensor limits and fire thermodynamics. |
| **Circular Synthetic Flame Leakage** | Flame is synthesized in `data_harmonizer.py` using `if label == 4: flame = 0.9` etc. | Optical IR flame sensors detect 760–1100 nm flicker. Electrical fires (Class C) start as **smoldering insulation with NO line-of-sight flame**. | The ML model gets a fake 100% score by memorizing synthetic flame; fails on flame-only or smolder-only inputs. |
| **Extreme Model Blindspots (Tested)** | High heat (75°C) with moderate smoke predicts **92% "No Fire"**. Cooking smoke at 32°C predicts **89% "No Fire"**. | 75°C with 50 ppm smoke is an active electrical short or heating failure. Hot pan cooking elevates room temp to >30°C. | High false-negative rate on real thermal build-up and false alarms on cooking. |
| **Autocorrelation & Discontinuous Leakage** | 1 Hz continuous time-series split randomly with `train_test_split(stratify=y)`. Global `diff(5)` applied across concatenated test runs. | Contiguous seconds $t$ and $t+1$ leak between train/test. Global `diff()` calculates derivatives across unrelated trial jumps (UTC/CNT resets). | Complete evaluation leakage; false 100% test accuracy. |
| **ESP32 Connection Brittleness** | Serial connection initialized once at startup; no hot-plug detection; `/api/mode` rejects `HARDWARE_SERIAL`; `pyserial` missing in `requirements.txt`. | Users plug/unplug ESP32 while server is running. | Silent failure to detect hardware; mode switches locked. |

---

## 3. Sensor Realism & Multi-Sensor Physics

1. **DHT22 & Thermal Sensing**:
   - Rated operating range: **-40°C to 80°C**.
   - Beyond 80°C: Flag `SENSOR_SATURATION / THERMAL_OVERLIMIT` and transition to optical/MOS gas dynamics or dual thermocouple channel.
2. **MQ-2 (Smoke / Particulate Aerosol)**:
   - Dynamic range: 200–10000 ppm (calibrated baseline ~20–35 ppm).
   - Smoldering (Class A / C) produces heavy particulates before open flame.
3. **MQ-5 (Combustible LPG / Methane)**:
   - Responds to flammable hydrocarbons. Decouples gas leaks ($R_{GS} \gg 1.0$, flame = 0) from particulate cooking smoke ($R_{GS} < 0.4$, flame = 0).
4. **Optical IR Flame (760–1100 nm)**:
   - Line-of-sight flame radiation. Must be cross-verified with thermal or smoke velocity to reject optical false alarms (e.g., sunlight flicker, lighters).

---

## 4. Architectural Target State
- **Seamless Dual-Source Manager**: Background auto-discovery for ESP32 with automatic fallback to Virtual Controller sliders.
- **Physics-Grounded Dataset & Run-Based Group Split**: Re-clean Stefan Blattmann trials by individual runs; augment with realistic combustion physics and sensor saturation thresholds.
- **Robust Model & Probability Calibration**: Eliminate artificial flame leakage; retrain Random Forest with real cross-validation so edge cases (high heat smoldering, cooking variations, gas flares) classify accurately.

