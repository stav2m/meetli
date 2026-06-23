import { createTheme, type ThemeOptions } from '@mui/material/styles';

export const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      dark: '#1557b0',
      light: '#4285f4',
    },
    background: {
      default: '#f8f9fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    success: {
      main: '#188038',
    },
    error: {
      main: '#d93025',
    },
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    body1: {
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(60, 64, 67, 0.12), 0 4px 16px rgba(60, 64, 67, 0.08)',
        },
      },
    },
  },
};

export function createAppTheme(direction: 'ltr' | 'rtl' = 'ltr') {
  return createTheme({
    ...baseThemeOptions,
    direction,
  });
}

export const theme = createAppTheme('ltr');
