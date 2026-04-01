import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React from 'react';
import GameCard from './GameCard';

import type { NormalizedGame } from '../types/game';

export interface GamesGridProps {
  games: NormalizedGame[];
  loading?: boolean;
  emptyMessage?: string;
}

export const GamesGrid: React.FC<GamesGridProps> = ({
  games,
  loading = false,
  emptyMessage = 'Aucun jeu à afficher.',
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
        <GameCard key={game.igdb_id} game={game} />
      ))}
    </Box>
  );
};

export default GamesGrid;
