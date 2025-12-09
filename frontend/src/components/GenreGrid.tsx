import { Card, CardMedia } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

interface Genre {
  name: string;
  image: string;
}

const genres: Genre[] = [
  { name: 'Action', image: '/genres/action.jpg' },
  { name: 'Aventure', image: '/genres/aventure.jpg' },
  { name: 'RPG', image: '/genres/rpg.jpg' },
  { name: 'FPS', image: '/genres/fps.jpg' },
  { name: 'Stratégie', image: '/genres/strategie.jpg' },
  { name: 'Simulation', image: '/genres/simulation.jpg' },
];

export const GenreGrid: React.FC = () => (
  <Box px={4} py={4} sx={{ backgroundColor: '#2b2b2b', color: 'white' }}>
    <Typography variant="h6" fontWeight="bold" mb={2}>
      Parcourir par genre
    </Typography>
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fill, minmax(100px, 1fr))"
      gap={2}
    >
      {genres.map(genre => (
        <Card
          key={genre.name}
          sx={{
            backgroundColor: '#1e1e1e',
            borderRadius: 2,
            cursor: 'pointer',
            transition: '0.3s',
            '&:hover': { transform: 'scale(1.05)' },
          }}
        >
          <CardMedia
            component="img"
            height="80"
            image={genre.image}
            alt={genre.name}
          />
          <Typography
            variant="caption"
            textAlign="center"
            display="block"
            py={1}
          >
            {genre.name}
          </Typography>
        </Card>
      ))}
    </Box>
  </Box>
);

export default GenreGrid;