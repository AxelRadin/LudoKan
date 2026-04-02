import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

/* ─── Google Fonts ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
if (!document.head.querySelector('link[href*="Playfair"]')) {
  document.head.appendChild(fontLink);
}

const styleEl = document.createElement('style');
styleEl.setAttribute('data-banner', '1');
styleEl.textContent = `
  @keyframes bannerFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerGlow {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }
  @keyframes floatDot {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  .banner-eyebrow { animation: bannerFadeUp 0.5s ease 0.1s both; }
  .banner-title   { animation: bannerFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
  .banner-sub     { animation: bannerFadeUp 0.5s ease 0.4s both; }
  .banner-deco    { animation: bannerFadeUp 0.8s ease 0.1s both; }
  .banner-line    { animation: bannerGlow 3s ease-in-out infinite; }
  .float-dot-1    { animation: floatDot 4s ease-in-out infinite; }
  .float-dot-2    { animation: floatDot 4s ease-in-out 1.3s infinite; }
  .float-dot-3    { animation: floatDot 4s ease-in-out 2.6s infinite; }
`;
if (!document.head.querySelector('style[data-banner]')) {
  document.head.appendChild(styleEl);
}

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 90% 130% at -10% 50%, rgba(255,150,150,0.5) 0%, transparent 55%),
          radial-gradient(ellipse 60% 80% at 110% 50%, rgba(211,47,47,0.05) 0%, transparent 55%),
          #ffd3d3
        `,
        py: { xs: 5, md: 8 },
        px: { xs: 3, md: 6 },
        minHeight: { xs: 200, md: 300 },
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Left neon bar */}
      <Box
        className="banner-line"
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background:
            'linear-gradient(180deg, transparent, #d32f2f 30%, #ff8a80 70%, transparent)',
        }}
      />

      {/* Subtle diagonal stripes */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          background:
            'repeating-linear-gradient(-55deg, #d32f2f, #d32f2f 1px, transparent 1px, transparent 28px)',
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: { xs: '100%', md: '58%' },
        }}
      >
        {/* Eyebrow pill */}
        <Box
          className="banner-eyebrow"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.6,
            mb: 2.5,
            background: 'rgba(211,47,47,0.08)',
            border: '1px solid rgba(211,47,47,0.2)',
            borderRadius: 999,
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: '#d32f2f',
              boxShadow: '0 0 6px rgba(211,47,47,0.8)',
            }}
          />
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: '#d32f2f',
            }}
          >
            Votre bibliothèque gaming
          </Typography>
        </Box>

        {/* Main title */}
        <Typography
          className="banner-title"
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: { xs: 36, sm: 50, md: 66 },
            lineHeight: 0.95,
            letterSpacing: -2,
            color: '#0f0f0f',
            mb: 3,
          }}
        >
          Maîtrisez
          <br />
          votre{' '}
          <Box
            component="span"
            sx={{
              color: '#d32f2f',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 4,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(to right, #d32f2f, #ff8a80)',
                borderRadius: 999,
                boxShadow: '0 0 8px rgba(211,47,47,0.4)',
              },
            }}
          >
            collection
          </Box>
        </Typography>

        {/* Subtitle */}
        <Typography
          className="banner-sub"
          sx={{
            fontFamily: FONT_BODY,
            fontWeight: 300,
            fontSize: { xs: 14, md: 16 },
            color: '#5a3a3a',
            lineHeight: 1.75,
            maxWidth: 400,
            letterSpacing: 0.1,
          }}
        >
          Suivez, organisez et découvrez vos jeux vidéo en un seul endroit —
          fini les doublons et les oublis.
        </Typography>
      </Box>

      {/* Decorative right — concentric rings + floating dots */}
      <Box
        className="banner-deco"
        sx={{
          position: 'absolute',
          right: { md: 80 },
          top: '50%',
          transform: 'translateY(-50%)',
          width: 240,
          height: 240,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            border: '1px solid rgba(211,47,47,0.12)',
            borderRadius: '50%',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: '18%',
            border: '1px solid rgba(211,47,47,0.1)',
            borderRadius: '50%',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: '34%',
            background:
              'radial-gradient(circle, rgba(211,47,47,0.1) 0%, transparent 70%)',
            border: '1px solid rgba(211,47,47,0.18)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: 38, lineHeight: 1 }}>🎮</Typography>
        </Box>

        <Box
          className="float-dot-1"
          sx={{
            position: 'absolute',
            top: '8%',
            right: '14%',
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: '#d32f2f',
            boxShadow: '0 0 12px rgba(211,47,47,0.6)',
          }}
        />
        <Box
          className="float-dot-2"
          sx={{
            position: 'absolute',
            bottom: '12%',
            left: '10%',
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: '#ff8a80',
            boxShadow: '0 0 8px rgba(255,138,128,0.5)',
          }}
        />
        <Box
          className="float-dot-3"
          sx={{
            position: 'absolute',
            top: '42%',
            right: '-4%',
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: '#d32f2f',
            opacity: 0.5,
          }}
        />
      </Box>
    </Box>
  );
};

export default Banner;
