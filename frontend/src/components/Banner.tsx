import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,300;1,600;1,700&family=DM+Sans:wght@300;400;500;600&display=swap';
if (!document.head.querySelector('link[href*="Cormorant"]')) {
  document.head.appendChild(fontLink);
}

const styleEl = document.createElement('style');
styleEl.setAttribute('data-banner-lux', '1');
styleEl.textContent = `
  @keyframes bLuxFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bLuxLineGrow {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes bLuxFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .blux-tag   { animation: bLuxFadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
  .blux-title { animation: bLuxFadeUp  0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
  .blux-line  { animation: bLuxLineGrow 1s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
  .blux-sub   { animation: bLuxFadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
  .blux-deco  { animation: bLuxFadeIn  1.2s ease 0.2s both; }
`;
if (!document.head.querySelector('style[data-banner-lux]')) {
  document.head.appendChild(styleEl);
}

const FD = "'Cormorant Garamond', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 110% 120% at -5% 50%, rgba(255,170,170,0.45) 0%, transparent 55%),
          radial-gradient(ellipse 60% 80% at 108% 50%, rgba(198,40,40,0.05) 0%, transparent 50%),
          #ffd3d3
        `,
        minHeight: { xs: 220, md: 320 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        alignItems: 'center',
        px: { xs: 3, md: 7 },
        py: { xs: 5, md: 7 },
        gap: { xs: 4, md: 0 },
      }}
    >
      {/* ── Left: text ── */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Tag */}
        <Box
          className="blux-tag"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 20,
              height: '1px',
              bgcolor: '#c62828',
              opacity: 0.6,
            }}
          />
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#c62828',
              opacity: 0.8,
            }}
          >
            Bibliothèque gaming
          </Typography>
        </Box>

        {/* Main title */}
        <Typography
          className="blux-title"
          sx={{
            fontFamily: FD,
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: { xs: 44, sm: 56, md: 72 },
            lineHeight: 0.9,
            letterSpacing: -2,
            color: '#1a0a0a',
            mb: 3.5,
          }}
        >
          Votre collection,{' '}
          <Box component="span" sx={{ color: '#c62828', fontWeight: 300 }}>
            enfin
          </Box>
          <br />
          maîtrisée.
        </Typography>

        {/* Animated line */}
        <Box
          className="blux-line"
          sx={{
            width: 80,
            height: '1px',
            background:
              'linear-gradient(to right, #c62828, rgba(198,40,40,0.2))',
            mb: 3,
          }}
        />

        {/* Subtitle */}
        <Typography
          className="blux-sub"
          sx={{
            fontFamily: FD,
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: { xs: 16, md: 19 },
            color: '#6b3a3a',
            lineHeight: 1.65,
            maxWidth: 360,
            letterSpacing: 0.2,
          }}
        >
          Suivez, organisez et découvrez vos jeux vidéo en un seul endroit.
        </Typography>
      </Box>

      {/* ── Right: editorial graphic ── */}
      <Box
        className="blux-deco"
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          height: 260,
        }}
      >
        {/* Large ghost letter */}
        <Typography
          sx={{
            fontFamily: FD,
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 260,
            lineHeight: 1,
            color: 'rgba(198,40,40,0.06)',
            userSelect: 'none',
            position: 'absolute',
            letterSpacing: -8,
          }}
        >
          L
        </Typography>

        {/* Floating card 1 */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '8%',
            width: 90,
            height: 120,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(198,40,40,0.12)',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 1.5,
            boxShadow: '0 8px 32px rgba(198,40,40,0.08)',
            transform: 'rotate(-4deg)',
          }}
        >
          <Box
            sx={{
              height: 60,
              background: 'rgba(198,40,40,0.08)',
              borderRadius: '1px',
              mb: 1,
            }}
          />
          <Box
            sx={{
              height: 6,
              width: '80%',
              background: 'rgba(26,10,10,0.15)',
              borderRadius: 1,
              mb: 0.5,
            }}
          />
          <Box
            sx={{
              height: 4,
              width: '55%',
              background: 'rgba(198,40,40,0.2)',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Floating card 2 */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '38%',
            width: 100,
            height: 130,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(198,40,40,0.15)',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 1.5,
            boxShadow: '0 16px 48px rgba(198,40,40,0.1)',
            transform: 'rotate(2deg)',
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              height: 72,
              background: 'rgba(198,40,40,0.1)',
              borderRadius: '1px',
              mb: 1,
            }}
          />
          <Box
            sx={{
              height: 6,
              width: '75%',
              background: 'rgba(26,10,10,0.18)',
              borderRadius: 1,
              mb: 0.5,
            }}
          />
          <Box
            sx={{
              height: 4,
              width: '50%',
              background: 'rgba(198,40,40,0.25)',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Floating card 3 */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            right: '4%',
            width: 84,
            height: 112,
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(198,40,40,0.1)',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 1.5,
            boxShadow: '0 8px 28px rgba(198,40,40,0.07)',
            transform: 'rotate(5deg)',
          }}
        >
          <Box
            sx={{
              height: 56,
              background: 'rgba(198,40,40,0.07)',
              borderRadius: '1px',
              mb: 1,
            }}
          />
          <Box
            sx={{
              height: 5,
              width: '70%',
              background: 'rgba(26,10,10,0.12)',
              borderRadius: 1,
              mb: 0.5,
            }}
          />
          <Box
            sx={{
              height: 4,
              width: '45%',
              background: 'rgba(198,40,40,0.18)',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Small accent dot */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '18%',
            left: '20%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#c62828',
            opacity: 0.4,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '30%',
            right: '15%',
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: '#c62828',
            opacity: 0.25,
          }}
        />
      </Box>
    </Box>
  );
};

export default Banner;
