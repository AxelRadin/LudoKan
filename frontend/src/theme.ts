import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: ["'Poppins'", 'sans-serif'].join(','),
  },
  palette: {
    primary: { main: '#ff6464' },
    secondary: { main: '#2b2b2b' },
  },
});

export default theme;