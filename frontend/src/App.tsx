import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
import { darkTheme } from './theme';
import { useTelemetryWs } from './hooks/useTelemetryWs';
import { Header } from './components/Header';
import { RiskGauge } from './components/RiskGauge';
import { HazardClassificationHUD } from './components/HazardClassificationHUD';
import { DerivativeMeters } from './components/DerivativeMeters';
import { RollingCharts } from './components/RollingCharts';
import { XaiWaterfallPanel } from './components/XaiWaterfallPanel';
import { HardwareControllerConsole } from './components/HardwareControllerConsole';
import { ModelAuditModal } from './components/ModelAuditModal';
import { EmergencyHUDModal } from './components/EmergencyHUDModal';

const isControllerRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path.startsWith('/controller') || hash.includes('controller');
};

export default function App() {
  const { packet, history, connectionStatus, latencyMs } = useTelemetryWs();
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'MONITORING' | 'CONTROLLER'>(
    isControllerRoute() ? 'CONTROLLER' : 'MONITORING'
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentView(isControllerRoute() ? 'CONTROLLER' : 'MONITORING');
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleViewChange = (view: 'MONITORING' | 'CONTROLLER') => {
    setCurrentView(view);
    const targetPath = view === 'CONTROLLER' ? '/controller' : '/';
    window.history.pushState(null, '', targetPath);
  };

  const defaultSensors = { temp: 24.0, humidity: 50.0, smoke: 20.0, lpg_gas: 25.0, flame: 0.0 };
  const defaultDerivatives = {
    dT_dt: 0.0,
    dSmoke_dt: 0.0,
    dGas_dt: 0.0,
    gas_to_smoke_ratio: 1.0,
    thermal_optical_interaction: 0.0,
  };
  const defaultPrediction = {
    predicted_class: 'No Fire' as const,
    class_index: 0,
    confidence: 1.0,
    probabilities: {
      'No Fire': 1.0,
      'Cooking Smoke': 0.0,
      'Gas Leak': 0.0,
      'Electrical Fire': 0.0,
      'LPG Fire': 0.0,
    },
    risk_score: 0.0,
    alert_tier: 'LOW' as const,
    driving_factors: ['Environmental telemetry within nominal boundaries'],
  };

  const sensors = packet?.sensors ?? defaultSensors;
  const derivatives = packet?.derivatives ?? defaultDerivatives;
  const prediction = packet?.prediction ?? defaultPrediction;
  const attributions = packet?.xai_attributions ?? [];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#070a13', pb: 6 }}>
        {/* Enterprise SCADA Header with Clean Navigation */}
        <Header
          packet={packet}
          connectionStatus={connectionStatus}
          latencyMs={latencyMs}
          currentView={currentView}
          onViewChange={handleViewChange}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
        />

        {/* Floating Emergency HUD for Critical Alert with Acoustic Siren */}
        <EmergencyHUDModal alertState={packet?.alert_state} prediction={packet?.prediction} />

        {/* Main View Container */}
        <Container maxWidth="xl" sx={{ mt: 3, px: { xs: 2, md: 3 } }}>
          {currentView === 'MONITORING' ? (
            /* Authentic SCADA Monitoring HUD: Telemetry Only, Zero Mock Controls */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* 1. Top Row: Risk Gauge (Left) & Hazard Classification HUD (Right) */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, gap: 2.5 }}>
                <RiskGauge
                  score={prediction.risk_score}
                  tier={prediction.alert_tier}
                  buzzerActive={packet?.alert_state.buzzer_active ?? false}
                  acknowledged={packet?.alert_state.acknowledged ?? false}
                />
                <HazardClassificationHUD prediction={prediction} />
              </Box>

              {/* 2. Middle Row: Dynamic Rate-of-Rise Derivative Meters */}
              <DerivativeMeters derivatives={derivatives} sensors={sensors} />

              {/* 3. Bottom Row: 60s Sliding Telemetry Charts & XAI Waterfall Panel */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 2.5 }}>
                <RollingCharts history={history} />
                <XaiWaterfallPanel attributions={attributions} predictedClass={prediction.predicted_class} />
              </Box>
            </Box>
          ) : (
            /* Dedicated Virtual Edge Sensor DAQ & Hardware Controller View */
            <HardwareControllerConsole packet={packet} />
          )}
        </Container>

        {/* Enterprise Model Specifications & Audit Dialog */}
        <ModelAuditModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} />
      </Box>
    </ThemeProvider>
  );
}
