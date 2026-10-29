"""
Physics-Grounded Data Harmonizer for PYROSENTRY AI Industrial Telemetry System.
Processes the Stefan Blattmann Kaggle IoT Smoke Detection dataset (62,630 rows)
across 5 distinct experimental runs and augments with real-world physical combustion
and sensor saturation dynamics across 5 operational hazard classes:
  0: No Fire (Nominal Ambient / Optical Artifacts)
  1: Cooking Smoke (Particulate aerosol smoke without thermal acceleration, up to 42°C kitchen temp)
  2: Gas Leak (Combustible fuel/LPG accumulation without flame)
  3: Electrical Fire (Ohmic thermal build-up dT/dt > 0 + smoldering smoke, with or without initial flame)
  4: LPG Fire (Catastrophic open flame + thermal runaway up to 120°C + gas saturation)

Generates clean benchmark CSV replay runs (120 seconds each) for live Viva / evaluation demos.
"""

import os
import pandas as pd
import numpy as np

def harmonize_kaggle_dataset(input_csv: str, output_csv: str, benchmark_dir: str):
    print(f"[Harmonizer] Loading Kaggle IoT dataset from: {input_csv}")
    raw_df = pd.read_csv(input_csv)
    n_rows = len(raw_df)
    print(f"[Harmonizer] Loaded {n_rows} rows from raw dataset.")

    temp_raw = raw_df['Temperature[C]'].values
    hum_raw = raw_df['Humidity[%]'].values
    pm25_raw = raw_df['PM2.5'].values
    tvoc_raw = raw_df['TVOC[ppb]'].values
    h2_raw = raw_df['Raw H2'].values
    eth_raw = raw_df['Raw Ethanol'].values
    alarm_raw = raw_df['Fire Alarm'].values

    # Sensor calibration & scaling to physical hardware ranges:
    # 1. DHT22 Temperature (°C): Operating range -40°C to +80°C.
    # Preserve realistic ambient temperatures while capping sensor baseline
    temp = np.clip(temp_raw, -10.0, 80.0)
    
    # 2. DHT22 Humidity (%): 10% to 95%
    humidity = np.clip(hum_raw, 10.0, 95.0)
    
    # 3. MQ-2 Smoke (ppm): Baseline ~ 15-35 ppm
    smoke_base = 20.0 + (pm25_raw * 0.35) + (tvoc_raw * 0.03)
    smoke = np.clip(smoke_base, 10.0, 1500.0)

    # 4. MQ-5 Gas (ppm): Baseline ~ 13150 in Raw H2. Drops during gas presence.
    gas_delta = np.maximum(0.0, 13150.0 - h2_raw)
    gas_base = 25.0 + (gas_delta * 0.50) + (np.maximum(0.0, 20500.0 - eth_raw) * 0.15)
    lpg_gas = np.clip(gas_base, 15.0, 2000.0)

    # Identify individual experimental run boundaries (CNT resets)
    jumps = [0] + raw_df.index[raw_df['CNT'].diff() < 0].tolist() + [n_rows]
    print(f"[Harmonizer] Found {len(jumps) - 1} experimental runs in dataset.")

    # Compute rolling window derivatives per individual run to prevent boundary corruption
    temp_grad = np.zeros(n_rows)
    smoke_grad = np.zeros(n_rows)
    gas_grad = np.zeros(n_rows)

    window = 5
    for r in range(len(jumps) - 1):
        start_idx = jumps[r]
        end_idx = jumps[r+1]
        run_temp = temp[start_idx:end_idx]
        run_smoke = smoke[start_idx:end_idx]
        run_gas = lpg_gas[start_idx:end_idx]
        
        # 5-second backward differences within this run
        for i in range(len(run_temp)):
            lookback = max(0, i - window)
            dt = max(1, i - lookback)
            g_idx = start_idx + i
            temp_grad[g_idx] = (run_temp[i] - run_temp[lookback]) / float(dt)
            smoke_grad[g_idx] = (run_smoke[i] - run_smoke[lookback]) / float(dt)
            gas_grad[g_idx] = (run_gas[i] - run_gas[lookback]) / float(dt)

    # Physically-grounded Multi-Class Labeling & Optical IR Flame assignment
    # Decouple flame from artificial tautology:
    # - Electrical fire smolders with NO flame initially (flame = 0), only late stage gets arcing flame.
    # - Cooking smoke has high particulates without heat acceleration, flame = 0.
    # - Gas leak has high hydrocarbons without heat or flame.
    # - LPG fire has rapid thermal acceleration + combustible gas + open flame.
    labels = np.zeros(n_rows, dtype=int)
    flame = np.zeros(n_rows, dtype=float)

    for i in range(n_rows):
        t = temp[i]
        s = smoke[i]
        g = lpg_gas[i]
        tg = temp_grad[i]
        sg = smoke_grad[i]

        # Case 4: LPG Fire (Open flame + fuel presence + thermal velocity)
        if (g > 300.0 and s > 150.0 and (t > 38.0 or tg > 0.15)) or (t > 50.0 and s > 200.0 and g > 250.0):
            labels[i] = 4
            flame[i] = np.clip(0.70 + np.random.uniform(0.05, 0.28), 0.0, 1.0)

        # Case 3: Electrical Fire (Ohmic thermal build-up, positive dT/dt, smoldering smoke ramp)
        # Note: 60% of electrical fire samples have ZERO flame (pure smoldering), 40% have arcing/flame
        elif (t > 32.0 and tg > 0.06 and s > 50.0) or (t > 40.0 and s > 50.0) or (tg > 0.20 and s > 40.0):
            labels[i] = 3
            if np.random.rand() < 0.40:
                flame[i] = np.clip(np.random.uniform(0.20, 0.65), 0.0, 1.0)
            else:
                flame[i] = 0.0

        # Case 2: Gas Leak (High combustible fuel, low smoke, no heat rise, zero flame)
        elif g > 200.0 and s < 100.0 and tg <= 0.05:
            labels[i] = 2
            flame[i] = 0.0

        # Case 1: Cooking Smoke (High aerosol / smoke, low thermal gradient, can occur in kitchens up to 40°C)
        elif s > 75.0 and tg <= 0.06 and g < 150.0:
            labels[i] = 1
            flame[i] = 0.0

        # Case 0: Nominal Ambient
        else:
            labels[i] = 0
            # Include occasional optical glints/sunlight reflection in 0.5% of nominal samples
            # to train the model to reject optical false alarms when heat and smoke are zero
            if np.random.rand() < 0.005:
                flame[i] = np.random.uniform(0.3, 0.8)
            else:
                flame[i] = 0.0

    # Physical Augmentation for Slider Edge Cases:
    # Ensure that manual slider interactions (high temperatures 50-120°C, smoldering without flame,
    # hot pan cooking 30-42°C, and intense open flame) respond with 100% physical reliability.
    print("[Harmonizer] Generating physics-based edge case augmentation...")
    np.random.seed(42)
    aug_records = []

    # 1. Electrical Smoldering / Cable Overheating without flame (Class 3)
    # High heat (45°C - 95°C), dT/dt > 0.2, smoke 50-300 ppm, flame = 0.0
    for _ in range(3000):
        t_aug = np.random.uniform(42.0, 95.0)
        tg_aug = np.random.uniform(0.10, 0.85)
        s_aug = np.random.uniform(50.0, 350.0)
        sg_aug = np.random.uniform(1.0, 25.0)
        g_aug = np.random.uniform(25.0, 95.0)
        h_aug = np.random.uniform(20.0, 50.0)
        flame_aug = 0.0 if np.random.rand() < 0.75 else np.random.uniform(0.15, 0.45)
        aug_records.append({
            'temp': t_aug, 'humidity': h_aug, 'smoke': s_aug, 'lpg_gas': g_aug, 'flame': flame_aug,
            'hazard_label': 3, 'dT_dt': tg_aug, 'dSmoke_dt': sg_aug, 'dGas_dt': np.random.uniform(-0.5, 2.0)
        })

    # 2. Extreme Thermal Runaway / Near-Field Flame Saturation (80°C - 120°C, Class 4)
    for _ in range(2500):
        t_aug = np.random.uniform(75.0, 120.0)
        tg_aug = np.random.uniform(0.40, 2.50)
        s_aug = np.random.uniform(180.0, 850.0)
        sg_aug = np.random.uniform(5.0, 40.0)
        g_aug = np.random.uniform(250.0, 1100.0)
        h_aug = np.random.uniform(10.0, 35.0)
        flame_aug = np.random.uniform(0.65, 1.0)
        aug_records.append({
            'temp': t_aug, 'humidity': h_aug, 'smoke': s_aug, 'lpg_gas': g_aug, 'flame': flame_aug,
            'hazard_label': 4, 'dT_dt': tg_aug, 'dSmoke_dt': sg_aug, 'dGas_dt': np.random.uniform(2.0, 30.0)
        })

    # 3. Warm Kitchen Cooking Smoke (30°C - 42°C, Class 1)
    for _ in range(2500):
        t_aug = np.random.uniform(28.0, 42.0)
        tg_aug = np.random.uniform(-0.02, 0.05)  # Stable temperature, no thermal runaway!
        s_aug = np.random.uniform(90.0, 650.0)
        sg_aug = np.random.uniform(-1.0, 8.0)
        g_aug = np.random.uniform(20.0, 80.0)
        h_aug = np.random.uniform(45.0, 75.0)  # Often higher humidity from cooking steam
        flame_aug = 0.0
        aug_records.append({
            'temp': t_aug, 'humidity': h_aug, 'smoke': s_aug, 'lpg_gas': g_aug, 'flame': flame_aug,
            'hazard_label': 1, 'dT_dt': tg_aug, 'dSmoke_dt': sg_aug, 'dGas_dt': np.random.uniform(-0.5, 0.5)
        })

    # 4. Pure Optical Glints / Sunlight Rejection in Nominal Ambient (Class 0)
    for _ in range(1200):
        t_aug = np.random.uniform(18.0, 28.0)
        tg_aug = np.random.uniform(-0.02, 0.03)
        s_aug = np.random.uniform(15.0, 35.0)
        sg_aug = np.random.uniform(-0.5, 0.5)
        g_aug = np.random.uniform(20.0, 40.0)
        h_aug = np.random.uniform(40.0, 60.0)
        flame_aug = np.random.uniform(0.40, 0.95)  # Flashlight / sunlight reflection
        aug_records.append({
            'temp': t_aug, 'humidity': h_aug, 'smoke': s_aug, 'lpg_gas': g_aug, 'flame': flame_aug,
            'hazard_label': 0, 'dT_dt': tg_aug, 'dSmoke_dt': sg_aug, 'dGas_dt': np.random.uniform(-0.5, 0.5)
        })

    # Build primary dataframe
    base_df = pd.DataFrame({
        'timestamp_sec': np.arange(n_rows),
        'temp': np.round(temp, 2),
        'humidity': np.round(humidity, 1),
        'smoke': np.round(smoke, 1),
        'lpg_gas': np.round(lpg_gas, 1),
        'flame': np.round(flame, 2),
        'hazard_label': labels,
        'dT_dt': np.round(temp_grad, 3),
        'dSmoke_dt': np.round(smoke_grad, 2),
        'dGas_dt': np.round(gas_grad, 2)
    })

    aug_df = pd.DataFrame(aug_records)
    aug_df['timestamp_sec'] = np.arange(n_rows, n_rows + len(aug_df))

    # Combine base Kaggle data with physics augmentation
    full_df = pd.concat([base_df, aug_df], ignore_index=True)

    # Compute interaction features:
    # 1. Gas-to-Smoke Ratio (R_GS)
    full_df['gas_to_smoke_ratio'] = (full_df['lpg_gas'] + 1.0) / (full_df['smoke'] + 1.0)
    # 2. Thermal-Optical Cross-Product (I_TO)
    full_df['thermal_optical_interaction'] = full_df['flame'] * np.maximum(0.0, full_df['dT_dt'])

    full_df['dT_dt'] = np.round(full_df['dT_dt'], 3)
    full_df['dSmoke_dt'] = np.round(full_df['dSmoke_dt'], 2)
    full_df['dGas_dt'] = np.round(full_df['dGas_dt'], 2)
    full_df['gas_to_smoke_ratio'] = np.round(full_df['gas_to_smoke_ratio'], 3)
    full_df['thermal_optical_interaction'] = np.round(full_df['thermal_optical_interaction'], 3)

    class_names = {
        0: '0 - No Fire (Nominal)',
        1: '1 - Cooking Smoke',
        2: '2 - Gas Leak',
        3: '3 - Electrical Fire',
        4: '4 - LPG Fire'
    }
    print("\n[Harmonizer] Harmonized Class distribution:")
    total_len = len(full_df)
    for c_id, count in full_df['hazard_label'].value_counts().sort_index().items():
        print(f"  Class {class_names.get(c_id, str(c_id))}: {count} samples ({count/total_len*100:.1f}%)")

    # Save processed multiclass dataset
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    full_df.to_csv(output_csv, index=False)
    print(f"\n[Harmonizer] Processed dataset saved to: {output_csv} ({len(full_df)} rows)")

    # Extract clean benchmark replay runs (120 seconds each) for Viva Demonstration
    os.makedirs(benchmark_dir, exist_ok=True)

    def extract_benchmark_run(label_id, filename, duration=120):
        sub = full_df[full_df['hazard_label'] == label_id]
        if len(sub) >= duration:
            run = sub.iloc[:duration].copy()
        else:
            run = sub.copy()
        run['timestamp_sec'] = np.arange(len(run))
        path = os.path.join(benchmark_dir, filename)
        run.to_csv(path, index=False)
        print(f"  [Benchmark Run Saved] {filename}: {len(run)} frames -> {path}")

    print("\n[Harmonizer] Generating benchmark replay runs for Viva Demonstration:")
    extract_benchmark_run(0, "run1_nominal.csv", 120)
    extract_benchmark_run(1, "run2_cooking_smoke.csv", 120)
    extract_benchmark_run(2, "run3_gas_leak.csv", 120)
    extract_benchmark_run(3, "run4_electrical_fire.csv", 120)
    extract_benchmark_run(4, "run5_lpg_fire.csv", 120)
    print("[Harmonizer] Completed successfully.")

if __name__ == '__main__':
    input_p = "backend/data/smoke_detection_iot.csv"
    output_p = "backend/data/processed_multiclass_dataset.csv"
    bench_p = "backend/data/benchmark_runs"
    harmonize_kaggle_dataset(input_p, output_p, bench_p)
