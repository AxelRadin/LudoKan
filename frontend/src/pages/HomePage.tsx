import Box from '@mui/material/Box';
import { useRef, useState } from 'react';
import Banner from '../components/Banner';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';
import { useHomeTrending } from '../hooks/useHomeTrending';

export const HomePage = () => {
  const [selectedGenre, setSelectedGenre] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const genreResultRef = useRef<HTMLDivElement>(null);

  const { sections, genreSection } = useHomeTrending({ selectedGenre });

  const handleGenreClick = (id: number, name: string) => {
    setSelectedGenre({ id, name });
    setTimeout(() => {
      genreResultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        ml: 10,
        mr: 10,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Banner />
        <TrendingGames
          title="Jeux les plus récents"
          games={sections.recent.games}
          loading={sections.recent.loading}
          to="/trending/recent"
        />
        <TrendingGames
          title="Jeux les mieux notés"
          games={sections.rating.games}
          loading={sections.rating.loading}
          to="/trending/rating"
        />
        <TrendingGames
          title="Jeux les plus populaires"
          games={sections.popularity.games}
          loading={sections.popularity.loading}
          to="/trending/popularity"
        />
        {selectedGenre && (
          <Box ref={genreResultRef}>
            <TrendingGames
              title={selectedGenre.name}
              games={genreSection?.games ?? []}
              loading={genreSection?.loading ?? true}
              to={`/trending/genre/${selectedGenre.id}`}
              linkState={{ genreName: selectedGenre.name }}
            />
          </Box>
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
          <GenreGrid onGenreClick={handleGenreClick} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
