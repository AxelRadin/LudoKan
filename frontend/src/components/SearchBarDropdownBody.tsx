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
import { getCoverUrl, type IgdbGame } from '../api/igdb';
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
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Aucun résultat
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
      {results.map(game => {
        const cover = getCoverUrl(game.cover);
        const year = game.first_release_date
          ? new Date(game.first_release_date * 1000).getFullYear()
          : undefined;
        const displayName = game.display_name ?? game.name;
        return (
          <React.Fragment key={game.id}>
            <ListItem
              alignItems="flex-start"
              sx={{ py: 1.5 }}
              secondaryAction={
                <Tooltip
                  title={
                    addedIds.has(game.id)
                      ? 'Ajouté !'
                      : 'Ajouter à ma bibliothèque'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={e => onAddToLibrary(e, game)}
                      disabled={addingId === game.id}
                      color={addedIds.has(game.id) ? 'success' : 'default'}
                    >
                      {renderAddToLibraryIcon({
                        adding: addingId === game.id,
                        added: addedIds.has(game.id),
                        iconSize: 20,
                        loaderSize: 16,
                      })}
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton onClick={() => onGameClick(game)}>
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={cover ?? undefined}
                    alt={displayName}
                    sx={{
                      width: 48,
                      height: 64,
                      mr: 2,
                      bgcolor: '#eee',
                    }}
                  >
                    {displayName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <span>
                      <b>{displayName}</b>
                      {year && (
                        <span style={{ color: '#888', marginLeft: 8 }}>
                          ({year})
                        </span>
                      )}
                    </span>
                  }
                  secondary={
                    game.platforms
                      ?.slice(0, 3)
                      .map(p => p.name)
                      .join(', ') || 'IGDB'
                  }
                />
              </ListItemButton>
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        );
      })}
    </List>
  );
}
