import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import SouthEastIcon from '@mui/icons-material/SouthEast';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FeatureAttribution } from '../types/telemetry';

interface XaiWaterfallPanelProps {
  attributions: FeatureAttribution[];
  predictedClass: string;
}

export const XaiWaterfallPanel: React.FC<XaiWaterfallPanelProps> = ({
  attributions,
  predictedClass,
}) => {
  const maxAbs = Math.max(0.01, ...attributions.map((a) => a.abs_impact));

  const friendlyNames: Record<string, string> = {
    temp: 'DHT22 Temperature (°C)',
    humidity: 'DHT22 Humidity (%)',
    smoke: 'MQ-2 Smoke Density (ppm)',
    lpg_gas: 'MQ-5 Gas Concentration (ppm)',
    flame: 'Optical IR Flame Level (0-1)',
    dT_dt: 'Rate-of-Rise dT/dt (°C/s)',
    dSmoke_dt: 'Rate-of-Rise dSmoke/dt (ppm/s)',
    dGas_dt: 'Rate-of-Rise dGas/dt (ppm/s)',
    gas_to_smoke_ratio: 'Gas-to-Smoke Ratio (R_GS)',
    thermal_optical_interaction: 'Thermal-Optical Cross Product',
  };

  return (
    <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon sx={{ fontSize: 20, color: '#00f0ff' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            EXPLAINABLE AI (XAI) ATTRIBUTION
          </Typography>
        </Box>
        <Chip
          label="TREESHAP PROXY"
          size="small"
          sx={{ backgroundColor: '#090e1a', color: '#00f0ff', border: '1px solid #00f0ff40', fontSize: '0.65rem', height: 20 }}
        />
      </Box>

      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5, lineHeight: 1.3 }}>
        Decomposes the Random Forest ensemble decision paths into signed local feature contributions (&phi;). Positive bars push toward <strong>{predictedClass}</strong>.
      </Typography>

      {/* Feature Waterfall Items */}
      <Stack spacing={1.2}>
        {attributions.slice(0, 6).map((item) => {
          const isPositive = item.direction === 'positive';
          const barWidthPct = Math.min(100, Math.round((item.abs_impact / maxAbs) * 100));
          const displayName = friendlyNames[item.feature] || item.feature;

          return (
            <Box
              key={item.feature}
              sx={{
                p: 1.2,
                borderRadius: 1.5,
                backgroundColor: '#090e1a',
                border: '1px solid #1e293b',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  {isPositive ? (
                    <NorthEastIcon sx={{ fontSize: 14, color: '#ff003c' }} />
                  ) : (
                    <SouthEastIcon sx={{ fontSize: 14, color: '#00f0ff' }} />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                    {displayName}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                    Val: <strong style={{ color: '#ffffff' }}>{item.current_value}</strong>
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: isPositive ? '#ff003c' : '#00f0ff',
                      fontSize: '0.72rem',
                    }}
                  >
                    {item.contribution >= 0 ? `+${item.contribution.toFixed(4)}` : item.contribution.toFixed(4)}
                  </Typography>
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={barWidthPct}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#1e293b',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isPositive ? '#ff003c' : '#00f0ff',
                  },
                }}
              />
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <InfoOutlinedIcon sx={{ fontSize: 14, color: '#64748b' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#64748b' }}>
            Decision paths computed in &lt; 2 ms
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#64748b' }}>
          &Sigma;&phi; = P(y) - P_base
        </Typography>
      </Box>
    </Paper>
  );
};
