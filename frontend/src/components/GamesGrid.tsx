import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React from 'react';
import GameCard from './GameCard';

import type { UserLibraryData } from '../types/game';

export interface GameForCard {
  id: number;
  title: string;
  image: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  user_library?: UserLibraryData | null;
}

export interface GamesGridProps {
  games: GameForCard[];
  loading?: boolean;
  emptyMessage?: string;
  igdb?: boolean;
}

export const GamesGrid: React.FC<GamesGridProps> = ({
  games,
  loading = false,
  emptyMessage = 'Aucun jeu à afficher.',
  igdb = false,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (games.length === 0) {
    return (
      <Typography color="text.secondary" py={4}>
        {emptyMessage}
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
        gap: 2,
      }}
    >
      {games.map(game => (
        <GameCard
          key={game.id}
          id={game.id}
          title={game.title}
          image={game.image}
          coverUrl={game.coverUrl}
          releaseDate={game.releaseDate}
          user_library={game.user_library}
          igdb={igdb}
        />
      ))}
    </Box>
  );
};

export default GamesGrid;
