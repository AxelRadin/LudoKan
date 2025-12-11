import { Card, CardMedia } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import Images from '../assets/genres';

interface Genre {
  name: string;
  image: string;
}

const genres: Genre[] = [
  { name: 'Action', image: Images.action },
  { name: 'Aventure', image: Images.aventure },
  { name: 'RPG', image: Images.rpg },
  { name: 'FPS', image: Images.fps },
  { name: 'TPS', image: Images.tps },
  { name: 'Stratégie', image: Images.strategie },
  { name: 'Simulation', image: Images.simulation },
  { name: 'Puzzle', image: Images.puzzle },
  { name: 'Course', image: Images.course },
  { name: 'Sport', image: Images.sport },
  { name: "Hack'n Slash", image: Images.hacknslash },
  { name: 'Plateforme', image: Images.plateforme },
  { name: 'MMO', image: Images.mmo },
  { name: 'Party Game', image: Images.party },
  { name: 'Roguelike', image: Images.roguelike },
  { name: 'Jeu de cartes', image: Images.cartes },
  { name: 'Musical', image: Images.musical },
  { name: 'Narratif', image: Images.narratif },
  { name: 'Sandbox', image: Images.sandbox },
  { name: 'Metroidvania', image: Images.metroidvania },
];

export const GenreGrid: React.FC = () => (
  <Box
    px={4}
    py={4}
    sx={{
      backgroundColor: '#2b2b2b',
      color: 'white',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <Typography variant="h6" fontWeight="bold" mb={2} marginBottom={5}>
      Parcourir par genre
    </Typography>
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fill, minmax(100px, 1fr))"
      gap={2}
      sx={{ flex: 1, alignItems: 'start' }}
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
            width="100"
            image={genre.image}
            alt={genre.name}
            sx={{
              objectFit: 'contain',
              backgroundColor: '#222',
              width: '100px',
              height: '80px',
              margin: '0 auto',
              display: 'block',
            }}
          />
          <Typography
            variant="caption"
            textAlign="center"
            display="block"
            py={1}
            sx={{
              color: '#fff',
              textShadow: '0 2px 8px #000',
              fontWeight: 'bold',
              letterSpacing: 1,
            }}
          >
            {genre.name}
          </Typography>
        </Card>
      ))}
    </Box>
  </Box>
);

export default GenreGrid;
