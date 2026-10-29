export interface SensorReadings {
  temp: number;
  humidity: number;
  smoke: number;
  lpg_gas: number;
  flame: number;
}

export interface RollingDerivatives {
  dT_dt: number;
  dSmoke_dt: number;
  dGas_dt: number;
  gas_to_smoke_ratio: number;
  thermal_optical_interaction: number;
}

export interface FeatureAttribution {
  feature: string;
  current_value: number;
  contribution: number;
  direction: 'positive' | 'negative';
  abs_impact: number;
}

export interface HazardPrediction {
  predicted_class: 'No Fire' | 'Cooking Smoke' | 'Gas Leak' | 'Electrical Fire' | 'LPG Fire';
  class_index: number;
  confidence: number;
  probabilities: {
    'No Fire': number;
    'Cooking Smoke': number;
    'Gas Leak': number;
    'Electrical Fire': number;
    'LPG Fire': number;
  };
  risk_score: number;
  alert_tier: 'LOW' | 'MEDIUM' | 'CRITICAL';
  driving_factors: string[];
}

export interface AlertState {
  alert_tier: 'LOW' | 'MEDIUM' | 'CRITICAL';
  buzzer_active: boolean;
  escalation_level: number;
  acknowledged: boolean;
  message: string;
}

export interface SensorFaultState {
  mq2_disconnected: boolean;
  dht22_frozen: boolean;
  dht22_saturated?: boolean;
}

export interface TelemetryPacket {
  timestamp: string;
  frame_id: number;
  mode: 'SIMULATION' | 'CSV_REPLAY' | 'HARDWARE_SERIAL';
  hardware_source?: string;
  active_scenario: string;
  sensors: SensorReadings;
  derivatives: RollingDerivatives;
  prediction: HazardPrediction;
  xai_attributions: FeatureAttribution[];
  alert_state: AlertState;
  faults: SensorFaultState;
}

export interface HistoricalTelemetryPoint {
  time: string;
  frame_id: number;
  temp: number;
  humidity: number;
  smoke: number;
  lpg_gas: number;
  flame: number;
  dT_dt: number;
  dSmoke_dt: number;
  risk_score: number;
}

export interface VivaMetrics {
  model_architecture: string;
  n_estimators: number;
  max_depth: number;
  features: string[];
  classes: string[];
  overall_accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  confusion_matrix: number[][];
  classification_report: Record<string, {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  }>;
  feature_importances: [string, number][];
  dataset_sample_count: number;
  train_sample_count: number;
  test_sample_count: number;
}
