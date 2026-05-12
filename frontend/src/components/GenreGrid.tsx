import { useTheme } from '@mui/material/styles';
import { Card, CardMedia } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Images from '../assets/genres';

interface Genre {
  id: number;
  name: string;
  image: string;
  gradient: string;
  color: string;
}

const genres: Genre[] = [
  {
    id: 4,
    name: 'Action',
    image: Images.action,
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    color: '#FF6B6B',
  },
  {
    id: 31,
    name: 'Aventure',
    image: Images.aventure,
    gradient: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)',
    color: '#F6D365',
  },
  {
    id: 12,
    name: 'RPG',
    image: Images.rpg,
    gradient: 'linear-gradient(135deg, #A8EDEA 0%, #6DD5FA 100%)',
    color: '#6DD5FA',
  },
  {
    id: 5,
    name: 'FPS',
    image: Images.fps,
    gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    color: '#4ECDC4',
  },
  {
    id: 24,
    name: 'TPS',
    image: Images.tps,
    gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
    color: '#667EEA',
  },
  {
    id: 15,
    name: 'Stratégie',
    image: Images.strategie,
    gradient: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
    color: '#A18CD1',
  },
  {
    id: 13,
    name: 'Simulation',
    image: Images.simulation,
    gradient: 'linear-gradient(135deg, #FAD0C4 0%, #FFD1FF 100%)',
    color: '#FAD0C4',
  },
  {
    id: 9,
    name: 'Puzzle',
    image: Images.puzzle,
    gradient: 'linear-gradient(135deg, #FEC163 0%, #DE4313 100%)',
    color: '#FEC163',
  },
  {
    id: 10,
    name: 'Course',
    image: Images.course,
    gradient: 'linear-gradient(135deg, #89F7FE 0%, #66A6FF 100%)',
    color: '#89F7FE',
  },
  {
    id: 14,
    name: 'Sport',
    image: Images.sport,
    gradient: 'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)',
    color: '#84FAB0',
  },
  {
    id: 25,
    name: "Hack'n Slash",
    image: Images.hacknslash,
    gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
    color: '#FA709A',
  },
  {
    id: 8,
    name: 'Plateforme',
    image: Images.plateforme,
    gradient: 'linear-gradient(135deg, #30CFD0 0%, #330867 100%)',
    color: '#30CFD0',
  },
  {
    id: 35,
    name: 'Jeu de cartes',
    image: Images.cartes,
    gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)',
    color: '#FF9A9E',
  },
];

interface GenreGridProps {
  onGenreClick?: (genreId: number, genreName: string) => void;
}

export const GenreGrid: React.FC<GenreGridProps> = ({ onGenreClick }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
        }}
        gap={{ xs: 2, md: 2.5 }}
        sx={{
          // Centrer la dernière carte si elle est seule
          '& > :last-child:nth-child(4n+1)': {
            gridColumn: { md: '2 / 4' }, // Colonnes 2 à 3 (au milieu)
          },
        }}
      >
        {genres.map(genre => (
          <Card
            key={genre.name}
            onClick={() => onGenreClick?.(genre.id, genre.name)}
            sx={{
              cursor: 'pointer',
              borderRadius: '20px',
              overflow: 'hidden',
              background: isDark
                ? 'rgba(42,32,32,0.6)'
                : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDark
                ? '0 8px 24px rgba(0,0,0,0.3)'
                : '0 8px 24px rgba(0,0,0,0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-8px) scale(1.02)',
                border: `2px solid ${genre.color}`,
                boxShadow: isDark
                  ? `0 20px 40px ${genre.color}40`
                  : `0 12px 32px ${genre.color}30`,
                '& .genre-image': {
                  transform: 'scale(1.1) rotate(2deg)',
                },
                '& .genre-bg': {
                  opacity: 0.15,
                },
              },
            }}
          >
            {/* Background gradient animé */}
            <Box
              className="genre-bg"
              sx={{
                position: 'absolute',
                inset: 0,
                background: genre.gradient,
                opacity: 0.08,
                transition: 'opacity 0.3s ease',
                zIndex: 0,
              }}
            />

            {/* Contenu */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {/* Image */}
              <Box
                sx={{
                  px: 2,
                  pt: 2.5,
                  pb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120,
                }}
              >
                <CardMedia
                  component="img"
                  image={genre.image}
                  alt={t(`genres.${genre.name}`)}
                  className="genre-image"
                  sx={{
                    width: '75%',
                    height: 80,
                    objectFit: 'contain',
                    display: 'block',
                    filter: isDark ? 'brightness(1.1)' : 'none',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </Box>

              {/* Nom + ligne décorative */}
              <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
                <Typography
                  textAlign="center"
                  sx={{
                    color: isDark ? '#f5e6e6' : '#2b2b2b',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: '-0.3px',
                    fontFamily: "'Outfit', sans-serif",
                    mb: 1,
                  }}
                >
                  {t(`genres.${genre.name}`)}
                </Typography>
                <Box
                  sx={{
                    width: 32,
                    height: '2.5px',
                    borderRadius: '999px',
                    mx: 'auto',
                    background: `linear-gradient(to right, transparent, ${genre.color}, transparent)`,
                    opacity: 0.7,
                  }}
                />
              </Box>
            </Box>

            {/* Effet de shine au hover */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '50%',
                height: '100%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transition: 'left 0.5s ease',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default GenreGrid;
