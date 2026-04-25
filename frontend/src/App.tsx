import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import CookieBanner from './pages/CookieBanner';
import Footer from './components/Footer';
import ForcedEmailModal from './components/ForcedEmailModal';
import './App.css';

const App = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#1a1010' : '#fdf4f4',
      }}
    >
      <Header />
      <CookieBanner />
      <ForcedEmailModal />
      <Box component="main" sx={{ paddingTop: 8, flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
};

export default App;
