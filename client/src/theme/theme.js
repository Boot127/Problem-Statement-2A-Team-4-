import { createTheme } from '@mui/material/styles';

// Corporate blue/indigo palette for the HR Compliance Knowledge Management Platform.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e3a8a',
      light: '#3b5bdb',
      dark: '#152a63',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0f766e',
    },
    background: {
      default: '#f4f6fb',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: ['"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'].join(','),
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: 'rgba(0,0,0,0.65)' },
      },
    },
  },
});

export default theme;
