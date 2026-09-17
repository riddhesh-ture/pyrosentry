import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CloudIcon from '@mui/icons-material/Cloud';
import PropaneIcon from '@mui/icons-material/Propane';
import { HistoricalTelemetryPoint } from '../types/telemetry';

interface RollingChartsProps {
  history: HistoricalTelemetryPoint[];
}

export const RollingCharts: React.FC<RollingChartsProps> = ({ history }) => {
  const width = 640;
  const height = 165;
  const padding = { top: 20, right: 35, bottom: 25, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const latest = history[history.length - 1];

  const buildSvgPath = (
    data: number[],
    minVal: number,
    maxVal: number
  ): { linePath: string; areaPath: string } => {
    if (data.length === 0) return { linePath: '', areaPath: '' };

    const span = Math.max(0.001, maxVal - minVal);
    const points = data.map((val, idx) => {
      const x = padding.left + (idx / Math.max(1, data.length - 1)) * chartW;
      const normalized = (val - minVal) / span;
      const y = padding.top + chartH - normalized * chartH;
      return [x, y];
    });

    const linePath = points.reduce(
      (acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`),
      ''
    );

    const firstX = points[0][0];
    const lastX = points[points.length - 1][0];
    const baseY = padding.top + chartH;
    const areaPath = `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    return { linePath, areaPath };
  };

  // Temperature & Humidity
  const temps = history.map((d) => d.temp);
  const hums = history.map((d) => d.humidity);
  const minTemp = Math.floor(Math.min(18, ...temps));
  const maxTemp = Math.ceil(Math.max(45, ...temps));
  const tempPaths = buildSvgPath(temps, minTemp, maxTemp);
  const humPaths = buildSvgPath(hums, 10, 95);

  // Smoke & Gas
  const smokes = history.map((d) => d.smoke);
  const gases = history.map((d) => d.lpg_gas);
  const maxGasSmoke = Math.ceil(Math.max(100, ...smokes, ...gases));
  const smokePaths = buildSvgPath(smokes, 0, maxGasSmoke);
  const gasPaths = buildSvgPath(gases, 0, maxGasSmoke);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
      {/* Chart 1: Thermal & Humidity */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeviceThermostatIcon sx={{ fontSize: 18, color: '#ff003c' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>
              THERMAL & HUMIDITY DYNAMICS (60s)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Typography variant="caption" sx={{ color: '#ff003c', fontWeight: 800, fontFamily: 'monospace' }}>
              {latest?.temp.toFixed(1) ?? '--'}°C
            </Typography>
            <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}>
              {latest?.humidity.toFixed(1) ?? '--'}%
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ backgroundColor: '#070b14', borderRadius: 1.5, border: '1px solid #1e293b' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff003c" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff003c" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={padding.left}
                y1={padding.top + chartH * pct}
                x2={padding.left + chartW}
                y2={padding.top + chartH * pct}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {humPaths.areaPath && <path d={humPaths.areaPath} fill="url(#humGrad)" />}
            {humPaths.linePath && <path d={humPaths.linePath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />}

            {tempPaths.areaPath && <path d={tempPaths.areaPath} fill="url(#tempGrad)" />}
            {tempPaths.linePath && <path d={tempPaths.linePath} fill="none" stroke="#ff003c" strokeWidth="2.5" strokeLinecap="round" />}

            <text x={padding.left - 6} y={padding.top + 8} fill="#ff003c" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              {maxTemp}°
            </text>
            <text x={padding.left - 6} y={padding.top + chartH} fill="#ff003c" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              {minTemp}°
            </text>

            <text x={padding.left + chartW + 6} y={padding.top + 8} fill="#38bdf8" fontSize="10" textAnchor="start" fontFamily="monospace" fontWeight="bold">
              95%
            </text>
            <text x={padding.left + chartW + 6} y={padding.top + chartH} fill="#38bdf8" fontSize="10" textAnchor="start" fontFamily="monospace" fontWeight="bold">
              10%
            </text>

            <text x={padding.left} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace">
              -60s
            </text>
            <text x={padding.left + chartW / 2} y={height - 8} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
              -30s
            </text>
            <text x={padding.left + chartW} y={height - 8} fill="#00f0ff" fontSize="9" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              NOW
            </text>
          </svg>
        </Box>
      </Paper>

      {/* Chart 2: Smoke & Gas */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudIcon sx={{ fontSize: 18, color: '#c084fc' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>
              SMOKE & COMBUSTIBLE GAS (60s)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Typography variant="caption" sx={{ color: '#c084fc', fontWeight: 800, fontFamily: 'monospace' }}>
              MQ-2: {latest?.smoke.toFixed(0) ?? '--'} ppm
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffb700', fontWeight: 800, fontFamily: 'monospace' }}>
              MQ-5: {latest?.lpg_gas.toFixed(0) ?? '--'} ppm
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ backgroundColor: '#070b14', borderRadius: 1.5, border: '1px solid #1e293b' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="smokeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb700" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffb700" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={padding.left}
                y1={padding.top + chartH * pct}
                x2={padding.left + chartW}
                y2={padding.top + chartH * pct}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {smokePaths.areaPath && <path d={smokePaths.areaPath} fill="url(#smokeGrad)" />}
            {smokePaths.linePath && <path d={smokePaths.linePath} fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />}

            {gasPaths.areaPath && <path d={gasPaths.areaPath} fill="url(#gasGrad)" />}
            {gasPaths.linePath && <path d={gasPaths.linePath} fill="none" stroke="#ffb700" strokeWidth="2" strokeLinecap="round" />}

            <text x={padding.left - 6} y={padding.top + 8} fill="#ffb700" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              {maxGasSmoke}
            </text>
            <text x={padding.left - 6} y={padding.top + chartH} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              0
            </text>

            <text x={padding.left} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace">
              -60s
            </text>
            <text x={padding.left + chartW / 2} y={height - 8} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
              -30s
            </text>
            <text x={padding.left + chartW} y={height - 8} fill="#00f0ff" fontSize="9" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              NOW
            </text>
          </svg>
        </Box>
      </Paper>
    </Box>
  );
};
