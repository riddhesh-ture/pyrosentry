import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f0ff', // Laser Cyan
      contrastText: '#000000',
    },
    secondary: {
      main: '#ffb700', // Amber Warning
      contrastText: '#000000',
    },
    error: {
      main: '#ff003c', // Emergency Crimson
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffb700',
      contrastText: '#000000',
    },
    success: {
      main: '#00ff66', // Radar Green
      contrastText: '#000000',
    },
    background: {
      default: '#070a13',
      paper: '#0b1120',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: '#1e293b',
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Rajdhani', monospace, -apple-system, sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#070a13',
          color: '#f8fafc',
          scrollbarColor: '#1e293b #090d16',
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#1e293b',
            borderRadius: 3,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0c1322',
          border: '1px solid #1e293b',
          borderRadius: 8,
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace",
        },
        containedPrimary: {
          backgroundColor: '#00f0ff',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#33f4ff',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
          },
        },
        containedSecondary: {
          backgroundColor: '#ffb700',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#ffc533',
            boxShadow: '0 0 15px rgba(255, 183, 0, 0.4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
    },
  },
});
