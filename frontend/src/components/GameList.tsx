import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';

export type GameListItem = {
  id: number;
  name: string;
  cover_url?: string;
  image?: string;
  status?: string;
  userGameId?: number;
};

export type GameListProps = {
  games: GameListItem[];
  title?: string;
  showStatus?: boolean;
  onRemove?: (userGameId: number) => void;
};

function parseTrailingCountTitle(title: string): {
  base: string;
  count: string | undefined;
} {
  if (!title.endsWith(')')) {
    return { base: title, count: undefined };
  }
  const open = title.lastIndexOf('(');
  if (open < 0) {
    return { base: title, count: undefined };
  }
  const inner = title.slice(open + 1, -1);
  if (!/^\d+$/.test(inner)) {
    return { base: title, count: undefined };
  }
  const base = title.slice(0, open).replace(/\s+$/, '');
  return { base, count: inner };
}

function getGameImage(game: GameListItem) {
  let image = game.cover_url || game.image;

  if (image?.includes('t_thumb')) {
    image = image.replace('t_thumb', 't_cover_big');
  }
  return image || '/default-cover.jpg';
}

export default function GameList({
  games,
  title,
  showStatus = true,
  onRemove,
}: GameListProps) {
  const titleParts = title ? parseTrailingCountTitle(title) : null;

  return (
    <Box>
      {titleParts && (
        <Box
          sx={{
            display: 'flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
          }}
        >
          {/* Accent bar */}
          <Box
            sx={{
              width: 4,
              height: 22,
              borderRadius: 999,
              background: 'linear-gradient(180deg, #d32f2f, #ff8a80)',
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: '#0f0f0f',
              letterSpacing: -0.2,
              lineHeight: 1,
            }}
          >
            {/* Split title and count */}
            {titleParts.base}
          </Typography>
          {/* Count badge */}
          {titleParts.count != null && (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 999,
                background: 'rgba(211,47,47,0.1)',
                border: '1px solid rgba(211,47,47,0.2)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  color: '#d32f2f',
                  lineHeight: 1,
                }}
              >
                {titleParts.count}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      <Box display="flex" gap={2} flexWrap="wrap">
        {games.length === 0 ? (
          <Typography>Aucun jeu à afficher.</Typography>
        ) : (
          games.map(game => (
            <Box key={game.id} sx={{ position: 'relative' }}>
              <Link to={`/game/${game.id}`} style={{ textDecoration: 'none' }}>
                <Card sx={{ width: 140, textAlign: 'center', boxShadow: 2 }}>
                  <CardMedia
                    component="img"
                    image={getGameImage(game)}
                    alt={game.name}
                    sx={{
                      width: '100%',
                      height: 180,
                      objectFit: 'cover',
                      borderRadius: 2,
                    }}
                  />
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {game.name}
                    </Typography>
                    {showStatus && game.status && (
                      <Typography variant="caption" color="text.secondary">
                        {game.status.replace('_', ' ').toLowerCase()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Link>
              {onRemove && game.userGameId != null && (
                <Tooltip title="Retirer de la bibliothèque">
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.preventDefault();
                      onRemove(game.userGameId!);
                    }}
                    aria-label="Retirer le jeu"
                    sx={{
                      position: 'absolute',
                      bottom: 30,
                      right: 2,
                      color: 'text.disabled',
                      bgcolor: 'rgba(255,255,255,0.85)',
                      '&:hover': {
                        color: 'error.main',
                        bgcolor: 'error.light',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
