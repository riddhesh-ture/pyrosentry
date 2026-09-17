import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';
import PropaneTankIcon from '@mui/icons-material/PropaneTank';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { HazardPrediction } from '../types/telemetry';

interface HazardClassificationHUDProps {
  prediction: HazardPrediction;
}

export const HazardClassificationHUD: React.FC<HazardClassificationHUDProps> = ({
  prediction,
}) => {
  const { predicted_class, confidence, probabilities, driving_factors, alert_tier } = prediction;

  const classIcons: Record<string, React.ReactNode> = {
    'No Fire': <VerifiedUserIcon sx={{ color: '#00ff66', fontSize: 28 }} />,
    'Cooking Smoke': <SoupKitchenIcon sx={{ color: '#38bdf8', fontSize: 28 }} />,
    'Gas Leak': <PropaneTankIcon sx={{ color: '#ffb700', fontSize: 28 }} />,
    'Electrical Fire': <FlashOnIcon sx={{ color: '#fb923c', fontSize: 28 }} />,
    'LPG Fire': <WhatshotIcon sx={{ color: '#ff003c', fontSize: 28 }} />,
  };

  const classColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    'No Fire': {
      bg: 'rgba(0, 255, 102, 0.08)',
      border: '1px solid rgba(0, 255, 102, 0.4)',
      text: '#00ff66',
      glow: '0 0 20px rgba(0, 255, 102, 0.2)',
    },
    'Cooking Smoke': {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: '1px solid rgba(56, 189, 248, 0.5)',
      text: '#38bdf8',
      glow: '0 0 20px rgba(56, 189, 248, 0.2)',
    },
    'Gas Leak': {
      bg: 'rgba(255, 183, 0, 0.12)',
      border: '1px solid rgba(255, 183, 0, 0.5)',
      text: '#ffb700',
      glow: '0 0 20px rgba(255, 183, 0, 0.2)',
    },
    'Electrical Fire': {
      bg: 'rgba(251, 146, 60, 0.15)',
      border: '1px solid rgba(251, 146, 60, 0.5)',
      text: '#fb923c',
      glow: '0 0 20px rgba(251, 146, 60, 0.25)',
    },
    'LPG Fire': {
      bg: 'rgba(255, 0, 60, 0.2)',
      border: '1px solid #ff003c',
      text: '#ff003c',
      glow: '0 0 25px rgba(255, 0, 60, 0.45)',
    },
  };

  const currentTheme = classColors[predicted_class] || classColors['No Fire'];

  return (
    <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            AI HAZARD CLASSIFICATION
          </Typography>
          <Chip
            label="RANDOM FOREST"
            size="small"
            sx={{ backgroundColor: '#090e1a', color: '#00f0ff', border: '1px solid #00f0ff40', fontSize: '0.65rem', height: 20 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
            CONFIDENCE:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
            {(confidence * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* Main Status Hero Card */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: currentTheme.bg,
          border: currentTheme.border,
          boxShadow: currentTheme.glow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: 1.5,
              backgroundColor: '#070a13',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {classIcons[predicted_class]}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', display: 'block' }}>
              CURRENT HAZARD STATE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: currentTheme.text, letterSpacing: '0.02em' }}>
              {predicted_class.toUpperCase()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', display: 'block', mb: 0.5 }}>
            ALERT TIER
          </Typography>
          <Chip
            label={alert_tier}
            size="small"
            sx={{
              fontWeight: 900,
              fontSize: '0.75rem',
              backgroundColor:
                alert_tier === 'CRITICAL' ? '#ff003c' : alert_tier === 'MEDIUM' ? '#ffb700' : 'rgba(0,255,102,0.2)',
              color: alert_tier === 'MEDIUM' ? '#000000' : '#ffffff',
            }}
          />
        </Box>
      </Box>

      {/* 5-Class Probability Spectrum */}
      <Box sx={{ mt: 2, backgroundColor: '#090e1a', p: 1.5, borderRadius: 1.5, border: '1px solid #1e293b' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 1, letterSpacing: '0.05em' }}>
          ENSEMBLE CLASS PROBABILITY SPECTRUM
        </Typography>

        <Stack spacing={1}>
          {Object.entries(probabilities).map(([cName, prob]) => {
            const isSelected = cName === predicted_class;
            return (
              <Box key={cName} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    width: 110,
                    fontSize: '0.7rem',
                    fontWeight: isSelected ? 800 : 500,
                    color: isSelected ? '#ffffff' : '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cName}
                </Typography>

                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round(prob * 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#1e293b',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: isSelected
                          ? alert_tier === 'CRITICAL'
                            ? '#ff003c'
                            : '#00f0ff'
                          : '#475569',
                      },
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{ width: 35, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8' }}
                >
                  {(prob * 100).toFixed(0)}%
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Primary Symptoms / Driving Reasons */}
      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #1e293b' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 0.5 }}>
          PRIMARY HAZARD INDICATORS:
        </Typography>
        <Stack spacing={0.5}>
          {driving_factors.map((factor, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 12, color: '#00f0ff' }} />
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
                {factor}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
};
