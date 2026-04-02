import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

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
styleEl.setAttribute('data-banner-lux', '1');
styleEl.textContent = `
  @keyframes bannerFadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerReveal {
    from { clip-path: inset(0 100% 0 0); opacity: 0; }
    to   { clip-path: inset(0 0 0 0); opacity: 1; }
  }
  @keyframes bannerFloat {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }

  .banner-k      { animation: bannerFadeUp .7s cubic-bezier(0.16,1,0.3,1) 0s both; }
  .banner-t1     { animation: bannerReveal .9s cubic-bezier(0.16,1,0.3,1) .12s both; }
  .banner-t2     { animation: bannerReveal .9s cubic-bezier(0.16,1,0.3,1) .28s both; }
  .banner-sub    { animation: bannerFadeUp .7s cubic-bezier(0.16,1,0.3,1) .42s both; }
  .banner-meta   { animation: bannerFadeUp .7s cubic-bezier(0.16,1,0.3,1) .56s both; }
  .banner-float  { animation: bannerFloat 5s ease-in-out infinite; }
`;
if (!document.head.querySelector('style[data-banner-lux]')) {
  document.head.appendChild(styleEl);
}

const FD = "'Cormorant Garamond', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

const C = {
  bg: '#ffd3d3',
  accent: '#c62828',
  accentSoft: '#d32f2f',
  ink: '#1a0a0a',
  muted: '#8a5a5a',
  light: '#c09090',
  border: 'rgba(211,47,47,0.12)',
};

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 240, md: 320 },
        display: 'flex',
        alignItems: 'center',
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.024'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 120% 90% at 0% 0%, rgba(255,255,255,0.34) 0%, transparent 52%),
          radial-gradient(ellipse 60% 90% at 100% 50%, rgba(198,40,40,0.08) 0%, transparent 58%),
          radial-gradient(ellipse 50% 50% at 60% 100%, rgba(255,220,220,0.28) 0%, transparent 70%),
          #ffdede
        `,
        px: { xs: 3, sm: 5, md: 7 },
        py: { xs: 4, md: 5 },
      }}
    >
      {/* ghost text */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: '-2%', md: '2%' },
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: FD,
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: { xs: '20vw', md: '12vw' },
          lineHeight: 0.9,
          letterSpacing: -3,
          color: 'rgba(198,40,40,0.05)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        Ludokan
      </Typography>

      {/* left accent rule */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 16, md: 24 },
          top: '16%',
          bottom: '16%',
          width: '1px',
          background:
            'linear-gradient(to bottom, transparent, rgba(211,47,47,0.34) 25%, rgba(211,47,47,0.34) 75%, transparent)',
        }}
      />

      {/* top right orb */}
      <Box
        className="banner-float"
        sx={{
          position: 'absolute',
          right: { xs: 22, md: 40 },
          top: { xs: 22, md: 28 },
          width: { xs: 42, md: 54 },
          height: { xs: 42, md: 54 },
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), rgba(211,47,47,0.16) 45%, rgba(211,47,47,0.04) 72%, transparent 100%)',
          filter: 'blur(1px)',
          opacity: 0.85,
        }}
      />

      {/* content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: { xs: '100%', md: '62%' },
        }}
      >
        <Box
          className="banner-k"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.4,
            mb: { xs: 2, md: 2.5 },
          }}
        >
          <Box
            sx={{
              width: 18,
              height: 1,
              bgcolor: C.accentSoft,
              opacity: 0.45,
            }}
          />
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: C.accentSoft,
            }}
          >
            Univers gaming
          </Typography>
        </Box>

        <Box sx={{ overflow: 'hidden', mb: { xs: 2, md: 2.5 } }}>
          <Typography
            className="banner-t1"
            sx={{
              fontFamily: FD,
              fontWeight: 600,
              fontSize: { xs: 36, sm: 46, md: 64, lg: 74 },
              lineHeight: 0.92,
              letterSpacing: { xs: -1, md: -1.5 },
              color: C.ink,
              display: 'block',
            }}
          >
            Votre collection,
          </Typography>
          <Typography
            className="banner-t2"
            sx={{
              fontFamily: FD,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: { xs: 36, sm: 46, md: 64, lg: 74 },
              lineHeight: 0.92,
              letterSpacing: { xs: -1, md: -1.5 },
              color: C.accent,
              display: 'block',
            }}
          >
            pensée avec élégance.
          </Typography>
        </Box>

        <Box
          sx={{
            width: { xs: 120, md: 180 },
            height: '1px',
            background: `linear-gradient(to right, ${C.accentSoft}, transparent)`,
            opacity: 0.35,
            mb: { xs: 2, md: 2.5 },
          }}
        />

        <Typography
          className="banner-sub"
          sx={{
            fontFamily: FD,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: { xs: 15, md: 18 },
            color: C.muted,
            lineHeight: 1.7,
            maxWidth: 460,
          }}
        >
          Découvrez les tendances, explorez les genres et organisez votre
          bibliothèque de jeux dans une interface claire, raffinée et inspirée
          de l’univers du gaming.
        </Typography>

        <Box
          className="banner-meta"
          sx={{
            display: 'flex',
            gap: { xs: 2.5, md: 4 },
            mt: { xs: 2.5, md: 3 },
            flexWrap: 'wrap',
          }}
        >
          {[
            { value: 'Tendances', label: 'À découvrir' },
            { value: 'Genres', label: 'À explorer' },
            { value: 'Collection', label: 'À organiser' },
          ].map(item => (
            <Box key={item.value}>
              <Typography
                sx={{
                  fontFamily: FD,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: { xs: 20, md: 24 },
                  color: C.accent,
                  lineHeight: 1,
                  mb: 0.4,
                }}
              >
                {item.value}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FB,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  color: C.light,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Banner;
