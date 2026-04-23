import { alpha } from '@mui/material/styles';
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

const C = {
  card: 'rgba(255,255,255,0.68)',
  cardHover: 'rgba(255,255,255,0.88)',
  border: 'rgba(198,40,40,0.10)',
  borderHover: 'rgba(198,40,40,0.24)',
  accent: '#c62828',
  ink: '#241818',
  muted: '#7e6464',
  mediaBg: 'linear-gradient(180deg, #fffafa 0%, #f8efee 100%)',
};

export const GenreGrid: React.FC<GenreGridProps> = ({ onGenreClick }) => (
  <Box
    sx={{
      width: '100%',
    }}
  >
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
      gap={{ xs: 1.5, md: 2 }}
    >
      {genres.map(genre => (
        <Card
          key={genre.name}
          onClick={() => onGenreClick?.(genre.id, genre.name)}
          sx={{
            cursor: 'pointer',
            borderRadius: '20px',
            overflow: 'hidden',
            background: C.card,
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: `1px solid ${C.border}`,
            boxShadow: '0 14px 32px rgba(36,24,24,0.04)',
            transition:
              'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease, background 0.28s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              background: C.cardHover,
              borderColor: C.borderHover,
              boxShadow: '0 18px 36px rgba(198,40,40,0.10)',
            },
          }}
        >
          <Box
            sx={{
              px: 1.5,
              pt: 1.5,
              pb: 1,
            }}
          >
            <Box
              sx={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: C.mediaBg,
                border: `1px solid ${alpha('#c62828', 0.06)}`,
                minHeight: 96,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.28s ease',
                '.MuiCard-root:hover &': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardMedia
                component="img"
                image={genre.image}
                alt={genre.name}
                sx={{
                  width: '72%',
                  height: 72,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              px: 1.5,
              pb: 1.6,
              pt: 0.4,
            }}
          >
            <Typography
              textAlign="center"
              sx={{
                color: C.ink,
                fontSize: '0.92rem',
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {genre.name}
            </Typography>

            <Box
              sx={{
                width: 26,
                height: '2px',
                borderRadius: '999px',
                mx: 'auto',
                mt: 1,
                background: `linear-gradient(to right, ${alpha(C.accent, 0.18)}, ${alpha(C.accent, 0.55)}, ${alpha(C.accent, 0.18)})`,
              }}
            />
          </Box>
        </Card>
      ))}
    </Box>
  </Box>
);

export default GenreGrid;
