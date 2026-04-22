import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  typography: {
    fontFamily: "'Outfit', sans-serif",
    h1: { fontFamily: "'Outfit', sans-serif" },
    h2: { fontFamily: "'Outfit', sans-serif" },
    h3: { fontFamily: "'Outfit', sans-serif" },
    h4: { fontFamily: "'Outfit', sans-serif" },
    h5: { fontFamily: "'Outfit', sans-serif" },
    h6: { fontFamily: "'Outfit', sans-serif" },
    body1: { fontFamily: "'Outfit', sans-serif" },
    body2: { fontFamily: "'Outfit', sans-serif" },
    button: { fontFamily: "'Outfit', sans-serif" },
    caption: { fontFamily: "'Outfit', sans-serif" },
    overline: { fontFamily: "'Outfit', sans-serif" },
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
