import { Box, Card, CardMedia, IconButton, Tooltip } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addGameToLibrary, importIgdbGameToDjango } from '../api/igdb';
import { useAuth } from '../contexts/useAuth';
import type { UserLibraryData } from '../types/game';
import { renderAddToLibraryIcon } from '../utils/renderAddToLibraryIcon';

interface GameCardProps {
  id: number;
  title: string;
  image?: string; // Gardé pour compatibilité temporaire
  igdb?: boolean;
  coverUrl?: string | null;
  releaseDate?: string | null;
  user_library?: UserLibraryData | null;
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  title,
  image,
  igdb = false,
  coverUrl,
  releaseDate,
  user_library,
}) => {
  const displayImage = coverUrl || image || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(!!user_library);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || added || !igdb) return;
    setAdding(true);
    try {
      const { id: djangoId } = await importIgdbGameToDjango(
        id,
        title,
        coverUrl ?? null,
        releaseDate ?? null
      );
      await addGameToLibrary(djangoId);
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
      onClick={() => navigate(igdb ? `/game/igdb/${id}` : `/game/${id}`)}
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
        image={displayImage}
        alt={title}
        sx={{ objectFit: 'cover' }}
      />
      {igdb && isAuthenticated && (
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
