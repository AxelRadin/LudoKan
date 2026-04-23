import {
  Box,
  Card,
  CardMedia,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { FaSteam } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { addGameToLibrary, resolveGameIdIfNeeded } from '../api/igdb';
import { useAuth } from '../contexts/useAuth';
import type { NormalizedGame } from '../types/game';
import { renderAddToLibraryIcon } from '../utils/renderAddToLibraryIcon';

interface GameCardProps {
  game: NormalizedGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(!!game.user_library);

  const isIgdbOnly = !game.django_id;

  const handleNavigate = () => {
    if (game.django_id) navigate(`/game/${game.django_id}`);
    else navigate(`/game/igdb/${game.igdb_id}`);
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
          <Tooltip
            title={added ? t('gameCard.added') : t('gameCard.addToLibrary')}
          >
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

      {game.steam_appid &&
        game.user_library?.playtime_forever != null &&
        game.user_library.playtime_forever > 0 && (
          <Box sx={{ position: 'absolute', top: 6, left: 6 }}>
            <Box
              sx={{
                bgcolor: 'rgba(23,26,33,0.85)',
                color: '#fff',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <FaSteam size={14} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              >
                {game.user_library.playtime_forever}h
              </Typography>
            </Box>
          </Box>
        )}
    </Card>
  );
};

export default GameCard;
