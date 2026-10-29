import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { AlertState, HazardPrediction } from '../types/telemetry';
import { soundService } from '../utils/soundService';
import { API_BASE_URL } from '../config';

interface EmergencyHUDModalProps {
  alertState: AlertState | undefined;
  prediction: HazardPrediction | undefined;
}

export const EmergencyHUDModal: React.FC<EmergencyHUDModalProps> = ({
  alertState,
  prediction,
}) => {
  const [isMuted, setIsMuted] = useState(soundService.getMuted());
  const isCritical = alertState?.alert_tier === 'CRITICAL' && !alertState?.acknowledged;

  useEffect(() => {
    if (isCritical) {
      soundService.setMuted(isMuted);
      soundService.startSiren();
    } else {
      soundService.stopSiren();
    }

    return () => {
      soundService.stopSiren();
    };
  }, [isCritical, isMuted]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundService.setMuted(nextMuted);
  };

  const handleAcknowledge = async () => {
    soundService.stopSiren();
    try {
      await fetch(`${API_BASE_URL}/api/alert/acknowledge`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const handleTestSiren = () => {
    soundService.testAlarm(2.5);
  };

  if (!isCritical) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1300,
        width: '92%',
        maxWidth: 760,
        animation: 'pulseGlow 1.2s infinite alternate ease-in-out',
        '@keyframes pulseGlow': {
          '0%': {
            boxShadow: '0 0 25px rgba(255, 0, 60, 0.6)',
          },
          '100%': {
            boxShadow: '0 0 55px rgba(255, 0, 60, 1.0)',
          },
        },
      }}
    >
      <Paper
        sx={{
          p: 2.2,
          backgroundColor: '#160408',
          border: '2px solid #ff003c',
          borderRadius: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              backgroundColor: '#ff003c',
              borderRadius: 2,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px #ff003c',
            }}
          >
            <NotificationImportantIcon sx={{ fontSize: 34 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="TIER 3 ESCALATED CRITICAL HAZARD"
                size="small"
                sx={{
                  backgroundColor: '#ff003c',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  letterSpacing: '0.05em',
                }}
              />
              <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 800 }}>
                RISK: {prediction?.risk_score.toFixed(0)}%
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#ffffff', mt: 0.5, letterSpacing: '0.03em' }}>
              CRITICAL THREAT: {prediction?.predicted_class.toUpperCase()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#fca5a5', display: 'block', fontWeight: 600 }}>
              Physical acoustic siren active • Multi-sensor persistence debounce verified (2 cycles)
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: { xs: '100%', md: 'auto' }, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Tooltip title={isMuted ? 'Unmute Siren Sound' : 'Mute Siren Sound'}>
            <IconButton
              onClick={handleToggleMute}
              sx={{
                border: '1px solid #7f1d1d',
                backgroundColor: isMuted ? '#450a0a' : 'rgba(255, 0, 60, 0.2)',
                color: '#fca5a5',
                '&:hover': { backgroundColor: '#7f1d1d' },
              }}
            >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Test 2.5s Alarm Siren">
            <Button
              size="small"
              variant="outlined"
              onClick={handleTestSiren}
              startIcon={<PlayCircleOutlineIcon />}
              sx={{
                borderColor: '#7f1d1d',
                color: '#fca5a5',
                fontSize: '0.72rem',
                fontWeight: 700,
                '&:hover': { borderColor: '#ff003c' },
              }}
            >
              TEST SIREN
            </Button>
          </Tooltip>

          <Button
            variant="contained"
            color="error"
            startIcon={<CheckCircleIcon />}
            onClick={handleAcknowledge}
            sx={{
              fontWeight: 900,
              px: 2.2,
              py: 1,
              backgroundColor: '#ff003c',
              fontSize: '0.78rem',
              boxShadow: '0 0 20px rgba(255, 0, 60, 0.6)',
              '&:hover': { backgroundColor: '#d90432' },
            }}
          >
            ACKNOWLEDGE & SILENCE
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
