import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    typography: {
      fontFamily: ["'Poppins'", 'sans-serif'].join(','),
    },
    palette: {
      mode,
      primary: { main: '#ff6464' },
      secondary: { main: '#2b2b2b' },

      ...(mode === 'dark'
        ? {
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
            },
          }
        : {
            background: {
              default: '#f9f9f9',
              paper: '#ffffff',
            },
          }),
    },
  });
