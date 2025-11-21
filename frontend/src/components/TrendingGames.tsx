import { Card, CardMedia } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

interface Game {
  title: string;
  image: string;
}

const trendingGames: Game[] = [
  { title: 'League of Legends', image: '/games/lol.jpg' },
  { title: 'Rocket League', image: '/games/rocketleague.jpg' },
  { title: 'Genshin Impact', image: '/games/genshin.jpg' },
  { title: 'Assassin’s Creed Shadows', image: '/games/acshadows.jpg' },
  { title: 'Expedition 33', image: '/games/expedition33.jpg' },
];

export const TrendingGames: React.FC = () => (
  <Box px={4} py={4}>
    <Typography variant="h6" fontWeight="bold" mb={2}>
      Jeux tendances ➜
    </Typography>
    <Box display="flex" gap={2} overflow="auto">
      {trendingGames.map(game => (
        <Card
          key={game.title}
          sx={{ minWidth: 150, borderRadius: 2, flexShrink: 0 }}
        >
          <CardMedia
            component="img"
            height="200"
            image={game.image}
            alt={game.title}
            sx={{ objectFit: 'cover' }}
          />
        </Card>
      ))}
    </Box>
  </Box>
);

export default TrendingGames;