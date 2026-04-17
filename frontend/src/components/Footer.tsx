import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';

const Footer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const muted = isDark ? '#9e7070' : '#b49393';
  const border = isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.10)';
  const accent = isDark ? '#ef5350' : '#d43c3c';

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        borderTop: `1px solid ${border}`,
        background: isDark ? 'rgba(26,16,16,0.95)' : 'rgba(253,244,244,0.95)',
      }}
    >
      {/* Ligne rouge haut */}
      <Box
        sx={{
          height: '2px',
          background: `linear-gradient(to right, #FF3D3D, #FF8C42, transparent)`,
          opacity: 0.5,
        }}
      />

      <Box
        sx={{
          px: { xs: 3, md: 6 },
          py: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
          alignItems: 'center',
          gap: 3,
        }}
      >
        {/* Gauche — Logo + tagline */}
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 18,
              background: 'linear-gradient(135deg, #FF3D3D 0%, #FF8C42 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 0.4,
            }}
          >
            Ludokan
          </Typography>
          <Typography sx={{ fontSize: 12, color: muted, letterSpacing: 0.3 }}>
            Votre collection, maîtrisée.
          </Typography>
        </Box>

        {/* Centre — Liens */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            justifyContent: 'center',
          }}
        >
          {[
            { label: 'Accueil', to: '/' },
            { label: 'Recherche', to: '/search' },
            { label: 'Profil', to: '/profile' },
            { label: 'À propos', to: '/about' },
          ].map(({ label, to }) => (
            <Typography
              key={label}
              component={Link}
              to={to}
              sx={{
                fontSize: 13,
                fontWeight: 500,
                color: muted,
                textDecoration: 'none',
                letterSpacing: 0.2,
                transition: 'color 0.2s ease',
                '&:hover': { color: accent },
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>

        {/* Droite — IGDB + copyright */}
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography sx={{ fontSize: 11, color: muted, mb: 0.4 }}>
            Données fournies par{' '}
            <Box
              component="a"
              href="https://www.igdb.com"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: accent,
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              IGDB
            </Box>
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: muted,
            }}
          >
            © 2026 Ludokan
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
