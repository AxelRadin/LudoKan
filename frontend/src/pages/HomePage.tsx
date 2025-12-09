import Box from '@mui/material/Box';
import GenreGrid from '../components/GenreGrid';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import TrendingGames from '../components/TrendingGames';

function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',          
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header fixé en haut */}
      <Header />

      {/* Contenu principal */}
      <Box component="main" sx={{ flex: 1, pt: 8 }}>
        <HeroSection />
        <TrendingGames />
        <GenreGrid />
      </Box>
    </Box>
  );
}

export default HomePage;
