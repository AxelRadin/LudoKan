import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  typography: {
    fontFamily: "'Rajdhani', sans-serif",
    h1: { fontFamily: "'Rajdhani', sans-serif" },
    h2: { fontFamily: "'Rajdhani', sans-serif" },
    h3: { fontFamily: "'Rajdhani', sans-serif" },
    h4: { fontFamily: "'Rajdhani', sans-serif" },
    h5: { fontFamily: "'Rajdhani', sans-serif" },
    h6: { fontFamily: "'Rajdhani', sans-serif" },
    body1: { fontFamily: "'Rajdhani', sans-serif" },
    body2: { fontFamily: "'Rajdhani', sans-serif" },
    button: { fontFamily: "'Rajdhani', sans-serif" },
    caption: { fontFamily: "'Rajdhani', sans-serif" },
    overline: { fontFamily: "'Rajdhani', sans-serif" },
  },
  palette: {
    primary: {
      main: '#FF3D3D',
    },
    secondary: {
      main: '#FF8C42',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
    MuiTouchRipple: {
      styleOverrides: {
        root: {
          color: '#FF3D3D',
          opacity: 0.3,
        },
      },
    },
  },
});
