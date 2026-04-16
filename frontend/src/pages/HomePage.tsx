import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';
import { useHomeTrending } from '../hooks/useHomeTrending';

/* ─── Fonts ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,300;1,600;1,700&family=DM+Sans:wght@300;400;500;600&display=swap';
if (!document.head.querySelector('link[href*="Cormorant"]')) {
  document.head.appendChild(fontLink);
}

/* ─── Keyframes ─── */
const styleEl = document.createElement('style');
styleEl.setAttribute('data-home-lux', '1');
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

const FD = "'Cormorant Garamond', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

const C = {
  bgBase: '#fdf4f4',
  bgSoft: '#f9ecec',
  bgWarm: '#fef6f6',
  card: 'rgba(255,255,255,0.66)',
  cardHover: 'rgba(255,255,255,0.82)',
  border: 'rgba(198,40,40,0.10)',
  borderHover: 'rgba(198,40,40,0.22)',
  accent: '#c62828',
  accentSoft: '#d43c3c',
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

/* ── Section header ── */
function SectionLabel({
  label,
  title,
  to,
  linkState,
}: {
  label: string;
  title: string;
  to?: string;
  linkState?: object;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const inkColor = isDark ? C.darkInk : C.ink;
  const accentColor = isDark ? C.darkAccentSoft : C.accentSoft;

  return (
    <Box sx={{ mb: 3, position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '70%',
          background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
          borderRadius: '2px',
          opacity: 0.7,
        }}
      />

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
              fontFamily: FB,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 4,
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
              fontFamily: FD,
              fontWeight: 700,
              fontSize: { xs: 24, md: 32 },
              color: inkColor,
              letterSpacing: -0.8,
              lineHeight: 1.1,
              textDecoration: 'none',
              cursor: to ? 'pointer' : 'default',
              transition: 'color 0.25s ease, letter-spacing 0.25s ease',
              display: 'inline-block',
              '&:link': { color: inkColor },
              '&:visited': { color: inkColor },
              '&:active': { color: inkColor },
              '&:focus': { color: inkColor, outline: 'none' },
              ...(to && {
                '&:hover': {
                  color: accentColor,
                  letterSpacing: -0.3,
                },
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

        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: '1px',
              background: `linear-gradient(to right, ${accentColor}, transparent)`,
              opacity: isDark ? 0.5 : 0.35,
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: accentColor,
              opacity: isDark ? 0.5 : 0.35,
            }}
          />
          <Box
            sx={{
              width: 20,
              height: '1px',
              background: `linear-gradient(to right, ${accentColor}, transparent)`,
              opacity: isDark ? 0.25 : 0.18,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/* ── Section avec fond jaquette ── */
function Section({
  children,
  className,
  coverUrl,
}: {
  children: React.ReactNode;
  className?: string;
  coverUrl?: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      {/* Fond jaquette floutée */}
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
            opacity: visible ? (isDark ? 0.45 : 0.35) : 0,
            transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1)',
            zIndex: 0,
          }}
        />
      )}

      {/* Overlay rouge */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? `linear-gradient(135deg, rgba(198,40,40,0.18) 0%, rgba(120,20,20,0.65) 100%)`
            : `linear-gradient(135deg, rgba(198,40,40,0.12) 0%, rgba(255,240,240,0.60) 100%)`,
          backdropFilter: 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: 'blur(8px) saturate(140%)',
          zIndex: 1,
        }}
      />

      {/* Ligne rouge haut */}
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

      {/* Contenu */}
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [selectedGenre, setSelectedGenre] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const genreResultRef = useRef<HTMLDivElement>(null);
  const { sections, genreSection } = useHomeTrending({ selectedGenre });

  const handleGenreClick = (id: number, name: string) => {
    setSelectedGenre({ id, name });
    setTimeout(() => {
      genreResultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FB,
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
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2.5, md: 5, lg: 7 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 4, md: 5 },
        }}
      >
        <Section
          className="lux-s1"
          coverUrl={sections.recent.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label="Découverte"
            title="Jeux les plus récents"
            to="/trending/recent"
          />
          <TrendingGames
            games={sections.recent.games}
            loading={sections.recent.loading}
          />
        </Section>

        <Section
          className="lux-s2"
          coverUrl={sections.rating.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label="Excellence"
            title="Jeux les mieux notés"
            to="/trending/rating"
          />
          <TrendingGames
            games={sections.rating.games}
            loading={sections.rating.loading}
          />
        </Section>

        <Section
          className="lux-s3"
          coverUrl={sections.popularity.games[0]?.cover_url ?? undefined}
        >
          <SectionLabel
            label="Tendances"
            title="Jeux les plus populaires"
            to="/trending/popularity"
          />
          <TrendingGames
            games={sections.popularity.games}
            loading={sections.popularity.loading}
          />
        </Section>

        {selectedGenre && (
          <Box ref={genreResultRef}>
            <Section
              className="lux-s3"
              coverUrl={genreSection?.games[0]?.cover_url ?? undefined}
            >
              <SectionLabel
                label="Genre sélectionné"
                title={selectedGenre.name}
                to={`/trending/genre/${selectedGenre.id}`}
                linkState={{ genreName: selectedGenre.name }}
              />
              <TrendingGames
                games={genreSection?.games ?? []}
                loading={genreSection?.loading ?? true}
              />
            </Section>
          </Box>
        )}

        <Box className="lux-s4">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              mb: 2.5,
              mt: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: FD,
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: { xs: 24, md: 30 },
                color: isDark ? C.darkInk : C.ink,
                letterSpacing: -0.5,
                flexShrink: 0,
                transition: 'color 0.3s ease',
              }}
            >
              Explorer par genre
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, ${isDark ? C.darkBorder : C.border}, transparent)`,
              }}
            />
            <Typography
              sx={{
                fontFamily: FB,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: isDark ? C.darkAccentSoft : C.accentSoft,
                flexShrink: 0,
                transition: 'color 0.3s ease',
              }}
            >
              Tous les genres
            </Typography>
          </Box>

          <Section>
            <GenreGrid onGenreClick={handleGenreClick} />
          </Section>
        </Box>

        <Box
          sx={{
            mt: { xs: 4, md: 6 },
            pt: 3,
            borderTop: `1px solid ${isDark ? C.darkBorder : C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: FD,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 13,
              color: isDark ? C.darkLight : C.light,
              letterSpacing: 0.5,
              transition: 'color 0.3s ease',
            }}
          >
            Ludokan — votre collection, maîtrisée.
          </Typography>
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: isDark ? C.darkLight : C.light,
              transition: 'color 0.3s ease',
            }}
          >
            © 2026
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
