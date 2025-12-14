import { Avatar, Box, Button, Paper, Typography } from '@mui/material';
import SecondaryButton from '../components/SecondaryButton';
import Header from '../components/Header';

export default function ProfilePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
      }}
    >
      <Header />
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
        <Box sx={{ p: 3, bgcolor: 'white', minHeight: '100vh' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Ludokan</Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <img
              src="/zelda-banner.jpg"
              alt="Zelda Banner"
              style={{ width: '100%', maxHeight: 250, objectFit: 'cover' }}
            />
            <Box sx={{ position: 'relative', top: -60, left: 20 }}>
              <Avatar sx={{ width: 60, height: 60 }} />
              <SecondaryButton sx={{ mt: 1 }}>Modifier</SecondaryButton>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>N/A</Typography>
              <Typography variant="caption">Commentaires</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>5</Typography>
              <Typography variant="caption">Notation</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>20</Typography>
              <Typography variant="caption">Amis</Typography>
            </Paper>
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Statistiques
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>20</Typography>
              <Typography variant="caption">Total de jeux</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>4</Typography>
              <Typography variant="caption">Total des plateformes</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>N/A</Typography>
              <Typography variant="caption">Titres terminés</Typography>
            </Paper>
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Jeux
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <img
              src="/game1.jpg"
              alt="Game 1"
              style={{ width: 80, height: 120, objectFit: 'cover' }}
            />
            <img
              src="/game2.jpg"
              alt="Game 2"
              style={{ width: 80, height: 120, objectFit: 'cover' }}
            />
            <img
              src="/game3.jpg"
              alt="Game 3"
              style={{ width: 80, height: 120, objectFit: 'cover' }}
            />
            <img
              src="/game4.jpg"
              alt="Game 4"
              style={{ width: 80, height: 120, objectFit: 'cover' }}
            />
            <img
              src="/game5.jpg"
              alt="Game 5"
              style={{ width: 80, height: 120, objectFit: 'cover' }}
            />
            <Button>{'>'}</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
