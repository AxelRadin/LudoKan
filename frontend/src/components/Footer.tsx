import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Footer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        py: 3,
        px: 4,
        borderTop: `1px solid ${isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.10)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        background: isDark ? 'rgba(26,16,16,0.95)' : 'rgba(253,244,244,0.95)',
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 15,
          background: 'linear-gradient(135deg, #FF3D3D 0%, #FF8C42 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Ludokan
      </Typography>

      <Typography
        sx={{
          fontSize: 12,
          color: isDark ? '#9e7070' : '#b49393',
          letterSpacing: 0.5,
        }}
      >
        Votre collection, maîtrisée.
      </Typography>

      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: isDark ? '#9e7070' : '#b49393',
        }}
      >
        © 2026
      </Typography>
    </Box>
  );
};

export default Footer;
