import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type IgdbGame } from '../api/igdb';
import { renderAddToLibraryIcon } from '../utils/renderAddToLibraryIcon';

export type SearchBarDropdownBodyProps = Readonly<{
  loading: boolean;
  results: IgdbGame[];
  addedIds: Set<number>;
  addingId: number | null;
  onAddToLibrary: (e: React.MouseEvent, game: IgdbGame) => void;
  onGameClick: (game: IgdbGame) => void;
}>;

export function SearchBarDropdownBody({
  loading,
  results,
  addedIds,
  addingId,
  onAddToLibrary,
  onGameClick,
}: SearchBarDropdownBodyProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} sx={{ color: '#FF3D3D' }} />
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('searchBar.noResults')}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ maxHeight: 400, overflowY: 'auto', py: 0 }}>
      {results.map(game => {
        const cover = game.cover_url;
        const year = game.release_date
          ? game.release_date.slice(0, 4)
          : undefined;
        const displayName = game.name;
        const isAdded = addedIds.has(game.igdb_id);
        const isAdding = addingId === game.igdb_id;

        return (
          <React.Fragment key={game.igdb_id}>
            <ListItem
              disablePadding
              sx={{ py: 0 }}
              secondaryAction={
                <Tooltip
                  title={
                    isAdded ? t('searchBar.added') : t('searchBar.addToLibrary')
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={e => onAddToLibrary(e, game)}
                      disabled={isAdding}
                      sx={{
                        mr: 1,
                        color: isAdded ? '#4caf50' : 'text.secondary',
                        '&:hover': {
                          backgroundColor: isAdded
                            ? 'rgba(76, 175, 80, 0.08)'
                            : 'rgba(255, 61, 61, 0.08)',
                          color: isAdded ? '#4caf50' : '#FF3D3D',
                        },
                      }}
                    >
                      {renderAddToLibraryIcon({
                        adding: isAdding,
                        added: isAdded,
                        iconSize: 20,
                        loaderSize: 16,
                      })}
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton
                onClick={() => onGameClick(game)}
                sx={{
                  px: 2,
                  py: 1,
                  pr: 6,
                  '&:hover': { backgroundColor: 'rgba(255, 61, 61, 0.06)' },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={cover ?? undefined}
                    alt={displayName}
                    sx={{
                      width: 40,
                      height: 54,
                      mr: 1.5,
                      borderRadius: '6px',
                      bgcolor: 'rgba(0,0,0,0.1)',
                    }}
                  >
                    {displayName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      {displayName}
                      {year && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {year}
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {game.platforms
                        ?.slice(0, 3)
                        .map(p => p.name)
                        .join(', ') || 'IGDB'}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
            <Divider component="li" sx={{ opacity: 0.5 }} />
          </React.Fragment>
        );
      })}
    </List>
  );
}
