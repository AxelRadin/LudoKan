import { Box, Button, Divider, Paper, Rating, Typography } from '@mui/material';
import Header from '../components/Header';
import SecondaryButton from '../components/SecondaryButton';

export default function GamePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
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
              src="/zelda-twilight.jpg"
              alt="Zelda Twilight Princess"
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
              TITRE
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Plateforme
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              pesetting industry. Lorem Ipsum has been the...
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Description
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been the industry's standard dummy text
              ever since the 1500s...
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
            <Rating value={5} readOnly sx={{ mb: 2, fontSize: 40 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Avis
            </Typography>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Pseudo 1 :</b> pesetting industry. Lorem Ipsum has been the
                industry's standard dummy text ever since the 1500s...
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Pseudo 2 :</b> pesetting industry. Lorem Ipsum has been the
                industry's standard dummy text ever since the 1500s...
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
