import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useRef, useState } from 'react';
import Banner from '../components/Banner';
import GenreGrid from '../components/GenreGrid';
import TrendingGames from '../components/TrendingGames';
import { useHomeTrending } from '../hooks/useHomeTrending';

/* ─── Google Fonts ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap';
if (!document.head.querySelector('link[href*="Bebas"]')) {
  document.head.appendChild(fontLink);
}

/* ─── Keyframes ─── */
const styleEl = document.createElement('style');
styleEl.setAttribute('data-home-noir', '1');
styleEl.textContent = `
  @keyframes fadeUpNoir {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(211,47,47,0.4), 0 0 24px rgba(211,47,47,0.15); }
    50%       { box-shadow: 0 0 16px rgba(211,47,47,0.7), 0 0 40px rgba(211,47,47,0.25); }
  }
  @keyframes flicker {
    0%, 95%, 100% { opacity: 1; }
    96%            { opacity: 0.82; }
    97%            { opacity: 1; }
    98%            { opacity: 0.88; }
  }
  .noir-0 { animation: fadeUpNoir 0.5s ease 0.05s both; }
  .noir-1 { animation: fadeUpNoir 0.5s ease 0.15s both; }
  .noir-2 { animation: fadeUpNoir 0.5s ease 0.25s both; }
  .noir-3 { animation: fadeUpNoir 0.5s ease 0.35s both; }
  .noir-4 { animation: fadeUpNoir 0.5s ease 0.45s both; }
  .flicker { animation: flicker 8s linear infinite; }
  .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
`;
if (!document.head.querySelector('style[data-home-noir]')) {
  document.head.appendChild(styleEl);
}

const FONT_DISPLAY = "'Bebas Neue', Impact, sans-serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

const C = {
  bg: '#ffd3d3',
  bgCard: 'rgba(255,255,255,0.6)',
  bgCardHover: 'rgba(255,255,255,0.78)',
  border: 'rgba(241,199,199,0.6)',
  borderRed: 'rgba(211,47,47,0.35)',
  accent: '#d32f2f',
  accentGlow: 'rgba(211,47,47,0.45)',
  text: '#0f0f0f',
  muted: '#7a4040',
};

function NeonHeader({ label, title }: { label: string; title: string }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: C.accent,
            flexShrink: 0,
            boxShadow: `0 0 8px ${C.accentGlow}, 0 0 16px ${C.accentGlow}`,
          }}
        />
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: C.accent,
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(to right, ${C.accent}, transparent)`,
            boxShadow: `0 0 6px ${C.accentGlow}`,
          }}
        />
      </Box>
      <Typography
        className="flicker"
        sx={{
          fontFamily: FONT_DISPLAY,
          fontSize: { xs: 28, md: 36 },
          color: C.text,
          letterSpacing: 2,
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function NeonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Box
      className={className}
      sx={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        p: { xs: 2, md: 3 },
        mb: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease, background 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(to right, ${C.accent}, transparent 60%)`,
          boxShadow: `0 0 8px ${C.accentGlow}`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.012) 3px, rgba(0,0,0,0.012) 4px)',
          pointerEvents: 'none',
        },
        '&:hover': { borderColor: C.borderRed, background: C.bgCardHover },
      }}
    >
      {children}
    </Box>
  );
}

export const HomePage = () => {
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
        fontFamily: FONT_BODY,
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 130% 70% at 10% -5%, rgba(255,190,190,0.65) 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 95% 100%, rgba(211,47,47,0.08) 0%, transparent 50%),
          #ffd3d3
        `,
        position: 'relative',
      }}
    >
      {/* Scanlines overlay */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.012) 2px, rgba(0,0,0,0.012) 4px)',
        }}
      />

      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 5, lg: 8 },
          py: { xs: 3, md: 4 },
        }}
      >
        {/* ── Top bar ── */}
        <Box
          className="noir-0"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
            pb: 2,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              className="flicker"
              sx={{
                fontFamily: FONT_DISPLAY,
                fontSize: { xs: 32, md: 44 },
                color: C.accent,
                letterSpacing: 5,
                lineHeight: 1,
                textShadow: `0 0 20px ${C.accentGlow}, 0 0 60px rgba(211,47,47,0.15)`,
              }}
            >
              LUDOKAN
            </Typography>
            <Box
              className="glow-pulse"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: C.accent,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {['Récents', 'Top', 'Genres'].map(nav => (
              <Typography
                key={nav}
                sx={{
                  fontFamily: FONT_BODY,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: C.muted,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  display: { xs: 'none', md: 'block' },
                  '&:hover': { color: C.accent },
                }}
              >
                {nav}
              </Typography>
            ))}
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                border: `1px solid ${C.borderRed}`,
                borderRadius: '2px',
                boxShadow: `0 0 10px ${C.accentGlow}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.accent,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                ● Live
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Banner ── */}
        <Box
          className="noir-0 glow-pulse"
          sx={{
            mb: 3,
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${C.borderRed}`,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)',
              pointerEvents: 'none',
            },
          }}
        >
          <Banner />
        </Box>

        {/* ── Trending sections ── */}
        <NeonCard className="noir-1">
          <NeonHeader label="Découverte" title="Jeux les plus récents" />
          <TrendingGames
            games={sections.recent.games}
            loading={sections.recent.loading}
            to="/trending/recent"
          />
        </NeonCard>

        <NeonCard className="noir-2">
          <NeonHeader label="Top classement" title="Jeux les mieux notés" />
          <TrendingGames
            games={sections.rating.games}
            loading={sections.rating.loading}
            to="/trending/rating"
          />
        </NeonCard>

        <NeonCard className="noir-3">
          <NeonHeader label="Tendances" title="Jeux les plus populaires" />
          <TrendingGames
            games={sections.popularity.games}
            loading={sections.popularity.loading}
            to="/trending/popularity"
          />
        </NeonCard>

        {/* ── Genre result ── */}
        {selectedGenre && (
          <Box ref={genreResultRef}>
            <NeonCard>
              <NeonHeader
                label="Genre sélectionné"
                title={selectedGenre.name}
              />
              <TrendingGames
                games={genreSection?.games ?? []}
                loading={genreSection?.loading ?? true}
                to={`/trending/genre/${selectedGenre.id}`}
                linkState={{ genreName: selectedGenre.name }}
              />
            </NeonCard>
          </Box>
        )}

        {/* ── Genre grid ── */}
        <Box className="noir-4">
          <NeonHeader label="Explorer" title="Parcourir par genre" />
          <Box
            sx={{
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              p: { xs: 2, md: 3 },
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: `linear-gradient(to right, ${C.accent}, transparent 60%)`,
                boxShadow: `0 0 8px ${C.accentGlow}`,
              },
            }}
          >
            <GenreGrid onGenreClick={handleGenreClick} />
          </Box>
        </Box>

        {/* ── Footer ── */}
        <Box
          sx={{
            mt: 4,
            pt: 2,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontSize: 14,
              color: C.muted,
              letterSpacing: 3,
            }}
          >
            LUDOKAN © 2026
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: C.accent,
                boxShadow: `0 0 6px ${C.accentGlow}`,
              }}
            />
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: 10,
                color: C.muted,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Système opérationnel
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
