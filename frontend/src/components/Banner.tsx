import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=DM+Sans:wght@300;400;500&display=swap';
if (!document.head.querySelector('link[href*="Cormorant"]')) {
  document.head.appendChild(fontLink);
}

const styleEl = document.createElement('style');
styleEl.setAttribute('data-banner-b', '1');
styleEl.textContent = `
  @keyframes bFadeLeft {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes bFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bLineGrow {
    from { transform: scaleY(0); transform-origin: top; }
    to   { transform: scaleY(1); transform-origin: top; }
  }
  .bb-left-content { animation: bFadeLeft 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
  .bb-title-anim   { animation: bFadeUp  0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
  .bb-divider-anim { animation: bLineGrow 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
`;
if (!document.head.querySelector('style[data-banner-b]')) {
  document.head.appendChild(styleEl);
}

const FD = "'Cormorant Garamond', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: { xs: 160, md: 200 },
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 80% 120% at -5% 50%, rgba(255,170,170,0.4) 0%, transparent 55%),
          #ffd3d3
        `,
        overflow: 'hidden',
      }}
    >
      {/* ── Left column ── */}
      <Box
        sx={{
          width: { xs: 140, md: 220 },
          flexShrink: 0,
          borderRight: '1px solid rgba(198,40,40,0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 2.5, md: 4 },
          py: { xs: 3, md: 4 },
          gap: 1.5,
        }}
      >
        <Box className="bb-left-content">
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'rgba(198,40,40,0.55)',
              mb: 1.5,
            }}
          >
            Ludokan
          </Typography>
          <Typography
            sx={{
              fontFamily: FD,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: { xs: 13, md: 15 },
              color: '#6b3a3a',
              lineHeight: 1.6,
            }}
          >
            Suivez et organisez vos jeux en un seul endroit.
          </Typography>
        </Box>
      </Box>

      {/* ── Animated vertical divider ── */}
      <Box
        className="bb-divider-anim"
        sx={{
          width: '1px',
          background: 'rgba(198,40,40,0.15)',
          flexShrink: 0,
        }}
      />

      {/* ── Right column ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 3, md: 6 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Typography
          className="bb-title-anim"
          sx={{
            fontFamily: FD,
            fontWeight: 600,
            fontStyle: 'italic',
            fontSize: { xs: 36, sm: 48, md: 64 },
            color: '#1a0a0a',
            letterSpacing: -2,
            lineHeight: 0.92,
          }}
        >
          Votre
          <br />
          collection,
          <br />
          <Box component="span" sx={{ color: '#c62828', fontWeight: 300 }}>
            enfin.
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default Banner;
