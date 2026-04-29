import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const muted = isDark ? '#9e7070' : '#b49393';
  const border = isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.10)';
  const accent = isDark ? '#ef5350' : '#d43c3c';

  const handleSearch = () => {
    navigate('/');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const searchBar = document.querySelector(
        'input[type="text"], input[placeholder*="echerch"]'
      ) as HTMLInputElement;
      if (searchBar) searchBar.focus();
    }, 100);
  };

  const handleHome = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAbout = () => {
    navigate('/about');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        borderTop: `1px solid ${border}`,
        background: isDark ? 'rgba(26,16,16,0.95)' : 'rgba(253,244,244,0.95)',
      }}
    >
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Ludokan"
            sx={{
              height: 36,
              width: 36,
              objectFit: 'contain',
              borderRadius: '50%',
              display: 'block',
            }}
          />
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 18,
                color: isDark ? '#f5e6e6' : '#241818',
                fontFamily: "'Outfit', sans-serif",
                mb: 0.2,
                lineHeight: 1,
              }}
            >
              Ludokan
            </Typography>
            <Typography sx={{ fontSize: 12, color: muted, letterSpacing: 0.3 }}>
              {t('footer.tagline')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            justifyContent: 'center',
          }}
        >
          {[
            { label: t('footer.home'), handler: handleHome },
            { label: t('footer.search'), handler: handleSearch },
            { label: t('footer.about'), handler: handleAbout },
          ].map(({ label, handler }) => (
            <Typography
              key={label}
              onClick={handler}
              sx={{
                fontSize: 13,
                fontWeight: 500,
                color: muted,
                letterSpacing: 0.2,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                '&:hover': { color: accent },
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: muted,
            }}
          >
            {t('footer.copyright')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
