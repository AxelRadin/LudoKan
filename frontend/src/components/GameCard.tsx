import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { Box, Card, CardMedia, CircularProgress, IconButton, Tooltip } from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addGameToLibrary, importIgdbGameToDjango } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface GameCardProps {
  id: number;
  title: string;
  image: string;
  igdb?: boolean;
  coverUrl?: string | null;
  releaseDate?: string | null;
}

export const GameCard: React.FC<GameCardProps> = ({ id, title, image, igdb = false, coverUrl, releaseDate }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || added || !igdb) return;
    setAdding(true);
    try {
      const { id: djangoId } = await importIgdbGameToDjango(id, title, coverUrl ?? null, releaseDate ?? null);
      await addGameToLibrary(djangoId);
      setAdded(true);
    } catch {
      // already in library or error
      setAdded(true);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card
      onClick={() => navigate(igdb ? `/game/igdb/${id}` : `/game/${id}`)}
      sx={{ minWidth: 150, borderRadius: 2, flexShrink: 0, cursor: 'pointer', position: 'relative' }}
    >
      <CardMedia
        component="img"
        height="200"
        image={image}
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
                  '&:hover': { bgcolor: added ? 'success.dark' : 'rgba(0,0,0,0.85)' },
                  width: 28,
                  height: 28,
                }}
              >
                {adding ? (
                  <CircularProgress size={14} sx={{ color: '#fff' }} />
                ) : added ? (
                  <CheckIcon sx={{ fontSize: 16 }} />
                ) : (
                  <AddIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
    </Card>
  );
};

export default GameCard;
