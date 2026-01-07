import { Box, Button, Divider, Paper, Rating, Typography } from '@mui/material';
import SecondaryButton from '../components/SecondaryButton';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export default function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    if (id) {
      apiGet(`/api/games/${id}/`).then((data) => {
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
        backgroundColor: '#fff',
        ml: 25,
        mr: 25,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            p: 6,
            maxWidth: 1400,
            mx: 'auto',
            width: '100%',
            height: 'calc(100vh - 160px)',
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 350,
              height: '100%',
              mr: 4,
            }}
          >
            <img
              src={game.image}
              alt={game.name}
              style={{
                width: '100%',
                height: '90%',
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
              }}
            />
          </Box>
          <Box
            sx={{
              flex: 1.2,
              pr: 6,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
              {game.name}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Plateformes
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {game.platforms && game.platforms.length > 0
                ? game.platforms.map((p: any) => p.name).join(', ')
                : 'Non renseigné'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Description
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {game.description || 'Aucune description disponible.'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Genres
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {game.genres && game.genres.length > 0
                ? game.genres.map((g: any) => g.nom_genre || g.name).join(', ')
                : 'Non renseigné'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Date de sortie
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {game.release_date || 'Non renseignée'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Éditeur
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {game.publisher?.name || 'Non renseigné'}
            </Typography>
          </Box>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 3, borderRightWidth: 2 }}
          />
          <Box
            sx={{
              flex: 0.8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
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
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Avis
            </Typography>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Aucun avis disponible.
              </Typography>
            </Box>
          </Box>
        </Paper>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 2,
            mb: 4,
          }}
        >
          <SecondaryButton>Matchmaking</SecondaryButton>
          <Box sx={{ width: 16 }} />
          <Button variant="contained" color="error">
            Ajouter à la collection
          </Button>
        </Box>
      </Box>
    </Box>
  );
}