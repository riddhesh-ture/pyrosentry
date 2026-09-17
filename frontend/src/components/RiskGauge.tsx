import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

interface RiskGaugeProps {
  score: number;
  tier: 'LOW' | 'MEDIUM' | 'CRITICAL';
  buzzerActive: boolean;
  acknowledged: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  tier,
  buzzerActive,
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = 76;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 180-deg arc
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let tierColor = '#00ff66';
  let tierGlow = 'rgba(0, 255, 102, 0.4)';
  let statusLabel = 'NORMAL AMBIENT';

  if (tier === 'CRITICAL') {
    tierColor = '#ff003c';
    tierGlow = 'rgba(255, 0, 60, 0.6)';
    statusLabel = 'CRITICAL EMERGENCY';
  } else if (tier === 'MEDIUM') {
    tierColor = '#ffb700';
    tierGlow = 'rgba(255, 183, 0, 0.5)';
    statusLabel = 'ADVISORY WARNING';
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: tier === 'CRITICAL' ? '1px solid #ff003c' : '1px solid #1e293b',
        boxShadow: tier === 'CRITICAL' ? '0 0 25px rgba(255,0,60,0.35)' : 'none',
      }}
    >
      {/* Top Title Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: 1, mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tier === 'CRITICAL' ? (
            <NotificationImportantIcon sx={{ color: '#ff003c', fontSize: 20 }} />
          ) : tier === 'MEDIUM' ? (
            <WarningIcon sx={{ color: '#ffb700', fontSize: 20 }} />
          ) : (
            <ShieldIcon sx={{ color: '#00ff66', fontSize: 20 }} />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            COMPOSITE FIRE RISK
          </Typography>
        </Box>
        <Chip
          label="FUSION GAUGE"
          size="small"
          sx={{ backgroundColor: '#090e1a', color: '#64748b', fontSize: '0.65rem', height: 20 }}
        />
      </Box>

      {/* SVG Semi-Circle Dial */}
      <Box sx={{ position: 'relative', width: 200, height: 115, mx: 'auto', mt: 1 }}>
        <svg viewBox="0 0 180 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Background Arc */}
          <path
            d="M 14 90 A 76 76 0 0 1 166 90"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Dynamic Progress Arc */}
          <path
            d="M 14 90 A 76 76 0 0 1 166 90"
            fill="none"
            stroke={tierColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 8px ${tierGlow})`,
              transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Digital Numeric Display Inside Dial */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              fontFamily: 'monospace',
              color: tierColor,
              textShadow: `0 0 16px ${tierGlow}`,
              lineHeight: 1,
            }}
          >
            {clampedScore.toFixed(1)}
            <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 700, color: '#64748b', ml: 0.5 }}>
              %
            </Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: tierColor,
              display: 'block',
              mt: 0.5,
              fontSize: '0.7rem',
            }}
          >
            {statusLabel}
          </Typography>
        </Box>
      </Box>

      {/* Threshold Zone Indicators */}
      <Stack direction="row" spacing={1} sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #1e293b' }}>
        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            p: 0.8,
            borderRadius: 1,
            backgroundColor: tier === 'LOW' ? 'rgba(0,255,102,0.15)' : '#090e1a',
            border: tier === 'LOW' ? '1px solid rgba(0,255,102,0.4)' : '1px solid #1e293b',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color: tier === 'LOW' ? '#00ff66' : '#64748b' }}>
            0-35% SAFE
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            p: 0.8,
            borderRadius: 1,
            backgroundColor: tier === 'MEDIUM' ? 'rgba(255,183,0,0.15)' : '#090e1a',
            border: tier === 'MEDIUM' ? '1px solid rgba(255,183,0,0.4)' : '1px solid #1e293b',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color: tier === 'MEDIUM' ? '#ffb700' : '#64748b' }}>
            35-70% WARN
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            p: 0.8,
            borderRadius: 1,
            backgroundColor: tier === 'CRITICAL' ? 'rgba(255,0,60,0.2)' : '#090e1a',
            border: tier === 'CRITICAL' ? '1px solid rgba(255,0,60,0.5)' : '1px solid #1e293b',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color: tier === 'CRITICAL' ? '#ff003c' : '#64748b' }}>
            70-100% CRIT
          </Typography>
        </Box>
      </Stack>

      {/* Buzzer Alert Banner */}
      {buzzerActive && (
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: 1,
            backgroundColor: 'rgba(255, 0, 60, 0.25)',
            border: '1px solid #ff003c',
            color: '#ff003c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VolumeUpIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 900 }}>
              AUDIBLE SIREN ENGAGED
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 900, color: '#ffffff' }}>
            TIER 3
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
