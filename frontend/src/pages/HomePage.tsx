import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GenreGrid from '../components/GenreGrid';
import RecommendedGamesSection from '../components/RecommendedGamesSection';
import TrendingGames from '../components/TrendingGames';
import { useHomeTrending } from '../hooks/useHomeTrending';
import { useAuth } from '../contexts/useAuth';
import { useOnboarding, TOUR_KEYS } from '../hooks/useOnboarding';
import { useTour } from '../onboarding/useTour';
import { HOME_TOUR_STEPS } from '../onboarding/tourSteps';
import { bleedUnderHeader } from '../layout/bleedUnderHeader';

const HOME_OPTIONAL_STEPS = new Set([0, 1, 2]);

/* ─── Keyframes ─── */
const styleEl = document.createElement('style');
styleEl.dataset.homeLux = '1';
styleEl.textContent = `
  @keyframes luxFadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lux-s1 { animation: luxFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
  .lux-s2 { animation: luxFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
  .lux-s3 { animation: luxFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
  .lux-s4 { animation: luxFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
`;
if (!document.head.querySelector('style[data-home-lux]')) {
  document.head.appendChild(styleEl);
}

const F = "'Outfit', sans-serif";

const C = {
  bgBase: '#fdf4f4',
  bgSoft: '#f9ecec',
  bgWarm: '#fef6f6',
  card: 'rgba(255,255,255,0.66)',
  cardHover: 'rgba(255,255,255,0.82)',
  border: 'rgba(198,40,40,0.10)',
  borderHover: 'rgba(198,40,40,0.22)',
  accent: '#b71c1c',
  accentSoft: '#c62828',
  ink: '#241818',
  light: '#b49393',
  darkBgBase: '#1a1010',
  darkBgSoft: '#221414',
  darkBgWarm: '#1e1212',
  darkCard: 'rgba(40,20,20,0.72)',
  darkCardHover: 'rgba(50,25,25,0.85)',
  darkBorder: 'rgba(239,83,80,0.12)',
  darkBorderHover: 'rgba(239,83,80,0.28)',
  darkAccentSoft: '#ef5350',
  darkInk: '#f5e6e6',
  darkLight: '#9e7070',
};

type SectionLabelProps = Readonly<{
  label: string;
  title: string;
  to?: string;
  linkState?: object;
}>;

/* ── Section header ── */
export function SectionLabel({
  label,
  title,
  to,
  linkState,
}: SectionLabelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const inkColor = isDark ? C.darkInk : C.ink;
  const accentColor = isDark ? C.darkAccentSoft : C.accentSoft;

  return (
    <Box sx={{ mb: 3, position: 'relative' }}>
      <Box sx={{ pl: '18px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 18,
              height: '1px',
              background: accentColor,
              opacity: 0.6,
            }}
          />
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: accentColor,
              opacity: 0.85,
              transition: 'color 0.3s ease',
            }}
          >
            {label}
          </Typography>
        </Box>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Typography
            {...(to ? { component: Link, to, state: linkState } : {})}
            sx={{
              fontFamily: F,
              fontWeight: 700,
              fontSize: { xs: 24, md: 32 },
              color: inkColor,
              letterSpacing: -0.3,
              lineHeight: 1.15,
              textDecoration: 'none',
              cursor: to ? 'pointer' : 'default',
              transition: 'color 0.25s ease, letter-spacing 0.25s ease',
              display: 'inline-block',
              '&:link': { color: inkColor },
              '&:visited': { color: inkColor },
              '&:active': { color: inkColor },
              '&:focus': { color: inkColor, outline: 'none' },
              ...(to && {
                '&:hover': { color: accentColor, letterSpacing: 0 },
              }),
            }}
          >
            {title}
          </Typography>
          {to && (
            <Box
              sx={{
                position: 'absolute',
                bottom: -3,
                left: 0,
                width: '0%',
                height: '1.5px',
                background: `linear-gradient(to right, ${accentColor}, transparent)`,
                transition:
                  'width 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease',
                opacity: 0,
                borderRadius: '1px',
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

type SectionProps = Readonly<{
  children: ReactNode;
  className?: string;
  coverUrl?: string;
}>;

function Section({ children, className, coverUrl }: SectionProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current!;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let coverOverlayOpacity = 0;
  if (visible) {
    coverOverlayOpacity = isDark ? 0.45 : 0.35;
  }

  return (
    <Box
      ref={sectionRef}
      className={className}
      sx={{
        position: 'relative',
        borderRadius: '24px',
        mb: 2.5,
        overflow: 'hidden',
        border: `1px solid ${isDark ? C.darkBorder : C.border}`,
        boxShadow: isDark
          ? '0 18px 40px rgba(0,0,0,0.28)'
          : '0 18px 40px rgba(198,40,40,0.06)',
        transition:
          'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
        '&:hover': {
          borderColor: isDark ? C.darkBorderHover : C.borderHover,
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? '0 24px 50px rgba(239,83,80,0.14)'
            : '0 24px 50px rgba(198,40,40,0.12)',
        },
      }}
    >
      {coverUrl && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(28px) saturate(1.6)',
            transform: 'scale(1.15)',
            opacity: coverOverlayOpacity,
            transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1)',
            zIndex: 0,
          }}
        />
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(135deg, rgba(198,40,40,0.35) 0%, rgba(120,20,20,0.75) 100%)'
            : 'linear-gradient(135deg, rgba(198,40,40,0.18) 0%, rgba(255,220,220,0.75) 100%)',
          backdropFilter: 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: 'blur(8px) saturate(140%)',
          zIndex: 1,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 24,
          right: 24,
          height: '1px',
          background: `linear-gradient(to right, ${isDark ? C.darkAccentSoft : C.accentSoft} 0%, transparent 55%)`,
          opacity: isDark ? 0.6 : 0.5,
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          p: { xs: '24px 20px', md: '30px 34px' },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export const HomePage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { shouldShow, markAsDone } = useOnboarding(TOUR_KEYS.home);
  const { startTour } = useTour({
    steps: HOME_TOUR_STEPS,
    optionalSteps: HOME_OPTIONAL_STEPS,
    onDone: markAsDone,
  });

  useEffect(() => {
    if (!isAuthenticated || !shouldShow) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, shouldShow, startTour]);

  const { sections } = useHomeTrending({ selectedGenre: null });

  const handleGenreClick = (id: number, name: string) => {
    navigate(`/trending/genre/${id}`, { state: { genreName: name } });
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: F,
        ...bleedUnderHeader(theme),
        background: isDark
          ? `
            url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
            radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 28%),
            radial-gradient(circle at 86% 16%, rgba(120,20,20,0.18) 0%, transparent 28%),
            radial-gradient(circle at 78% 84%, rgba(198,40,40,0.07) 0%, transparent 24%),
            linear-gradient(180deg, ${C.darkBgBase} 0%, ${C.darkBgSoft} 55%, ${C.darkBgWarm} 100%)
          `
          : `
            url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
            radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
            radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 24%),
            radial-gradient(circle at 86% 16%, rgba(255,210,210,0.80) 0%, transparent 26%),
            radial-gradient(circle at 78% 84%, rgba(198,40,40,0.08) 0%, transparent 24%),
            linear-gradient(180deg, ${C.bgBase} 0%, ${C.bgSoft} 55%, ${C.bgWarm} 100%)
          `,
      }}
    >
      <Box
        sx={{
          maxWidth: { md: '100%', lg: '85%' },
          mx: 'auto',
          px: { xs: 0, md: 0, lg: 0 },
          pt: { xs: 1, md: 1.5 },
          pb: { xs: 4, md: 5 },
        }}
      >
        {isAuthenticated && (
          <Box className="lux-s1">
            <RecommendedGamesSection />
          </Box>
        )}

        <Section
          className="lux-s2"
          coverUrl={sections.recent.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label={t('homePage.recentLabel')}
            title={t('homePage.recentTitle')}
            to="/trending/recent"
          />
          <TrendingGames
            games={sections.recent.games}
            loading={sections.recent.loading}
          />
        </Section>

        <Section
          className="lux-s3"
          coverUrl={sections.rating.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label={t('homePage.ratingLabel')}
            title={t('homePage.ratingTitle')}
            to="/trending/rating"
          />
          <TrendingGames
            games={sections.rating.games}
            loading={sections.rating.loading}
          />
        </Section>

        <Section
          className="lux-s4"
          coverUrl={sections.popularity.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label={t('homePage.popularityLabel')}
            title={t('homePage.popularityTitle')}
            to="/trending/popularity"
          />
          <TrendingGames
            games={sections.popularity.games}
            loading={sections.popularity.loading}
          />
        </Section>

        {/* SECTION EXPLORER PAR GENRE */}
        <Box data-tour="genres" className="lux-s4" sx={{ mt: 5 }}>
          {/* Header stylé */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: F,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: isDark ? C.darkAccentSoft : C.accentSoft,
                opacity: 0.85,
                mb: 1,
              }}
            >
              {t('homePage.allGenres')}
            </Typography>
            <Typography
              sx={{
                fontFamily: F,
                fontWeight: 800,
                fontSize: { xs: 28, md: 36 },
                color: isDark ? C.darkInk : C.ink,
                letterSpacing: -0.5,
                mb: 1,
                background: isDark
                  ? 'linear-gradient(135deg, #FF3D3D 0%, #FF8A80 100%)'
                  : 'linear-gradient(135deg, #FF3D3D 0%, #D32F2F 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('homePage.exploreByGenre')}
            </Typography>
            <Typography
              sx={{
                fontFamily: F,
                fontSize: 15,
                color: isDark ? C.darkLight : C.light,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Plongez dans l'univers qui vous correspond
            </Typography>
          </Box>

          {/* Grille des genres */}
          <Section>
            <GenreGrid onGenreClick={handleGenreClick} />
          </Section>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
