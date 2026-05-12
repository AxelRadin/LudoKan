import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import CookieBanner from './pages/CookieBanner';
import Footer from './components/Footer';
import ForcedEmailModal from './components/ForcedEmailModal';
import { useAuth } from './contexts/useAuth';
import { useOnboarding, TOUR_KEYS } from './hooks/useOnboarding';
import { useTour } from './onboarding/useTour';
import './App.css';

const App = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { shouldShow, markAsDone } = useOnboarding(TOUR_KEYS.home);
  const { startTour, advanceIfOnProfileStep } = useTour({ onDone: markAsDone });

  // Premier lancement automatique — toujours depuis la homepage
  useEffect(() => {
    if (!isAuthenticated || !shouldShow) return;
    if (location.pathname !== '/') navigate('/');
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
    // location.pathname est intentionnellement absent des deps : on ne veut pas
    // relancer le tour à chaque changement de route pendant le tour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, shouldShow, startTour, navigate]);

  // Avance le tour quand l'user navigue vers /profile via le dropdown
  useEffect(() => {
    if (location.pathname === '/profile') advanceIfOnProfileStep();
  }, [location.pathname, advanceIfOnProfileStep]);

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
