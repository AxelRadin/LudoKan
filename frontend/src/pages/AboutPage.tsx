import Box from '@mui/material/Box';
import { Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';

import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

const F = "'Outfit', sans-serif";

function AboutSectionHeading({
  label,
  accent,
}: Readonly<{ label: string; accent: string }>) {
  return (
    <Box sx={{ position: 'relative', pl: '14px', mb: 2.5 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '80%',
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
          borderRadius: '2px',
          opacity: 0.8,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{ width: 14, height: '1px', background: accent, opacity: 0.6 }}
        />
        <Typography
          sx={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.9,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AboutPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { setAuthModalOpen, setAuthMode, isAuthenticated } = useAuth();

  const accent = isDark ? '#ef5350' : '#d43c3c';
  const accentSoft = isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.08)';
  const accentGlow = isDark ? 'rgba(239,83,80,0.25)' : 'rgba(198,40,40,0.15)';
  const ink = isDark ? '#f5e6e6' : '#241818';
  const muted = isDark ? '#9e7070' : '#b49393';
  const cardBg = isDark ? 'rgba(40,20,20,0.65)' : 'rgba(255,255,255,0.80)';
  const cardBorder = isDark ? 'rgba(239,83,80,0.14)' : 'rgba(198,40,40,0.10)';

  const card = {
    background: cardBg,
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: `1px solid ${cardBorder}`,
    borderRadius: '20px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30)'
      : '0 4px 24px rgba(198,40,40,0.06)',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 20,
      right: 20,
      height: '1px',
      background: `linear-gradient(to right, ${accent} 0%, transparent 60%)`,
      opacity: isDark ? 0.5 : 0.35,
    },
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: isDark
        ? '0 12px 36px rgba(239,83,80,0.12)'
        : '0 12px 36px rgba(198,40,40,0.10)',
    },
  };

  const features = [
    {
      icon: <SportsEsportsIcon sx={{ fontSize: 28, color: accent }} />,
      title: t('about.feature1Title'),
      desc: t('about.feature1Desc'),
    },
    {
      icon: <SearchIcon sx={{ fontSize: 28, color: accent }} />,
      title: t('about.feature2Title'),
      desc: t('about.feature2Desc'),
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 28, color: accent }} />,
      title: t('about.feature3Title'),
      desc: t('about.feature3Desc'),
    },
    {
      icon: <CollectionsBookmarkIcon sx={{ fontSize: 28, color: accent }} />,
      title: t('about.feature4Title'),
      desc: t('about.feature4Desc'),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: F,
        background: isDark ? `...` : `...`,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 6, md: 8 },
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* HERO */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            sx={{
              fontFamily: F,
              fontWeight: 800,
              fontSize: { xs: 36, md: 52 },
              color: ink,
              letterSpacing: -1,
              lineHeight: 1.05,
              mb: 2.5,
            }}
          >
            {t('about.heroTitle')}{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #FF3D3D 0%, #FF8C42 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('about.heroTitleAccent')}
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: F,
              fontSize: { xs: 15, md: 17 },
              color: muted,
              lineHeight: 1.8,
              maxWidth: 620,
              mx: 'auto',
            }}
          >
            {t('about.heroSubtitle')}
          </Typography>
        </Box>

        {/* MISSION */}
        <Box sx={{ ...card, p: { xs: 3, md: 5 }, mb: 3 }}>
          <AboutSectionHeading
            label={t('about.missionLabel')}
            accent={accent}
          />
          <Typography
            sx={{
              fontFamily: F,
              fontWeight: 700,
              fontSize: { xs: 22, md: 28 },
              color: ink,
              letterSpacing: -0.5,
              mb: 2,
            }}
          >
            {t('about.missionTitle')}
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 15, color: muted, lineHeight: 1.85 }}
          >
            {t('about.missionDesc')}
          </Typography>
        </Box>

        {/* FEATURES */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          {features.map(({ icon, title, desc }) => (
            <Box key={title} sx={{ ...card, p: 3 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  background: accentSoft,
                  border: `1px solid ${accentGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                {icon}
              </Box>
              <Typography
                sx={{
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 17,
                  color: ink,
                  mb: 1,
                  letterSpacing: -0.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: F,
                  fontSize: 13.5,
                  color: muted,
                  lineHeight: 1.75,
                }}
              >
                {desc}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* VISION */}
        <Box sx={{ ...card, p: { xs: 3, md: 5 }, mb: 3 }}>
          <AboutSectionHeading label={t('about.visionLabel')} accent={accent} />
          <Typography
            sx={{
              fontFamily: F,
              fontWeight: 700,
              fontSize: { xs: 22, md: 28 },
              color: ink,
              letterSpacing: -0.5,
              mb: 2,
            }}
          >
            {t('about.visionTitle')}
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 15, color: muted, lineHeight: 1.85 }}
          >
            {t('about.visionDesc')}
          </Typography>
        </Box>

        {/* CTA */}
        <Box sx={{ ...card, p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: F,
              fontWeight: 800,
              fontSize: { xs: 22, md: 30 },
              color: ink,
              letterSpacing: -0.5,
              mb: 1.5,
            }}
          >
            {isAuthenticated
              ? t('about.ctaTitleAuth')
              : t('about.ctaTitleGuest')}
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 14, color: muted, mb: 3.5 }}
          >
            {isAuthenticated ? t('about.ctaDescAuth') : t('about.ctaDescGuest')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              if (isAuthenticated) {
                navigate('/profile');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setAuthMode('register');
                setAuthModalOpen(true);
              }
            }}
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.2,
              fontWeight: 700,
              fontSize: 14,
              textTransform: 'none',
              fontFamily: F,
              background: `linear-gradient(135deg, ${accent} 0%, #ef5350 100%)`,
              boxShadow: `0 4px 16px rgba(211,47,47,0.32)`,
              '&:hover': {
                background: `linear-gradient(135deg, #b71c1c 0%, ${accent} 100%)`,
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 22px rgba(211,47,47,0.42)`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isAuthenticated ? t('about.ctaBtnAuth') : t('about.ctaBtnGuest')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
