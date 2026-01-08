import { Box, Card, CardContent, CardMedia, Typography } from '@mui/material';

export type GameListItem = {
  id: number;
  name: string;
  cover_url?: string;
  image?: string;
  status?: string;
};

export type GameListProps = {
  games: GameListItem[];
  title?: string;
  showStatus?: boolean;
};

function getGameImage(game: GameListItem) {
  let image = game.cover_url || game.image;
  console.log('Game image:', image);

  if (image && image.includes('t_thumb')) {
    image = image.replace('t_thumb', 't_cover_big');
  }
  return image || '/default-cover.jpg';
}

export default function GameList({
  games,
  title,
  showStatus = true,
}: GameListProps) {
  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}
      <Box display="flex" gap={2} flexWrap="wrap">
        {games.length === 0 ? (
          <Typography>Aucun jeu à afficher.</Typography>
        ) : (
          games.map(game => (
            <Card
              key={game.id}
              sx={{ width: 140, textAlign: 'center', boxShadow: 2 }}
            >
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
          ))
        )}
      </Box>
    </Box>
  );
}
