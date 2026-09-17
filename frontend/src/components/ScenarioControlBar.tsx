import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  IconButton,
  Stack,
  Chip,
  FormControl,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import TuneIcon from '@mui/icons-material/Tune';
import ScienceIcon from '@mui/icons-material/Science';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { TelemetryPacket } from '../types/telemetry';

interface ScenarioControlBarProps {
  packet: TelemetryPacket | null;
}

export const ScenarioControlBar: React.FC<ScenarioControlBarProps> = ({ packet }) => {
  const [activeScenario, setActiveScenario] = useState<string>('NOMINAL');
  const [activeMode, setActiveMode] = useState<string>('SIMULATION');
  const [replayFiles, setReplayFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('run1_nominal.csv');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [mq2Fault, setMq2Fault] = useState<boolean>(false);
  const [dht22Fault, setDht22Fault] = useState<boolean>(false);

  useEffect(() => {
    if (packet) {
      setActiveScenario(packet.active_scenario);
      setActiveMode(packet.mode);
      setMq2Fault(packet.faults.mq2_disconnected);
      setDht22Fault(packet.faults.dht22_frozen);
    }
  }, [packet]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/replay/files')
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setReplayFiles(data.files);
          if (data.active_file) setSelectedFile(data.active_file);
        }
      })
      .catch(() => {});
  }, []);

  const handleScenarioChange = async (scenario: string) => {
    setActiveScenario(scenario);
    setActiveMode('SIMULATION');
    await fetch('http://127.0.0.1:8000/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
  };

  const handleModeChange = async (mode: string) => {
    setActiveMode(mode);
    await fetch('http://127.0.0.1:8000/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  };

  const handleSelectReplayFile = async (filename: string) => {
    setSelectedFile(filename);
    setActiveMode('CSV_REPLAY');
    await fetch('http://127.0.0.1:8000/api/replay/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, action: 'play' }),
    });
  };

  const handleReplayControl = async (action: 'play' | 'pause' | 'rewind') => {
    if (action === 'play') setIsPlaying(true);
    if (action === 'pause') setIsPlaying(false);
    await fetch('http://127.0.0.1:8000/api/replay/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  };

  const handleFaultToggle = async (faultType: 'mq2_disconnected' | 'dht22_frozen') => {
    const nextState = faultType === 'mq2_disconnected' ? !mq2Fault : !dht22Fault;
    if (faultType === 'mq2_disconnected') setMq2Fault(nextState);
    if (faultType === 'dht22_frozen') setDht22Fault(nextState);

    await fetch('http://127.0.0.1:8000/api/fault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault_type: faultType, active: nextState }),
    });
  };

  const scenarios = [
    { id: 'NOMINAL', label: '1. Nominal Ambient', desc: 'Room equilibrium (24°C, flame=0)' },
    { id: 'COOKING_SMOKE', label: '2. Cooking Smoke', desc: 'Particulate spike, dT/dt ≈ 0, flame=0' },
    { id: 'GAS_LEAK', label: '3. LPG Gas Leak', desc: 'Combustible fuel spike, flame=0' },
    { id: 'ELECTRICAL_FIRE', label: '4. Electrical Fire', desc: 'Ohmic rise dT/dt > 0.4°C/s + smoke' },
    { id: 'LPG_FIRE', label: '5. Flashover / LPG Fire', desc: 'Compound catastrophe: gas + heat + flame' },
  ];

  return (
    <Paper sx={{ p: 2.5 }}>
      {/* Top Header & Mode Toggle */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: '1px solid #1e293b',
          pb: 1.5,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon sx={{ color: '#ffb700', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.05em', color: '#f8fafc' }}>
            TELEMETRY ENGINE & SIMULATION BENCH
          </Typography>
        </Box>

        {/* Mode Selector */}
        <ButtonGroup size="small" variant="outlined">
          <Button
            onClick={() => handleModeChange('SIMULATION')}
            startIcon={<ScienceIcon />}
            variant={activeMode === 'SIMULATION' ? 'contained' : 'outlined'}
            sx={{
              backgroundColor: activeMode === 'SIMULATION' ? '#00f0ff' : 'transparent',
              color: activeMode === 'SIMULATION' ? '#000000' : '#94a3b8',
              borderColor: '#00f0ff',
              fontWeight: 800,
              fontSize: '0.75rem',
            }}
          >
            PHYSICS DAQ SIMULATION
          </Button>
          <Button
            onClick={() => handleModeChange('CSV_REPLAY')}
            startIcon={<StorageIcon />}
            variant={activeMode === 'CSV_REPLAY' ? 'contained' : 'outlined'}
            sx={{
              backgroundColor: activeMode === 'CSV_REPLAY' ? '#ffb700' : 'transparent',
              color: activeMode === 'CSV_REPLAY' ? '#000000' : '#94a3b8',
              borderColor: '#ffb700',
              fontWeight: 800,
              fontSize: '0.75rem',
            }}
          >
            BENCHMARK CSV REPLAY
          </Button>
        </ButtonGroup>
      </Box>

      {/* Main Switcher: Presets or CSV Replay */}
      {activeMode === 'SIMULATION' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 1.5,
          }}
        >
          {scenarios.map((sc) => {
            const isSelected = activeScenario === sc.id;
            return (
              <Button
                key={sc.id}
                onClick={() => handleScenarioChange(sc.id)}
                variant={isSelected ? 'contained' : 'outlined'}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  p: 1.5,
                  textAlign: 'left',
                  backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.15)' : '#090e1a',
                  borderColor: isSelected ? '#00f0ff' : '#1e293b',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  boxShadow: isSelected ? '0 0 15px rgba(0, 240, 255, 0.25)' : 'none',
                  '&:hover': {
                    borderColor: '#334155',
                    backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.25)' : '#0f172a',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: isSelected ? '#00f0ff' : '#cbd5e1', fontSize: '0.8rem' }}>
                  {sc.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', mt: 0.5, lineHeight: 1.2 }}>
                  {sc.desc}
                </Typography>
              </Button>
            );
          })}
        </Box>
      ) : (
        /* CSV Replay Controls */
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            backgroundColor: '#090e1a',
            p: 1.5,
            borderRadius: 1.5,
            border: '1px solid #1e293b',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>
              REPLAY DATASET:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <Select
                value={selectedFile}
                onChange={(e) => handleSelectReplayFile(e.target.value)}
                sx={{
                  backgroundColor: '#0c1322',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  border: '1px solid #334155',
                }}
              >
                {replayFiles.map((f) => (
                  <MenuItem key={f} value={f} sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {f}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={isPlaying ? 'contained' : 'outlined'}
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleReplayControl('play')}
              sx={{ fontWeight: 800 }}
            >
              PLAY
            </Button>
            <Button
              size="small"
              variant={!isPlaying ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<PauseIcon />}
              onClick={() => handleReplayControl('pause')}
              sx={{ fontWeight: 800 }}
            >
              PAUSE
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={() => handleReplayControl('rewind')}
              sx={{ borderColor: '#334155', color: '#94a3b8', fontWeight: 800 }}
            >
              REWIND
            </Button>
          </Stack>
        </Box>
      )}

      {/* Sensor Fault Injections */}
      <Divider sx={{ my: 1.5, borderColor: '#1e293b' }} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: '#ff003c', fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>
            HARDWARE DIAGNOSTIC / FAULT EMULATION:
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant={mq2Fault ? 'contained' : 'outlined'}
            color="error"
            onClick={() => handleFaultToggle('mq2_disconnected')}
            sx={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            {mq2Fault ? 'FAULT: MQ-2 DISCONNECTED' : 'DISCONNECT MQ-2'}
          </Button>

          <Button
            size="small"
            variant={dht22Fault ? 'contained' : 'outlined'}
            color="info"
            onClick={() => handleFaultToggle('dht22_frozen')}
            sx={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            {dht22Fault ? 'FAULT: DHT22 SENSOR FROZEN' : 'FREEZE DHT22'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};
