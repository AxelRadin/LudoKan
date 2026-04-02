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
  return (
    <Box>
      {title && (
        <Typography
          variant="h6"
          fontWeight="bold"
          mb={2}
          sx={{ textAlign: 'left !important', width: '100%', display: 'block' }}
        >
          {title}
        </Typography>
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
