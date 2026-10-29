import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { RollingDerivatives, SensorReadings } from '../types/telemetry';

interface DerivativeMetersProps {
  derivatives: RollingDerivatives;
  sensors: SensorReadings;
}

export const DerivativeMeters: React.FC<DerivativeMetersProps> = ({
  derivatives,
  sensors,
}) => {
  const { dT_dt, dSmoke_dt, dGas_dt, gas_to_smoke_ratio } = derivatives;
  const { flame } = sensors;

  const isHighThermalRise = dT_dt >= 0.5;
  const isModerateThermalRise = dT_dt >= 0.2;
  const isHighSmokeRise = dSmoke_dt >= 15.0;
  const isHighGasRise = dGas_dt >= 20.0;
  const isFlameDetected = flame >= 0.4;

  const cards = [
    {
      title: 'dT/dt THERMAL',
      icon: <TrendingUpIcon sx={{ fontSize: 16, color: '#ff003c' }} />,
      value: dT_dt > 0 ? `+${dT_dt.toFixed(2)}` : dT_dt.toFixed(2),
      unit: '°C/s',
      color: isHighThermalRise ? '#ff003c' : isModerateThermalRise ? '#ffb700' : '#00f0ff',
      progress: Math.min(100, Math.max(0, (dT_dt / 2.0) * 100)),
      border: isHighThermalRise ? '1px solid #ff003c' : '1px solid #1e293b',
    },
    {
      title: 'dSMOKE/dt',
      icon: <ShowChartIcon sx={{ fontSize: 16, color: '#c084fc' }} />,
      value: dSmoke_dt > 0 ? `+${dSmoke_dt.toFixed(1)}` : dSmoke_dt.toFixed(1),
      unit: 'ppm/s',
      color: isHighSmokeRise ? '#c084fc' : '#ffffff',
      progress: Math.min(100, Math.max(0, (dSmoke_dt / 50.0) * 100)),
      border: isHighSmokeRise ? '1px solid #c084fc' : '1px solid #1e293b',
    },
    {
      title: 'dGAS/dt',
      icon: <ShowChartIcon sx={{ fontSize: 16, color: '#ffb700' }} />,
      value: dGas_dt > 0 ? `+${dGas_dt.toFixed(1)}` : dGas_dt.toFixed(1),
      unit: 'ppm/s',
      color: isHighGasRise ? '#ffb700' : '#ffffff',
      progress: Math.min(100, Math.max(0, (dGas_dt / 60.0) * 100)),
      border: isHighGasRise ? '1px solid #ffb700' : '1px solid #1e293b',
    },
    {
      title: 'R_GS RATIO',
      icon: <CompareArrowsIcon sx={{ fontSize: 16, color: '#38bdf8' }} />,
      value: gas_to_smoke_ratio.toFixed(2),
      unit: 'Gas/Smoke',
      color: '#38bdf8',
      progress: Math.min(100, (gas_to_smoke_ratio / 5.0) * 100),
      border: '1px solid #1e293b',
    },
    {
      title: 'FLAME OPTICAL IR',
      icon: <LocalFireDepartmentIcon sx={{ fontSize: 16, color: isFlameDetected ? '#ff003c' : '#64748b' }} />,
      value: (flame * 100).toFixed(0),
      unit: '% Ionization',
      color: isFlameDetected ? '#ff003c' : '#00ff66',
      progress: Math.min(100, flame * 100),
      border: isFlameDetected ? '1px solid #ff003c' : '1px solid #1e293b',
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
          DYNAMIC RATE-OF-RISE DERIVATIVES (SLIDING WINDOW W = 5s)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {sensors.temp > 80.0 && (
            <Chip
              label="DHT22 SENSOR SATURATED (>80°C)"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 900,
                backgroundColor: 'rgba(255, 0, 60, 0.2)',
                color: '#ff003c',
                border: '1px solid #ff003c',
              }}
            />
          )}
          <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            1ST-ORDER DISCRETE DIFFERENCES
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 1.5,
        }}
      >
        {cards.map((c, i) => (
          <Box
            key={i}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: '#090e1a',
              border: c.border,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                {c.title}
              </Typography>
              {c.icon}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, my: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: c.color, lineHeight: 1 }}>
                {c.value}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                {c.unit}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={c.progress}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: '#1e293b',
                mt: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: c.color,
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
