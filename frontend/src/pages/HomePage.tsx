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
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap';
if (!document.head.querySelector('link[href*="Playfair"]')) {
  document.head.appendChild(fontLink);
}

/* ─── Keyframes ─── */
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .home-section-0 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
  .home-section-1 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
  .home-section-2 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
  .home-section-3 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
  .home-banner    { animation: fadeIn 0.8s ease 0s both; }
  .home-divider   { animation: slideRight 0.5s cubic-bezier(0.22,1,0.36,1) both; }
`;
if (!document.head.querySelector('style[data-home]')) {
  styleEl.setAttribute('data-home', '1');
  document.head.appendChild(styleEl);
}

const C = {
  pageBg: '#ffd3d3',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentGlow: 'rgba(211,47,47,0.12)',
  title: '#0f0f0f',
  muted: '#6e6e73',
  glass: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.85)',
  cardBg: 'rgba(255,255,255,0.68)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

/* ── Section header with editorial style ── */
function SectionHeader({
  label,
  title,
  italic = false,
}: {
  label: string;
  title: string;
  italic?: boolean;
}) {
  return (
    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Accent bar */}
      <Box
        sx={{
          width: 4,
          height: 36,
          borderRadius: 999,
          background: `linear-gradient(180deg, ${C.accent}, #ff8a80)`,
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: C.accent,
            mb: 0.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: { xs: 20, md: 24 },
            color: C.title,
            letterSpacing: -0.5,
            fontStyle: italic ? 'italic' : 'normal',
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>
      </Box>
      {/* Decorative line */}
      <Box
        sx={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(to right, rgba(211,47,47,0.3), transparent)`,
          ml: 1,
        }}
      />
    </Box>
  );
}

/* ── Section wrapper card ── */
function SectionCard({
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
        background: C.cardBg,
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: '24px',
        boxShadow:
          '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        p: { xs: 2.5, md: 3.5 },
        mb: 3,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow:
            '0 8px 40px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
        },
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
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,220,220,0.3) 0%, transparent 70%),
          #ffd3d3
        `,
        px: { xs: 2, md: 5, lg: 8 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
        {/* ── Page title bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
            mb: 4,
          }}
          className="home-banner"
        >
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: { xs: 28, md: 36 },
              color: C.title,
              letterSpacing: -1,
              background: `linear-gradient(135deg, ${C.title} 40%, ${C.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ludokan
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: { xs: 14, md: 16 },
              color: C.muted,
              letterSpacing: 0,
            }}
          >
            — votre univers jeu vidéo
          </Typography>
        </Box>

        {/* ── Banner ── */}
        <Box
          className="home-banner"
          sx={{
            borderRadius: '28px',
            overflow: 'hidden',
            mb: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            border: `1px solid ${C.glassBorder}`,
          }}
        >
          <Banner />
        </Box>

        {/* ── Trending sections ── */}
        <SectionCard className="home-section-0">
          <SectionHeader label="Découverte" title="Jeux les plus récents" />
          <TrendingGames
            games={sections.recent.games}
            loading={sections.recent.loading}
            to="/trending/recent"
          />
        </SectionCard>

        <SectionCard className="home-section-1">
          <SectionHeader label="Top" title="Jeux les mieux notés" italic />
          <TrendingGames
            games={sections.rating.games}
            loading={sections.rating.loading}
            to="/trending/rating"
          />
        </SectionCard>

        <SectionCard className="home-section-2">
          <SectionHeader label="Tendances" title="Jeux les plus populaires" />
          <TrendingGames
            games={sections.popularity.games}
            loading={sections.popularity.loading}
            to="/trending/popularity"
          />
        </SectionCard>

        {/* ── Genre result ── */}
        {selectedGenre && (
          <Box ref={genreResultRef} className="home-section-3">
            <SectionCard>
              <SectionHeader
                label="Genre sélectionné"
                title={selectedGenre.name}
                italic
              />
              <TrendingGames
                games={genreSection?.games ?? []}
                loading={genreSection?.loading ?? true}
                to={`/trending/genre/${selectedGenre.id}`}
                linkState={{ genreName: selectedGenre.name }}
              />
            </SectionCard>
          </Box>
        )}

        {/* ── Genre grid ── */}
        <Box className="home-section-3">
          <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 4,
                height: 36,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${C.accent}, #ff8a80)`,
                flexShrink: 0,
              }}
            />
            <Box>
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  color: C.accent,
                  mb: 0.2,
                }}
              >
                Explorer
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 900,
                  fontSize: { xs: 20, md: 24 },
                  color: C.title,
                  letterSpacing: -0.5,
                  lineHeight: 1.1,
                }}
              >
                Parcourir par genre
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, rgba(211,47,47,0.3), transparent)`,
                ml: 1,
              }}
            />
          </Box>
          <GenreGrid onGenreClick={handleGenreClick} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
