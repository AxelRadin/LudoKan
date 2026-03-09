import Box from '@mui/material/Box';
import { useRef, useState } from 'react';
import Banner from '../components/Banner';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';

export const HomePage = () => {
  const [selectedGenre, setSelectedGenre] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const genreResultRef = useRef<HTMLDivElement>(null);

  const handleGenreClick = (id: number, name: string) => {
    setSelectedGenre({ id, name });
    setTimeout(() => {
      genreResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
        <TrendingGames igdbSort="rating"      title="Jeux les mieux notés" />
        <TrendingGames igdbSort="popularity"  title="Jeux les plus populaires" />
        <TrendingGames igdbSort="recent"      title="Jeux les plus récents" />
        <TrendingGames igdbSort="most_rated"  title="Jeux les plus notés" />
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 5 }}>
          <GenreGrid onGenreClick={handleGenreClick} />
        </Box>
        {selectedGenre && (
          <Box ref={genreResultRef}>
            <TrendingGames
              title={selectedGenre.name}
              igdbSort="popularity"
              genre={selectedGenre.id}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HomePage;
