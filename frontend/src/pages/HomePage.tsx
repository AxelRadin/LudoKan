import Box from '@mui/material/Box';
import Banner from '../components/Banner';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';

export const HomePage = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        ml: 25,
        mr: 25,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Banner />
        <TrendingGames />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            marginTop: 5,
          }}
        >
          <GenreGrid />
        </Box>
      </Box>
    </Box>
  );
}

export default HomePage;
