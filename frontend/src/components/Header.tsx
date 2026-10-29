import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Tooltip,
  Divider,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LaunchIcon from '@mui/icons-material/Launch';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { TelemetryPacket } from '../types/telemetry';
import { soundService } from '../utils/soundService';

interface HeaderProps {
  packet: TelemetryPacket | null;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'CONNECTING';
  latencyMs: number;
  currentView: 'MONITORING' | 'CONTROLLER';
  onViewChange: (view: 'MONITORING' | 'CONTROLLER') => void;
  onOpenAuditModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  packet,
  connectionStatus,
  latencyMs,
  currentView,
  onViewChange,
  onOpenAuditModal,
}) => {
  const isConnected = connectionStatus === 'CONNECTED';
  const isCritical = packet?.prediction.alert_tier === 'CRITICAL';
  const [isAudioMuted, setIsAudioMuted] = useState(soundService.getMuted());

  const handleToggleAudio = () => {
    const nextMuted = soundService.toggleMute();
    setIsAudioMuted(nextMuted);
    if (!nextMuted) {
      soundService.playBeep(1046, 0.1);
    }
  };

  const handleOpenControllerInNewTab = () => {
    window.open('/controller', '_blank');
  };

  const handleOpenDashboardInNewTab = () => {
    window.open('/', '_blank');
  };

  return (
    <Box
      component="header"
      sx={{
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#090e1a',
        px: { xs: 2, md: 3.5 },
        py: 1.2,
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <Box
        sx={{
          maxWidth: '1720px',
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left: Branding & Tagline */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 'fit-content' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isCritical ? 'rgba(255, 0, 60, 0.2)' : 'rgba(0, 240, 255, 0.1)',
              border: isCritical ? '1px solid #ff003c' : '1px solid rgba(0, 240, 255, 0.35)',
              color: isCritical ? '#ff003c' : '#00f0ff',
              boxShadow: isCritical ? '0 0 12px rgba(255,0,60,0.4)' : 'none',
            }}
          >
            <LocalFireDepartmentIcon sx={{ fontSize: 26 }} />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  color: '#ffffff',
                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                  lineHeight: 1.2,
                }}
              >
                PYROSENTRY <span style={{ color: '#00f0ff' }}>AI</span>
              </Typography>
              <Chip
                label={currentView === 'MONITORING' ? 'SCADA TELEMETRY' : 'HARDWARE DAQ'}
                size="small"
                sx={{
                  backgroundColor: '#1e293b',
                  color: currentView === 'MONITORING' ? '#00f0ff' : '#ffb700',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  height: 18,
                  letterSpacing: '0.06em',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                display: { xs: 'none', lg: 'block' },
                fontSize: '0.7rem',
                letterSpacing: '0.02em',
              }}
            >
              MULTI-SENSOR FUSION • RATE-OF-RISE DERIVATIVES • EXPLAINABLE AI (XAI)
            </Typography>
          </Box>
        </Box>

        {/* Right: Consolidated Telemetry Status Capsule & Action Buttons */}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            flexWrap: 'nowrap',
            overflowX: 'auto',
            py: 0.2,
          }}
        >
          {/* Unified Live Telemetry Capsule */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1.2,
              px: 1.5,
              height: 32,
              borderRadius: 1.5,
              backgroundColor: '#0c1322',
              border: '1px solid #1e293b',
            }}
          >
            {/* Pulsing Status Dot */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#00ff66' : '#ff003c',
                  boxShadow: isConnected ? '0 0 8px #00ff66' : 'none',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isConnected ? '#00ff66' : '#ff003c',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                }}
              >
                {isConnected ? 'ONLINE 1 Hz' : connectionStatus}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ borderColor: '#1e293b', my: 0.6 }} />

            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: { xs: 'none', md: 'block' },
              }}
            >
              SRC: <span style={{ color: packet?.hardware_source?.includes('ESP32') ? '#00ff66' : '#38bdf8' }}>
                {packet?.hardware_source?.includes('ESP32') ? packet.hardware_source : 'DEMO CONTROLLER'}
              </span>
            </Typography>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: '#1e293b', my: 0.6, display: { xs: 'none', md: 'block' } }}
            />

            <Typography
              variant="caption"
              sx={{
                color: '#00f0ff',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              FRAME #{packet?.frame_id ?? '---'}
            </Typography>
          </Box>

          {/* Acoustic Siren Toggle Button */}
          <Tooltip title={isAudioMuted ? 'Acoustic Siren: MUTED (Click to Unmute)' : 'Acoustic Siren: ARMED (Click to Mute / Test)'}>
            <Button
              size="small"
              onClick={handleToggleAudio}
              startIcon={isAudioMuted ? <VolumeOffIcon sx={{ fontSize: 16 }} /> : <VolumeUpIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 32,
                px: 1.2,
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: isAudioMuted ? '#7f1d1d' : 'rgba(0, 255, 102, 0.35)',
                backgroundColor: isAudioMuted ? '#2a0808' : 'rgba(0, 255, 102, 0.08)',
                color: isAudioMuted ? '#fca5a5' : '#00ff66',
                '&:hover': {
                  backgroundColor: isAudioMuted ? '#450a0a' : 'rgba(0, 255, 102, 0.18)',
                  borderColor: isAudioMuted ? '#991b1b' : '#00ff66',
                },
              }}
            >
              {isAudioMuted ? 'MUTED' : 'SIREN'}
            </Button>
          </Tooltip>

          {/* Route Navigation Button */}
          {currentView === 'MONITORING' ? (
            <Tooltip title="Launch Hardware Controller & Sensor Mocking bench in separate window (/controller)">
              <Button
                size="small"
                startIcon={<LaunchIcon sx={{ fontSize: 15 }} />}
                onClick={handleOpenControllerInNewTab}
                sx={{
                  height: 32,
                  px: 1.4,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  border: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  '&:hover': {
                    borderColor: '#38bdf8',
                    color: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  },
                }}
              >
                EDGE CONSOLE ↗
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Launch Live SCADA Telemetry Dashboard in separate window (/)">
              <Button
                size="small"
                startIcon={<DashboardIcon sx={{ fontSize: 15 }} />}
                onClick={handleOpenDashboardInNewTab}
                sx={{
                  height: 32,
                  px: 1.4,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderRadius: 1.5,
                  backgroundColor: '#00f0ff',
                  color: '#000000',
                  '&:hover': { backgroundColor: '#38bdf8' },
                }}
              >
                LIVE DASHBOARD ↗
              </Button>
            </Tooltip>
          )}

          {/* Model Audit Modal Trigger - Sleek SCADA Architectural Styling */}
          <Tooltip title="Open Algorithmic Validation Matrix, TreeSHAP Axioms & Confusion Matrix">
            <Button
              size="small"
              startIcon={<AssessmentIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenAuditModal}
              sx={{
                height: 32,
                px: 1.6,
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                borderRadius: 1.5,
                border: '1px solid rgba(0, 240, 255, 0.45)',
                backgroundColor: 'rgba(0, 240, 255, 0.08)',
                color: '#00f0ff',
                '&:hover': {
                  backgroundColor: 'rgba(0, 240, 255, 0.2)',
                  borderColor: '#00f0ff',
                },
              }}
            >
              MODEL AUDIT
            </Button>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
};
