import { Card, CardMedia } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import Images from '../assets/genres';

interface Genre {
  id: number;
  name: string;
  image: string;
}

const genres: Genre[] = [
  { id: 4, name: 'Action', image: Images.action },
  { id: 31, name: 'Aventure', image: Images.aventure },
  { id: 12, name: 'RPG', image: Images.rpg },
  { id: 5, name: 'FPS', image: Images.fps },
  { id: 24, name: 'TPS', image: Images.tps },
  { id: 15, name: 'Stratégie', image: Images.strategie },
  { id: 13, name: 'Simulation', image: Images.simulation },
  { id: 9, name: 'Puzzle', image: Images.puzzle },
  { id: 10, name: 'Course', image: Images.course },
  { id: 14, name: 'Sport', image: Images.sport },
  { id: 25, name: "Hack'n Slash", image: Images.hacknslash },
  { id: 8, name: 'Plateforme', image: Images.plateforme },
  { id: 35, name: 'Jeu de cartes', image: Images.cartes },
];

interface GenreGridProps {
  onGenreClick?: (genreId: number, genreName: string) => void;
}

export const GenreGrid: React.FC<GenreGridProps> = ({ onGenreClick }) => (
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
          onClick={() => onGenreClick && onGenreClick(genre.id, genre.name)}
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
