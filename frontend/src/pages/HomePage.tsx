import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';
import { useHomeTrending } from '../hooks/useHomeTrending';

/* ─── Keyframes globales ─── */
const styleEl = document.createElement('style');
styleEl.dataset.homeLux = '1';
styleEl.textContent = `
  @keyframes luxFadeUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes luxBlobFloat1 {
    0%, 100% { transform: translate(-50%, 0) scale(1); }
    33%      { transform: translate(-45%, -8%) scale(1.08); }
    66%      { transform: translate(-55%, 6%) scale(0.95); }
  }
  @keyframes luxBlobFloat2 {
    0%, 100% { transform: translate(-50%, 0) scale(1); }
    33%      { transform: translate(-58%, 6%) scale(1.05); }
    66%      { transform: translate(-44%, -5%) scale(0.92); }
  }
  @keyframes luxShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .lux-s1 { animation: luxFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
  .lux-s2 { animation: luxFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
  .lux-s3 { animation: luxFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.31s both; }
  .lux-s4 { animation: luxFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
  .lux-blob-1 { animation: luxBlobFloat1 18s ease-in-out infinite; }
  .lux-blob-2 { animation: luxBlobFloat2 22s ease-in-out infinite; }
  .lux-shimmer-text {
    background: linear-gradient(110deg, currentColor 0%, currentColor 40%, rgba(255,255,255,0.85) 50%, currentColor 60%, currentColor 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: luxShimmer 6s ease-in-out infinite;
  }
`;
if (!document.head.querySelector('style[data-home-lux]')) {
  document.head.appendChild(styleEl);
}

const F = "'Outfit', sans-serif";
const F_DISPLAY = "'Instrument Serif', 'Fraunces', serif";

const C = {
  bgBase: '#fef7f7',
  bgSoft: '#fce8e8',
  bgWarm: '#fff1f1',
  glass: 'rgba(255,255,255,0.55)',
  border: 'rgba(198,40,40,0.08)',
  borderHover: 'rgba(198,40,40,0.20)',
  accent: '#b71c1c',
  accentSoft: '#e53935',
  accentBright: '#ff5252',
  accentPink: '#ff8a8a',
  ink: '#1a0e0e',
  inkSoft: '#5a3838',

  darkBgBase: '#140909',
  darkBgSoft: '#1d0d0d',
  darkBgWarm: '#180b0b',
  darkGlass: 'rgba(50,20,20,0.45)',
  darkBorder: 'rgba(255,120,120,0.10)',
  darkBorderHover: 'rgba(255,120,120,0.25)',
  darkAccentSoft: '#ff5252',
  darkAccentBright: '#ff7a7a',
  darkAccentPink: '#ffa8a8',
  darkInk: '#fbe8e8',
  darkInkSoft: '#d4a8a8',
};

/* ────────────────────────────────────────────────────────────
   Header de section — chip + titre mixte serif/italique
   ──────────────────────────────────────────────────────────── */

type SectionHeaderProps = Readonly<{
  index: string;
  kicker: string;
  title: string;
  subtitle?: string;
  to: string;
  variant: 'a' | 'b' | 'c';
}>;

function SectionHeader({
  index,
  kicker,
  title,
  subtitle,
  to,
  variant,
}: SectionHeaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const ink = isDark ? C.darkInk : C.ink;
  const inkSoft = isDark ? C.darkInkSoft : C.inkSoft;
  const accent = isDark ? C.darkAccentBright : C.accentSoft;
  const accentPink = isDark ? C.darkAccentPink : C.accentPink;

  const words = title.split(' ');
  let titleNode: ReactNode = title;
  if (variant === 'a' && words.length > 1) {
    titleNode = (
      <>
        {words.slice(0, -1).join(' ')}{' '}
        <Box component="span" sx={{ fontStyle: 'italic', color: accent }}>
          {words[words.length - 1]}
        </Box>
      </>
    );
  } else if (variant === 'b') {
    titleNode = (
      <Box component="span" sx={{ fontStyle: 'italic' }}>
        {title}
      </Box>
    );
  } else if (variant === 'c' && words.length > 1) {
    titleNode = (
      <>
        <Box component="span" sx={{ fontStyle: 'italic', color: accent }}>
          {words[0]}
        </Box>{' '}
        {words.slice(1).join(' ')}
      </>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 },
        mb: 4,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* chip index + kicker */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.2,
            mb: 1.8,
            py: 0.7,
            pl: 1.2,
            pr: 1.8,
            borderRadius: '999px',
            background: isDark
              ? 'rgba(255,82,82,0.10)'
              : 'rgba(229,57,53,0.08)',
            border: `1px solid ${isDark ? 'rgba(255,122,122,0.18)' : 'rgba(229,57,53,0.15)'}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, ${accentPink})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F,
              fontSize: 9,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {index}
          </Box>
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {kicker}
          </Typography>
        </Box>

        {/* titre */}
        <Typography
          component={Link}
          to={to}
          sx={{
            fontFamily: F_DISPLAY,
            fontWeight: 400,
            fontSize: { xs: 36, md: 52 },
            color: ink,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'color 0.4s ease',
            '&:hover': { color: accent },
            '&:hover .lux-arrow-inline': {
              transform: 'translateX(8px) rotate(-12deg)',
              color: accent,
            },
          }}
        >
          {titleNode}
          <Box
            component="span"
            className="lux-arrow-inline"
            sx={{
              display: 'inline-block',
              ml: 1.5,
              fontSize: '0.65em',
              color: inkSoft,
              transition:
                'transform 0.4s cubic-bezier(0.16,1,0.3,1), color 0.4s ease',
              transformOrigin: 'left center',
            }}
          >
            ↗
          </Box>
        </Typography>

        {subtitle && (
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 14,
              fontWeight: 400,
              color: inkSoft,
              mt: 1.2,
              maxWidth: 520,
              lineHeight: 1.55,
              opacity: 0.85,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* CTA pillule glass */}
      <Box
        component={Link}
        to={to}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          py: 1.1,
          px: 2.2,
          borderRadius: '999px',
          fontFamily: F,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: ink,
          textDecoration: 'none',
          background: isDark ? C.darkGlass : C.glass,
          border: `1px solid ${isDark ? C.darkBorder : C.border}`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          flexShrink: 0,
          transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
          '&:hover': {
            background: `linear-gradient(135deg, ${accent}, ${accentPink})`,
            color: '#fff',
            borderColor: 'transparent',
            transform: 'translateY(-2px)',
            boxShadow: `0 12px 28px ${isDark ? 'rgba(255,82,82,0.35)' : 'rgba(229,57,53,0.30)'}`,
          },
        }}
      >
        Voir tout
        <Box component="span" sx={{ fontSize: 14 }}>
          →
        </Box>
      </Box>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────
   Section — coins très ronds, glassmorphism, blobs colorés
   ──────────────────────────────────────────────────────────── */

type SectionProps = Readonly<{
  children: ReactNode;
  className?: string;
  coverUrl?: string;
  blobPosition: 'left' | 'right' | 'center';
  blobIntensity?: number;
}>;

function Section({
  children,
  className,
  coverUrl,
  blobPosition,
  blobIntensity = 1,
}: SectionProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const accent = isDark ? C.darkAccentSoft : C.accentSoft;
  const accentPink = isDark ? C.darkAccentPink : C.accentPink;

  let blobLeft1 = '20%';
  let blobLeft2 = '70%';
  if (blobPosition === 'left') {
    blobLeft1 = '-5%';
    blobLeft2 = '25%';
  } else if (blobPosition === 'right') {
    blobLeft1 = '85%';
    blobLeft2 = '60%';
  }

  return (
    <Box
      ref={sectionRef}
      className={className}
      sx={{
        position: 'relative',
        borderRadius: { xs: '28px', md: '40px' },
        mb: 3,
        overflow: 'hidden',
        background: isDark ? C.darkGlass : C.glass,
        border: `1px solid ${isDark ? C.darkBorder : C.border}`,
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        boxShadow: isDark
          ? '0 30px 80px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 30px 80px -20px rgba(198,40,40,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
        '&:hover': {
          borderColor: isDark ? C.darkBorderHover : C.borderHover,
          transform: 'translateY(-3px)',
          boxShadow: isDark
            ? '0 40px 100px -20px rgba(255,82,82,0.22), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 40px 100px -20px rgba(229,57,53,0.28), inset 0 1px 0 rgba(255,255,255,0.6)',
        },
      }}
    >
      {/* blob 1 */}
      <Box
        className="lux-blob-1"
        sx={{
          position: 'absolute',
          width: { xs: 280, md: 420 },
          height: { xs: 280, md: 420 },
          left: blobLeft1,
          top: '-15%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: visible ? 0.35 * blobIntensity : 0,
          filter: 'blur(60px)',
          transition: 'opacity 1.4s ease',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {/* blob 2 */}
      <Box
        className="lux-blob-2"
        sx={{
          position: 'absolute',
          width: { xs: 240, md: 360 },
          height: { xs: 240, md: 360 },
          left: blobLeft2,
          bottom: '-20%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentPink} 0%, transparent 70%)`,
          opacity: visible ? 0.28 * blobIntensity : 0,
          filter: 'blur(70px)',
          transition: 'opacity 1.6s ease',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {/* cover en filigrane très subtile */}
      {coverUrl && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) saturate(1.8)',
            opacity: visible ? (isDark ? 0.18 : 0.1) : 0,
            transform: 'scale(1.3)',
            transition: 'opacity 1.8s ease',
            zIndex: 0,
            mixBlendMode: isDark ? 'screen' : 'multiply',
          }}
        />
      )}
      {/* highlight bord supérieur */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '15%',
          right: '15%',
          height: '1px',
          background: `linear-gradient(to right, transparent, ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'}, transparent)`,
          zIndex: 2,
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          p: { xs: '28px 22px', md: '44px 48px' },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────
   Hero
   ──────────────────────────────────────────────────────────── */

function Hero() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const ink = isDark ? C.darkInk : C.ink;
  const inkSoft = isDark ? C.darkInkSoft : C.inkSoft;
  const accent = isDark ? C.darkAccentBright : C.accentSoft;

  return (
    <Box sx={{ mb: { xs: 4, md: 6 }, position: 'relative' }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          py: 0.6,
          px: 1.5,
          borderRadius: '999px',
          background: isDark ? 'rgba(255,82,82,0.08)' : 'rgba(229,57,53,0.06)',
          border: `1px solid ${isDark ? 'rgba(255,122,122,0.15)' : 'rgba(229,57,53,0.12)'}`,
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
        <Typography
          sx={{
            fontFamily: F,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          Mis à jour quotidiennement
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: F_DISPLAY,
          fontWeight: 400,
          fontSize: { xs: 44, md: 76 },
          color: ink,
          letterSpacing: -2.5,
          lineHeight: 1,
          maxWidth: 720,
        }}
      >
        Découvrez les jeux qui{' '}
        <Box
          component="span"
          className="lux-shimmer-text"
          sx={{ fontStyle: 'italic', color: accent }}
        >
          comptent
        </Box>{' '}
        vraiment.
      </Typography>
      <Typography
        sx={{
          fontFamily: F,
          fontSize: { xs: 14, md: 16 },
          color: inkSoft,
          mt: 2,
          maxWidth: 540,
          lineHeight: 1.6,
          opacity: 0.85,
        }}
      >
        Des sorties fraîches aux légendes intemporelles — une sélection vivante,
        pensée pour les vrais joueurs.
      </Typography>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export const HomePage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const { sections } = useHomeTrending({ selectedGenre: null });

  const handleGenreClick = (id: number, name: string) => {
    navigate(`/trending/genre/${id}`, { state: { genreName: name } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ink = isDark ? C.darkInk : C.ink;
  const accent = isDark ? C.darkAccentBright : C.accentSoft;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: F,
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? `
            radial-gradient(ellipse 90% 60% at 20% 0%, rgba(255,82,82,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 80% 30%, rgba(255,138,138,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 100% 70% at 50% 100%, rgba(255,82,82,0.05) 0%, transparent 50%),
            linear-gradient(180deg, ${C.darkBgBase} 0%, ${C.darkBgSoft} 50%, ${C.darkBgWarm} 100%)
          `
          : `
            radial-gradient(ellipse 90% 60% at 20% 0%, rgba(255,210,210,0.7) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 80% 30%, rgba(255,138,138,0.18) 0%, transparent 50%),
            radial-gradient(ellipse 100% 70% at 50% 100%, rgba(229,57,53,0.06) 0%, transparent 50%),
            linear-gradient(180deg, ${C.bgBase} 0%, ${C.bgSoft} 55%, ${C.bgWarm} 100%)
          `,
      }}
    >
      {/* grain global */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: isDark ? 0.04 : 0.025,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: { md: '100%', lg: '70%' },
          mx: 'auto',
          px: { xs: 2.5, md: 5, lg: 7 },
          pt: { xs: 4, md: 7 },
          pb: { xs: 4, md: 6 },
        }}
      >
        <Box className="lux-s1">
          <Hero />
        </Box>

        <Box className="lux-s1">
          <Section
            blobPosition="right"
            coverUrl={sections.recent.games[0]?.cover_url ?? undefined}
          >
            <SectionHeader
              index="01"
              kicker={t('homePage.recentLabel')}
              title={t('homePage.recentTitle')}
              subtitle="Les dernières sorties qui font vibrer la communauté."
              to="/trending/recent"
              variant="a"
            />
            <TrendingGames
              games={sections.recent.games}
              loading={sections.recent.loading}
            />
          </Section>
        </Box>

        <Box className="lux-s2">
          <Section
            blobPosition="left"
            blobIntensity={1.2}
            coverUrl={sections.rating.games[0]?.cover_url ?? undefined}
          >
            <SectionHeader
              index="02"
              kicker={t('homePage.ratingLabel')}
              title={t('homePage.ratingTitle')}
              subtitle="Les chefs-d'œuvre confirmés et nouveaux classiques."
              to="/trending/rating"
              variant="b"
            />
            <TrendingGames
              games={sections.rating.games}
              loading={sections.rating.loading}
            />
          </Section>
        </Box>

        <Box className="lux-s3">
          <Section
            blobPosition="center"
            coverUrl={sections.popularity.games[0]?.cover_url ?? undefined}
          >
            <SectionHeader
              index="03"
              kicker={t('homePage.popularityLabel')}
              title={t('homePage.popularityTitle')}
              subtitle="Ce qui enflamme la communauté en ce moment."
              to="/trending/popularity"
              variant="c"
            />
            <TrendingGames
              games={sections.popularity.games}
              loading={sections.popularity.loading}
            />
          </Section>
        </Box>

        <Box className="lux-s4" sx={{ mt: { xs: 5, md: 7 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 3,
              mb: 3,
              flexWrap: 'wrap',
              px: { xs: 1, md: 2 },
            }}
          >
            <Typography
              sx={{
                fontFamily: F_DISPLAY,
                fontWeight: 400,
                fontSize: { xs: 32, md: 44 },
                color: ink,
                letterSpacing: -1.2,
                lineHeight: 1,
              }}
            >
              Explorer par{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: accent }}>
                genre
              </Box>
            </Typography>
            <Box
              sx={{
                flex: 1,
                minWidth: 60,
                height: '1px',
                background: `linear-gradient(to right, ${isDark ? 'rgba(255,122,122,0.3)' : 'rgba(229,57,53,0.25)'}, transparent)`,
                alignSelf: 'center',
              }}
            />
          </Box>
          <Section blobPosition="right" blobIntensity={0.6}>
            <GenreGrid onGenreClick={handleGenreClick} />
          </Section>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
