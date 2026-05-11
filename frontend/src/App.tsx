import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import CookieBanner from './pages/CookieBanner';
import Footer from './components/Footer';
import ForcedEmailModal from './components/ForcedEmailModal';
import { useAuth } from './contexts/useAuth';
import { useOnboarding } from './hooks/useOnboarding';
import { useTour } from './onboarding/useTour';
import './App.css';

const App = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { shouldShow, markAsDone } = useOnboarding();
  const { startTour } = useTour({ onDone: markAsDone });

  // Premier lancement automatique
  useEffect(() => {
    if (!isAuthenticated || !shouldShow) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, shouldShow, startTour]);

  // Relance depuis les paramètres via navigate('/', { state: { startTour: true } })
  useEffect(() => {
    if (
      !isAuthenticated ||
      !(location.state as { startTour?: boolean })?.startTour
    )
      return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [location.state, isAuthenticated, startTour]);

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
