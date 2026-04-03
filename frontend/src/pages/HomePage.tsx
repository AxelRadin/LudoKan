import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useRef, useState } from 'react';
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
  bgBase: '#fcf8f7',
  bgSoft: '#f7efee',
  bgWarm: '#fffbfa',
  card: 'rgba(255,255,255,0.66)',
  cardHover: 'rgba(255,255,255,0.82)',
  border: 'rgba(198,40,40,0.10)',
  borderHover: 'rgba(198,40,40,0.22)',
  accent: '#c62828',
  accentSoft: '#d43c3c',
  ink: '#241818',
  light: '#b49393',
};

/* ── Section header ── */
function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      <Box sx={{ flex: 1, pb: '4px' }}>
        <Typography
          sx={{
            fontFamily: FB,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: C.accentSoft,
            mb: 0.6,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FD,
            fontWeight: 600,
            fontSize: { xs: 22, md: 28 },
            color: C.ink,
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          width: { xs: 32, md: 64 },
          height: '1px',
          background: `linear-gradient(to right, ${C.accentSoft}, transparent)`,
          opacity: 0.28,
          flexShrink: 0,
          mb: '12px',
        }}
      />
    </Box>
  );
}

/* ── Section wrapper ── */
function Section({
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
        background: C.card,
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        border: `1px solid ${C.border}`,
        borderRadius: '24px',
        p: { xs: '24px 20px', md: '30px 34px' },
        mb: 2.5,
        position: 'relative',
        transition:
          'background 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: '0 18px 40px rgba(36, 24, 24, 0.04)',
        '&:hover': {
          background: C.cardHover,
          borderColor: C.borderHover,
          transform: 'translateY(-2px)',
          boxShadow: '0 24px 50px rgba(198,40,40,0.08)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 24,
          right: 24,
          height: '1px',
          background: `linear-gradient(to right, ${C.accentSoft} 0%, transparent 55%)`,
          opacity: 0.4,
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
        fontFamily: FB,
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
          radial-gradient(circle at 14% 18%, rgba(198,40,40,0.07) 0%, transparent 24%),
          radial-gradient(circle at 86% 16%, rgba(255,225,225,0.72) 0%, transparent 26%),
          radial-gradient(circle at 78% 84%, rgba(198,40,40,0.05) 0%, transparent 24%),
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
        <Section className="lux-s1">
          <SectionLabel label="Découverte" title="Jeux les plus récents" />
          <TrendingGames
            games={sections.recent.games}
            loading={sections.recent.loading}
            to="/trending/recent"
          />
        </Section>

        <Section className="lux-s2">
          <SectionLabel label="Excellence" title="Jeux les mieux notés" />
          <TrendingGames
            games={sections.rating.games}
            loading={sections.rating.loading}
            to="/trending/rating"
          />
        </Section>

        <Section className="lux-s3">
          <SectionLabel label="Tendances" title="Jeux les plus populaires" />
          <TrendingGames
            games={sections.popularity.games}
            loading={sections.popularity.loading}
            to="/trending/popularity"
          />
        </Section>

        {selectedGenre && (
          <Box ref={genreResultRef}>
            <Section className="lux-s3">
              <SectionLabel
                label="Genre sélectionné"
                title={selectedGenre.name}
              />
              <TrendingGames
                games={genreSection?.games ?? []}
                loading={genreSection?.loading ?? true}
                to={`/trending/genre/${selectedGenre.id}`}
                linkState={{ genreName: selectedGenre.name }}
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
                color: C.ink,
                letterSpacing: -0.5,
                flexShrink: 0,
              }}
            >
              Explorer par genre
            </Typography>

            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, ${C.border}, transparent)`,
              }}
            />

            <Typography
              sx={{
                fontFamily: FB,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: C.accentSoft,
                flexShrink: 0,
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
            borderTop: `1px solid ${C.border}`,
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
              color: C.light,
              letterSpacing: 0.5,
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
              color: C.light,
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
