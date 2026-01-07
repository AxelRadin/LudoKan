import Box from '@mui/material/Box';
import { useState } from 'react';
import Banner from '../components/Banner';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';

export const HomePage = () => {
  const [selectedGenre, setSelectedGenre] = useState<{
    id: number;
    name: string;
  } | null>(null);
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
        <TrendingGames
          ordering="-average_rating"
          title="Jeux les mieux notés"
        />
        <TrendingGames
          ordering="-popularity_score"
          title="Jeux les plus populaires"
        />
        <TrendingGames ordering="-release_date" title="Jeux les plus récents" />
        <TrendingGames ordering="-rating_count" title="Jeux les plus notés" />
        <TrendingGames
          ordering="-rating_avg"
          title="Jeux avec meilleure note moyenne"
        />
        {selectedGenre && (
          <TrendingGames
            title={selectedGenre.name}
            genre={selectedGenre.id.toString()}
            ordering="-popularity_score"
          />
        )}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            marginTop: 5,
          }}
        >
          <GenreGrid
            onGenreClick={(id, name) => setSelectedGenre({ id, name })}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
