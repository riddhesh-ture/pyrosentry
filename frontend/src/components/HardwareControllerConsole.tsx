import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CloudIcon from '@mui/icons-material/Cloud';
import PropaneIcon from '@mui/icons-material/Propane';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TerminalIcon from '@mui/icons-material/Terminal';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StorageIcon from '@mui/icons-material/Storage';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { TelemetryPacket } from '../types/telemetry';
import { soundService } from '../utils/soundService';

interface HardwareControllerConsoleProps {
  packet: TelemetryPacket | null;
}

export const HardwareControllerConsole: React.FC<HardwareControllerConsoleProps> = ({
  packet,
}) => {
  // Manual slider states
  const [manualEnabled, setManualEnabled] = useState<boolean>(false);
  const [temp, setTemp] = useState<number>(24.5);
  const [humidity, setHumidity] = useState<number>(52.0);
  const [smoke, setSmoke] = useState<number>(20.0);
  const [gas, setGas] = useState<number>(25.0);
  const [flame, setFlame] = useState<number>(0.0);

  // Hardware fault states
  const [mq2Fault, setMq2Fault] = useState<boolean>(false);
  const [dht22Fault, setDht22Fault] = useState<boolean>(false);

  // CSV Replay states
  const [replayFiles, setReplayFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('run1_nominal.csv');
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(true);

  // Terminal log stream
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTerminalPaused, setIsTerminalPaused] = useState<boolean>(false);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch benchmark CSV runs on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/replay/files')
      .then((res) => res.json())
      .then((data) => {
        if (data.files && data.files.length > 0) {
          setReplayFiles(data.files);
          if (data.active_file) setSelectedFile(data.active_file);
        }
      })
      .catch(() => {});
  }, []);

  // Sync initial values from packet if not in manual mode
  useEffect(() => {
    if (packet && !manualEnabled) {
      setTemp(packet.sensors.temp);
      setHumidity(packet.sensors.humidity);
      setSmoke(packet.sensors.smoke);
      setGas(packet.sensors.lpg_gas);
      setFlame(packet.sensors.flame);
      setMq2Fault(packet.faults.mq2_disconnected);
      setDht22Fault(packet.faults.dht22_frozen);
    }
  }, [packet, manualEnabled]);

  // Append virtual serial packets to terminal at 1 Hz
  useEffect(() => {
    if (packet && !isTerminalPaused) {
      const now = packet.timestamp;
      const jsonPacket = JSON.stringify({
        node_id: 'ESP32-SENTRY-01',
        baud: 115200,
        temp: packet.sensors.temp,
        hum: packet.sensors.humidity,
        smoke_ppm: packet.sensors.smoke,
        lpg_ppm: packet.sensors.lpg_gas,
        flame: packet.sensors.flame,
        frame: packet.frame_id,
      });

      setTerminalLogs((prev) => {
        const next = [...prev, `[${now}] TX UART >> ${jsonPacket}`];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
    }
  }, [packet?.frame_id, isTerminalPaused]);

  // Auto-scroll terminal inside its own container without scrolling the browser page
  useEffect(() => {
    if (!isTerminalPaused && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs, isTerminalPaused]);

  // Dispatch manual slider updates to backend API
  const sendManualUpdate = async (overrides: Partial<{
    temp: number;
    humidity: number;
    smoke: number;
    lpg_gas: number;
    flame: number;
  }>) => {
    const payload = {
      enabled: true,
      temp: overrides.temp ?? temp,
      humidity: overrides.humidity ?? humidity,
      smoke: overrides.smoke ?? smoke,
      lpg_gas: overrides.lpg_gas ?? gas,
      flame: overrides.flame ?? flame,
    };

    try {
      await fetch('http://127.0.0.1:8000/api/simulator/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to update manual simulator values:', e);
    }
  };

  const handleToggleManual = (enabled: boolean) => {
    setManualEnabled(enabled);
    if (!enabled) {
      fetch('http://127.0.0.1:8000/api/simulator/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
    } else {
      sendManualUpdate({});
    }
  };

  const handleResetToAmbient = async () => {
    setManualEnabled(false);
    await fetch('http://127.0.0.1:8000/api/simulator/reset', { method: 'POST' });
  };

  const handleScenarioPreset = async (scenario: string) => {
    setManualEnabled(false);
    await fetch('http://127.0.0.1:8000/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
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

  const handleSelectReplayFile = async (filename: string) => {
    setSelectedFile(filename);
    setManualEnabled(false);
    await fetch('http://127.0.0.1:8000/api/replay/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, action: 'play' }),
    });
  };

  const handleReplayControl = async (action: 'play' | 'pause' | 'rewind') => {
    if (action === 'play') setIsReplayPlaying(true);
    if (action === 'pause') setIsReplayPlaying(false);
    await fetch('http://127.0.0.1:8000/api/replay/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Top Banner: Node ID, Mode, and Dual Screen launcher */}
      <Paper sx={{ p: 2.5, border: '1px solid #1e293b', backgroundColor: '#0b0f19' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid #1e293b',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                backgroundColor: 'rgba(0, 240, 255, 0.12)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                display: 'flex',
              }}
            >
              <MemoryIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                  VIRTUAL EDGE SENSOR DAQ & HARDWARE CONTROLLER
                </Typography>
                <Chip
                  label="ESP32-SENTRY-01"
                  size="small"
                  sx={{ backgroundColor: '#1e293b', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800 }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                UART Bus: 115200 Baud • 1 Hz Edge Sampling • Multi-Sensor Injection Engine
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open('/', '_blank')}
              sx={{
                backgroundColor: '#00f0ff',
                color: '#000000',
                fontWeight: 900,
                fontSize: '0.75rem',
                '&:hover': { backgroundColor: '#38bdf8' },
              }}
            >
              LAUNCH LIVE SCADA MONITOR ↗
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<VolumeUpIcon />}
              onClick={() => soundService.testAlarm(2.5)}
              sx={{
                borderColor: '#ff003c',
                color: '#ff003c',
                fontWeight: 800,
                fontSize: '0.75rem',
                '&:hover': { borderColor: '#ff4d6d', backgroundColor: 'rgba(255,0,60,0.1)' },
              }}
            >
              TEST SIREN AUDIO
            </Button>

            <FormControlLabel
              control={
                <Switch
                  checked={manualEnabled}
                  onChange={(e) => handleToggleManual(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 800, color: manualEnabled ? '#00f0ff' : '#94a3b8' }}>
                  {manualEnabled ? 'MANUAL FADERS' : 'AUTO PHYSICS'}
                </Typography>
              }
            />

            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleResetToAmbient}
              sx={{ fontWeight: 800, borderColor: '#334155', color: '#94a3b8' }}
            >
              RESET AMBIENT
            </Button>
          </Stack>
        </Box>

        {/* Rapid Hazard Scenario Presets */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 1 }}>
            AUTOMATED HAZARD CURVE INJECTORS:
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 1.5,
            }}
          >
            {[
              { id: 'NOMINAL', label: '1. Nominal Ambient', desc: '24°C, normal baseline' },
              { id: 'COOKING_SMOKE', label: '2. Cooking Vapors', desc: '350 ppm smoke, flame=0' },
              { id: 'GAS_LEAK', label: '3. LPG Gas Leak', desc: '850 ppm gas, flame=0' },
              { id: 'ELECTRICAL_FIRE', label: '4. Electrical Short', desc: '48°C ohmic rise + smoke' },
              { id: 'LPG_FIRE', label: '5. LPG Flashover', desc: '78°C + 950 gas + Flame=1' },
            ].map((sc) => (
              <Button
                key={sc.id}
                onClick={() => handleScenarioPreset(sc.id)}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 1,
                  px: 1.5,
                  borderRadius: 1.5,
                  borderColor: '#1e293b',
                  backgroundColor: '#070a13',
                  textTransform: 'none',
                  textAlign: 'left',
                  '&:hover': {
                    borderColor: '#00f0ff',
                    backgroundColor: 'rgba(0, 240, 255, 0.05)',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#00f0ff', fontSize: '0.8rem' }}>
                  {sc.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {sc.desc}
                </Typography>
              </Button>
            ))}
          </Box>
        </Box>

        {/* CSV Benchmark Dataset Replay Suite */}
        {replayFiles.length > 0 && (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed #1e293b' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon sx={{ color: '#00ff66', fontSize: 18 }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>
                  BENCHMARK DATASET REPLAY (NIST / KAGGLE IOT RUNS):
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <Select
                    value={selectedFile}
                    onChange={(e) => handleSelectReplayFile(e.target.value)}
                    sx={{
                      fontSize: '0.75rem',
                      height: 32,
                      backgroundColor: '#070a13',
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                    }}
                  >
                    {replayFiles.map((file) => (
                      <MenuItem key={file} value={file} sx={{ fontSize: '0.75rem' }}>
                        {file}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <ButtonGroup size="small" variant="outlined">
                  <Button
                    onClick={() => handleReplayControl('play')}
                    sx={{ color: isReplayPlaying ? '#00ff66' : '#94a3b8', borderColor: '#1e293b' }}
                  >
                    <PlayArrowIcon fontSize="small" />
                  </Button>
                  <Button
                    onClick={() => handleReplayControl('pause')}
                    sx={{ color: !isReplayPlaying ? '#ffb700' : '#94a3b8', borderColor: '#1e293b' }}
                  >
                    <PauseIcon fontSize="small" />
                  </Button>
                  <Button
                    onClick={() => handleReplayControl('rewind')}
                    sx={{ color: '#94a3b8', borderColor: '#1e293b' }}
                  >
                    <ReplayIcon fontSize="small" />
                  </Button>
                </ButtonGroup>
              </Stack>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Manual Sensor Faders (Dual Panel) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
        {/* Left Faders: DHT22 Temperature & Humidity */}
        <Paper sx={{ p: 2.5, backgroundColor: '#0b0f19', border: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DeviceThermostatIcon sx={{ color: '#ff003c', fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              DHT22 THERMAL & HUMIDITY FADERS
            </Typography>
          </Box>

          {/* Temperature Slider */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                Temperature (°C)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: temp > 50 ? '#ff003c' : '#00f0ff', fontFamily: 'monospace' }}>
                {temp.toFixed(1)} °C
              </Typography>
            </Box>
            <Slider
              value={temp}
              min={15}
              max={95}
              step={0.5}
              onChange={(_, val) => {
                const v = val as number;
                setTemp(v);
                if (manualEnabled) sendManualUpdate({ temp: v });
              }}
              sx={{
                color: temp > 50 ? '#ff003c' : '#00f0ff',
                '& .MuiSlider-thumb': {
                  boxShadow: temp > 50 ? '0 0 10px #ff003c' : '0 0 10px #00f0ff',
                },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              {[
                { label: 'Room (24°)', val: 24 },
                { label: 'Smolder (42°)', val: 42 },
                { label: 'Firestorm (78°)', val: 78 },
              ].map((pt) => (
                <Button
                  key={pt.label}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setTemp(pt.val);
                    if (manualEnabled) sendManualUpdate({ temp: pt.val });
                  }}
                  sx={{ fontSize: '0.68rem', py: 0.2, px: 1, borderColor: '#1e293b', color: '#94a3b8' }}
                >
                  {pt.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Humidity Slider */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                Relative Humidity (%)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                {humidity.toFixed(0)} %
              </Typography>
            </Box>
            <Slider
              value={humidity}
              min={10}
              max={95}
              step={1}
              onChange={(_, val) => {
                const v = val as number;
                setHumidity(v);
                if (manualEnabled) sendManualUpdate({ humidity: v });
              }}
              sx={{ color: '#38bdf8' }}
            />
          </Box>
        </Paper>

        {/* Right Faders: Gas, Smoke & Flame */}
        <Paper sx={{ p: 2.5, backgroundColor: '#0b0f19', border: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PropaneIcon sx={{ color: '#ffb700', fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              GAS, AEROSOL & OPTICAL FLAME FADERS
            </Typography>
          </Box>

          {/* Smoke Slider */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                MQ-2 Smoke Density (ppm)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#a855f7', fontFamily: 'monospace' }}>
                {smoke.toFixed(0)} ppm
              </Typography>
            </Box>
            <Slider
              value={smoke}
              min={0}
              max={1500}
              step={10}
              onChange={(_, val) => {
                const v = val as number;
                setSmoke(v);
                if (manualEnabled) sendManualUpdate({ smoke: v });
              }}
              sx={{ color: '#a855f7' }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              {[
                { label: 'Ambient (20)', val: 20 },
                { label: 'Cooking (380)', val: 380 },
                { label: 'Heavy Fire (850)', val: 850 },
              ].map((pt) => (
                <Button
                  key={pt.label}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSmoke(pt.val);
                    if (manualEnabled) sendManualUpdate({ smoke: pt.val });
                  }}
                  sx={{ fontSize: '0.68rem', py: 0.2, px: 1, borderColor: '#1e293b', color: '#94a3b8' }}
                >
                  {pt.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Combustible LPG Gas Slider */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                MQ-5 Combustible LPG Gas (ppm)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#ffb700', fontFamily: 'monospace' }}>
                {gas.toFixed(0)} ppm
              </Typography>
            </Box>
            <Slider
              value={gas}
              min={0}
              max={2000}
              step={10}
              onChange={(_, val) => {
                const v = val as number;
                setGas(v);
                if (manualEnabled) sendManualUpdate({ lpg_gas: v });
              }}
              sx={{ color: '#ffb700' }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              {[
                { label: 'Safe (25)', val: 25 },
                { label: 'Gas Leak (750)', val: 750 },
                { label: 'Saturated (1400)', val: 1400 },
              ].map((pt) => (
                <Button
                  key={pt.label}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setGas(pt.val);
                    if (manualEnabled) sendManualUpdate({ lpg_gas: pt.val });
                  }}
                  sx={{ fontSize: '0.68rem', py: 0.2, px: 1, borderColor: '#1e293b', color: '#94a3b8' }}
                >
                  {pt.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Flame Sensor Slider */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                Optical IR Flame Intensity (0.0 to 1.0)
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  color: flame > 0.4 ? '#ff003c' : '#00ff66',
                  fontFamily: 'monospace',
                }}
              >
                {flame > 0.4 ? `${(flame * 100).toFixed(0)}% FLAME DETECTED` : '0% NO FLAME'}
              </Typography>
            </Box>
            <Slider
              value={flame}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, val) => {
                const v = val as number;
                setFlame(v);
                if (manualEnabled) sendManualUpdate({ flame: v });
              }}
              sx={{ color: flame > 0.4 ? '#ff003c' : '#00ff66' }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Sensor Fault Injections & Live Serial Terminal */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' }, gap: 2.5 }}>
        {/* Fault Injection Panel */}
        <Paper sx={{ p: 2.5, backgroundColor: '#0b0f19', border: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WarningAmberIcon sx={{ color: '#ff003c', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              SENSOR FAULT EMULATION
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
            Simulate hardware wiring failures and frozen I2C/OneWire buses to demonstrate system resilience.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant={mq2Fault ? 'contained' : 'outlined'}
              color="error"
              size="small"
              onClick={() => handleFaultToggle('mq2_disconnected')}
              sx={{
                justifyContent: 'flex-start',
                fontWeight: 800,
                fontSize: '0.75rem',
                backgroundColor: mq2Fault ? '#ff003c' : 'transparent',
                borderColor: '#ff003c',
                color: mq2Fault ? '#ffffff' : '#ff003c',
              }}
            >
              {mq2Fault ? 'RECONNECT MQ-2 SENSOR' : 'DISCONNECT MQ-2 ANALOG PIN'}
            </Button>

            <Button
              variant={dht22Fault ? 'contained' : 'outlined'}
              color="warning"
              size="small"
              onClick={() => handleFaultToggle('dht22_frozen')}
              sx={{
                justifyContent: 'flex-start',
                fontWeight: 800,
                fontSize: '0.75rem',
                backgroundColor: dht22Fault ? '#ffb700' : 'transparent',
                borderColor: '#ffb700',
                color: dht22Fault ? '#000000' : '#ffb700',
              }}
            >
              {dht22Fault ? 'UNFREEZE DHT22 BUS' : 'FREEZE DHT22 DIGITAL BUS'}
            </Button>
          </Stack>
        </Paper>

        {/* Live ESP32 UART Terminal */}
        <Paper sx={{ p: 2, backgroundColor: '#0b0f19', border: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon sx={{ color: '#00ff66', fontSize: 20 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                VIRTUAL UART SERIAL BUS (115200 BAUD JSON STREAM)
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => setIsTerminalPaused(!isTerminalPaused)} sx={{ color: '#94a3b8' }}>
                {isTerminalPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" onClick={() => setTerminalLogs([])} sx={{ color: '#94a3b8' }}>
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          <Box
            ref={terminalContainerRef}
            sx={{
              backgroundColor: '#05070d',
              borderRadius: 1.5,
              p: 1.5,
              height: 180,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              color: '#38bdf8',
              lineHeight: 1.6,
              border: '1px solid #1e293b',
            }}
          >
            {terminalLogs.length === 0 ? (
              <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic' }}>
                Waiting for serial packets from edge daemon...
              </Typography>
            ) : (
              terminalLogs.map((log, idx) => (
                <Box key={idx} sx={{ whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#64748b' }}>{log.substring(0, 10)}</span>
                  <span style={{ color: '#00ff66' }}>{log.substring(10, 24)}</span>
                  <span style={{ color: '#f8fafc' }}>{log.substring(24)}</span>
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
