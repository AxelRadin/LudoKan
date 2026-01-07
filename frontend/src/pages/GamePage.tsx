import BookmarkIcon from '@mui/icons-material/Bookmark';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import DevicesIcon from '@mui/icons-material/Devices';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ListIcon from '@mui/icons-material/List';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import {
  Box,
  Button,
  Divider,
  Paper,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SecondaryButton from '../components/SecondaryButton';
import { apiGet } from '../services/api';

export default function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      apiGet(`/api/games/${id}/`).then(data => {
        let image = data.cover_url;
        if (image && image.includes('t_thumb')) {
          image = image.replace('t_thumb', 't_1080p');
        } else if (image && image.includes('t_cover_big')) {
          image = image.replace('t_cover_big', 't_1080p');
        }
        setGame({ ...data, image });
      });
    }
  }, [id]);

  if (!game) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="h5">Chargement du jeu...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffd3d3',
        px: { xs: 1, sm: 4, md: 10, lg: 25 },
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: { xs: 2, sm: 4, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1400,
            mt: { xs: 2, md: 0 },
            mx: 'auto',
            width: '100%',
            boxSizing: 'border-box',
            bgcolor: '#fafafa',
            p: { xs: 2, sm: 4, md: 6 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              position: 'relative',
              borderRadius: 3,
              mb: 4,
              py: { xs: 2, md: 4 },
              px: { xs: 2, md: 6 },
              textAlign: 'center',
              boxShadow: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 90,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: `linear-gradient(to right, black 20%, transparent 30%, transparent 70%, black 80%),url(${game.image})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'black',
                filter: 'brightness(0.8) blur(1px)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
              }}
            />
            <Typography
              variant="h3"
              sx={{
                letterSpacing: 1,
                position: 'relative',
              }}
            >
              <span
                style={{
                  WebkitTextStroke: '2px #fff',
                  WebkitTextFillColor: '#fff',
                  color: '#fff',
                  padding: '0 8px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.25)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                {game.name}
              </span>
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: { xs: 'center', md: 'stretch' },
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: { xs: '100%', md: 350 },
                mr: { md: 4 },
                mb: { xs: 2, md: 0 },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 220, sm: 300, md: 400 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <img
                  src={game.image}
                  alt={game.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: 16,
                  }}
                />
              </Box>
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mt: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Notes de la communauté
                </Typography>
                <Rating
                  value={game.average_rating || game.rating_avg || 0}
                  readOnly
                  sx={{ mb: 2, fontSize: 40 }}
                />
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: '#f5f6fa',
                    borderRadius: 2,
                    mt: 3,
                    p: 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Ma note
                  </Typography>
                  <Rating
                    value={userRating || 0}
                    onChange={(_, value) => setUserRating(value)}
                    sx={{ mb: 2, fontSize: 32 }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      width: '100%',
                      mt: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="action" />
                      <Typography variant="body2">Joué</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BookmarkIcon color="action" />
                      <Typography variant="body2">Envie d'y jouer</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PlayCircleIcon color="action" />
                      <Typography variant="body2">En cours</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FavoriteIcon color="action" />
                      <Typography variant="body2">Coup de cœur</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ListIcon color="action" />
                      <Typography variant="body2">
                        Ajouter à une liste
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            {/* Colonne droite : infos */}
            <Box
              sx={{
                flex: 1.2,
                pr: { md: 6 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                minWidth: 0,
                mt: { xs: 4, md: 0 },
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <DevicesIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Plateformes
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.platforms && game.platforms.length > 0
                  ? game.platforms.map((p: any) => p.nom_plateforme).join(', ')
                  : 'Non renseigné'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <DescriptionIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.description || 'Aucune description disponible.'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CategoryIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Genres
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.genres && game.genres.length > 0
                  ? game.genres
                      .map((g: any) => g.nom_genre || g.name)
                      .join(', ')
                  : 'Non renseigné'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CalendarTodayIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Date de sortie
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.release_date || 'Non renseignée'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <BusinessIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Éditeur
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.publisher?.name || 'Non renseigné'}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: { xs: 'center', sm: 'flex-end' },
              alignItems: 'center',
              gap: 2,
              mt: 3,
              maxWidth: 1400,
              mx: 'auto',
              width: '100%',
            }}
          >
            <SecondaryButton>Matchmaking</SecondaryButton>
            <Button variant="contained" color="error">
              Ajouter à la collection
            </Button>
          </Box>
          <Divider sx={{ my: 4 }} />
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              bgcolor: '#fff',
              borderRadius: 4,
              p: { xs: 2, sm: 4 },
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 2,
                textAlign: 'center',
                width: '100%',
              }}
            >
              Avis
            </Typography>
            <TextField
              label="Écrire un avis"
              multiline
              minRows={1}
              maxRows={3}
              fullWidth={false}
              variant="outlined"
              sx={{
                mb: 3,
                width: '350px',
                maxWidth: '100%',
                alignItems: 'flex-start',
              }}
            />
            <Typography variant="body2" sx={{ mb: 1 }}>
              Aucun avis disponible.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
