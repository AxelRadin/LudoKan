import Box from '@mui/material/Box';
import { Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

const F = "'Outfit', sans-serif";

export default function AboutPage() {
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
      title: 'Catalogue immense',
      desc: 'Des milliers de jeux centralisés grâce aux données IGDB, avec couvertures, descriptions et informations détaillées.',
    },
    {
      icon: <SearchIcon sx={{ fontSize: 28, color: accent }} />,
      title: 'Recherche avancée',
      desc: 'Filtre par genre, plateforme, note ou date de sortie. Trouve exactement ce que tu cherches en quelques secondes.',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 28, color: accent }} />,
      title: 'Matchmaking',
      desc: 'Trouve des joueurs qui partagent tes goûts et tes habitudes de jeu grâce à notre système de matchmaking.',
    },
    {
      icon: <CollectionsBookmarkIcon sx={{ fontSize: 28, color: accent }} />,
      title: 'Ta collection',
      desc: 'Gère et personnalise ta bibliothèque. Marque tes jeux en cours, terminés ou en envie de jouer.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: F,
        background: isDark
          ? `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 28%),
              radial-gradient(circle at 86% 16%, rgba(120,20,20,0.18) 0%, transparent 28%),
              linear-gradient(180deg, #1a1010 0%, #221414 55%, #1e1212 100%)
            `
          : `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
              radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 24%),
              radial-gradient(circle at 86% 16%, rgba(255,210,210,0.80) 0%, transparent 26%),
              linear-gradient(180deg, #fdf4f4 0%, #f9ecec 55%, #fef6f6 100%)
            `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 6, md: 8 },
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* ── HERO ── */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.4,
              borderRadius: 999,
              background: accentSoft,
              border: `1px solid ${accentGlow}`,
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
              }}
            />
            <Typography
              sx={{
                fontFamily: F,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: accent,
              }}
            >
              À propos
            </Typography>
          </Box>

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
            Votre univers vidéoludique,{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #FF3D3D 0%, #FF8C42 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              maîtrisé.
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
            Ludokan est une ludothèque de jeux vidéo personnalisable conçue pour
            aider les joueurs à découvrir, explorer et partager leurs
            expériences vidéoludiques.
          </Typography>
        </Box>

        {/* ── MISSION ── */}
        <Box sx={{ ...card, p: { xs: 3, md: 5 }, mb: 3 }}>
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
                sx={{
                  width: 14,
                  height: '1px',
                  background: accent,
                  opacity: 0.6,
                }}
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
                Notre mission
              </Typography>
            </Box>
          </Box>
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
            Centraliser, découvrir, partager.
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 15, color: muted, lineHeight: 1.85 }}
          >
            La plateforme centralise un vaste catalogue de jeux, propose des
            recommandations intelligentes, et permet de gérer facilement sa
            collection personnelle. Grâce à des outils de recherche avancés, un
            système de matchmaking, et des fonctionnalités sociales, Ludokan
            crée un véritable espace communautaire autour du jeu vidéo.
          </Typography>
        </Box>

        {/* ── FEATURES ── */}
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

        {/* ── VISION ── */}
        <Box sx={{ ...card, p: { xs: 3, md: 5 }, mb: 3 }}>
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
                sx={{
                  width: 14,
                  height: '1px',
                  background: accent,
                  opacity: 0.6,
                }}
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
                Notre vision
              </Typography>
            </Box>
          </Box>
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
            Un espace pour chaque joueur.
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 15, color: muted, lineHeight: 1.85 }}
          >
            Nous croyons que chaque joueur mérite un espace qui lui ressemble.
            Que tu sois un joueur occasionnel ou un hardcore gamer, Ludokan
            s'adapte à tes habitudes et te connecte à une communauté qui partage
            ta passion. Notre ambition : faire de Ludokan la référence
            francophone de la gestion de collection vidéoludique.
          </Typography>
        </Box>

        {/* ── CTA ── */}
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
              ? 'Bienvenue sur Ludokan !'
              : 'Prêt à rejoindre la communauté ?'}
          </Typography>
          <Typography
            sx={{ fontFamily: F, fontSize: 14, color: muted, mb: 3.5 }}
          >
            {isAuthenticated
              ? 'Retrouve ta collection et continue à explorer.'
              : "Crée ton compte gratuitement et commence à gérer ta collection dès aujourd'hui."}
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
            {isAuthenticated ? 'Mon profil' : 'Rejoindre Ludokan'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
