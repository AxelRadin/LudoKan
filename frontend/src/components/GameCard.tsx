import { Box, Card, CardMedia, IconButton, Tooltip } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addGameToLibrary, resolveGameIdIfNeeded } from '../api/igdb';
import { useAuth } from '../hooks/useAuth';
import type { NormalizedGame } from '../types/game';
import { renderAddToLibraryIcon } from '../utils/renderAddToLibraryIcon';

interface GameCardProps {
  game: NormalizedGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(!!game.user_library);

  // A game is "IGDB only" if it has no django_id (not yet imported)
  const isIgdbOnly = !game.django_id;

  const handleNavigate = () => {
    if (game.django_id) {
      navigate(`/game/${game.django_id}`);
    } else {
      navigate(`/game/igdb/${game.igdb_id}`);
    }
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || added || !isIgdbOnly) return;
    setAdding(true);
    try {
      const { game_id } = await resolveGameIdIfNeeded(game);
      await addGameToLibrary(game_id);
      setAdded(true);
    } catch {
      // already in library or error
      setAdded(true);
    } finally {
      setAdding(false);
    }
  };

  const addButtonContent = useMemo(
    () =>
      renderAddToLibraryIcon({
        adding,
        added,
        iconSize: 16,
        loaderSize: 14,
        loaderSx: { color: '#fff' },
      }),
    [adding, added]
  );

  return (
    <Card
      onClick={handleNavigate}
      sx={{
        minWidth: 150,
        borderRadius: 2,
        flexShrink: 0,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={game.cover_url ?? ''}
        alt={game.name}
        sx={{ objectFit: 'cover' }}
      />
      {isIgdbOnly && isAuthenticated && (
        <Box sx={{ position: 'absolute', bottom: 6, right: 6 }}>
          <Tooltip title={added ? 'Ajouté !' : 'Ajouter à ma bibliothèque'}>
            <span>
              <IconButton
                size="small"
                onClick={handleAdd}
                disabled={adding}
                sx={{
                  bgcolor: added ? 'success.main' : 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: added ? 'success.dark' : 'rgba(0,0,0,0.85)',
                  },
                  width: 28,
                  height: 28,
                }}
              >
                {addButtonContent}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
    </Card>
  );
};

export default GameCard;
