import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ExploreIcon from '@mui/icons-material/Explore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';

// Composant pour la section "Explorer par genre"
const ExploreByGenreSection = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';

  // Liste des genres avec icônes et couleurs
  const genres = [
    {
      id: 4,
      name: 'Action',
      icon: <FlashOnIcon />,
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      color: '#FF6B6B',
    },
    {
      id: 5,
      name: 'FPS',
      icon: <SportsEsportsIcon />,
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
      color: '#4ECDC4',
    },
    {
      id: 12,
      name: 'RPG',
      icon: <AutoAwesomeIcon />,
      gradient: 'linear-gradient(135deg, #A8EDEA 0%, #6DD5FA 100%)',
      color: '#6DD5FA',
    },
    {
      id: 31,
      name: 'Aventure',
      icon: <ExploreIcon />,
      gradient: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)',
      color: '#F6D365',
    },
    {
      id: 10,
      name: 'Stratégie',
      icon: <PsychologyIcon />,
      gradient: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
      color: '#A18CD1',
    },
    {
      id: 14,
      name: 'Sport',
      icon: <SportsMartialArtsIcon />,
      gradient: 'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)',
      color: '#84FAB0',
    },
    {
      id: 32,
      name: 'Indie',
      icon: <FavoriteIcon />,
      gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)',
      color: '#FF9A9E',
    },
    {
      id: 36,
      name: 'Multijoueur',
      icon: <GroupsIcon />,
      gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      color: '#667EEA',
    },
  ];

  const handleGenreClick = (genreId: number, genreName: string) => {
    navigate(`/trending/genre/${genreId}`, { state: { genreName } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ mb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: 28, md: 36 },
            mb: 1,
            background: isDark
              ? 'linear-gradient(135deg, #FF3D3D 0%, #FF8A80 100%)'
              : 'linear-gradient(135deg, #FF3D3D 0%, #D32F2F 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {t('homePage.exploreByGenre')}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            fontSize: 16,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Découvrez des milliers de jeux classés par genre
        </Typography>
      </Box>

      {/* Grille de genres */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: { xs: 2, md: 3 },
        }}
      >
        {genres.map(genre => (
          <Box
            key={genre.id}
            onClick={() => handleGenreClick(genre.id, genre.name)}
            sx={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 4,
              overflow: 'hidden',
              cursor: 'pointer',
              background: isDark
                ? 'rgba(42,32,32,0.6)'
                : 'rgba(255,255,255,0.8)',
              border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px) scale(1.02)',
                boxShadow: isDark
                  ? `0 20px 40px ${genre.color}40`
                  : `0 12px 32px ${genre.color}30`,
                border: `2px solid ${genre.color}`,
                '& .genre-icon': {
                  transform: 'scale(1.2) rotate(5deg)',
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
              }}
            />

            {/* Contenu */}
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 3,
              }}
            >
              {/* Icône */}
              <Box
                className="genre-icon"
                sx={{
                  fontSize: { xs: 40, md: 48 },
                  color: genre.color,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                }}
              >
                {genre.icon}
              </Box>

              {/* Nom du genre */}
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 16, md: 18 },
                  color: isDark ? '#f5e6e6' : '#2b2b2b',
                  textAlign: 'center',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.3px',
                }}
              >
                {genre.name}
              </Typography>
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
                '.genre-card:hover &': {
                  left: '150%',
                },
              }}
            />
          </Box>
        ))}
      </Box>

      {/* CTA pour voir tous les genres */}
      <Box
        sx={{
          mt: 5,
          textAlign: 'center',
        }}
      >
        <Typography
          component="button"
          onClick={() => navigate('/genres')}
          sx={{
            background: 'none',
            border: `2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 999,
            px: 4,
            py: 1.5,
            fontSize: 16,
            fontWeight: 600,
            color: isDark ? '#f5e6e6' : '#2b2b2b',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontFamily: "'Outfit', sans-serif",
            '&:hover': {
              borderColor: '#FF3D3D',
              color: '#FF3D3D',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px rgba(255,61,61,0.2)',
            },
          }}
        >
          Voir tous les genres →
        </Typography>
      </Box>
    </Box>
  );
};

export default ExploreByGenreSection;
