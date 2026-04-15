import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
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
