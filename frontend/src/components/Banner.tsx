import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,300;1,700&family=DM+Sans:wght@300;400;500&display=swap';
if (!document.head.querySelector('link[href*="Cormorant"]')) {
  document.head.appendChild(fontLink);
}

const styleEl = document.createElement('style');
styleEl.setAttribute('data-banner-wow', '1');
styleEl.textContent = `
  @keyframes wowReveal {
    from { clip-path: inset(0 100% 0 0); opacity: 0; }
    to   { clip-path: inset(0 0% 0 0);   opacity: 1; }
  }
  @keyframes wowFadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes wowFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes wowLineX {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes wowFloat {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
  .wow-overline { animation: wowFadeUp   0.6s cubic-bezier(0.16,1,0.3,1) 0.0s  both; }
  .wow-t1       { animation: wowReveal   0.9s cubic-bezier(0.16,1,0.3,1) 0.1s  both; }
  .wow-t2       { animation: wowReveal   0.9s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
  .wow-t3       { animation: wowReveal   0.9s cubic-bezier(0.16,1,0.3,1) 0.46s both; }
  .wow-line     { animation: wowLineX    0.8s cubic-bezier(0.16,1,0.3,1) 0.7s  both; }
  .wow-sub      { animation: wowFadeUp   0.6s cubic-bezier(0.16,1,0.3,1) 0.8s  both; }
  .wow-stat     { animation: wowFadeIn   0.6s ease                        1.0s  both; }
  .wow-float    { animation: wowFloat    5s ease-in-out infinite; }
`;
if (!document.head.querySelector('style[data-banner-wow]')) {
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
        minHeight: { xs: 260, md: 380 },
        display: 'flex',
        alignItems: 'center',
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 100% 140% at -10% 60%, rgba(255,160,160,0.55) 0%, transparent 50%),
          radial-gradient(ellipse 70%  100% at 110% 40%, rgba(198,40,40,0.06)   0%, transparent 50%),
          radial-gradient(ellipse 50%  60%  at 50%  100%, rgba(255,200,200,0.3) 0%, transparent 60%),
          #ffd3d3
        `,
        px: { xs: 3, sm: 5, md: 8, lg: 10 },
        py: { xs: 5, md: 7 },
      }}
    >
      {/* ── Giant ghost text background ── */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: '-5%', md: '2%' },
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: FD,
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: { xs: '28vw', md: '22vw' },
          lineHeight: 0.85,
          color: 'rgba(198,40,40,0.055)',
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: -8,
          whiteSpace: 'nowrap',
        }}
      >
        GG
      </Typography>

      {/* ── Vertical rule left ── */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 16, md: 32 },
          top: '15%',
          bottom: '15%',
          width: '1px',
          background:
            'linear-gradient(to bottom, transparent, rgba(198,40,40,0.35) 30%, rgba(198,40,40,0.35) 70%, transparent)',
        }}
      />

      {/* ── Main content ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: { xs: '100%', md: '65%' },
        }}
      >
        {/* Overline */}
        <Box
          className="wow-overline"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: { xs: 2.5, md: 3.5 },
          }}
        >
          <Box sx={{ width: 24, height: 1, bgcolor: 'rgba(198,40,40,0.5)' }} />
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 3.5,
              textTransform: 'uppercase',
              color: 'rgba(198,40,40,0.65)',
            }}
          >
            Bibliothèque gaming
          </Typography>
        </Box>

        {/* Title — 3 lines revealed one by one */}
        <Box sx={{ mb: { xs: 3, md: 4 }, overflow: 'hidden' }}>
          <Typography
            className="wow-t1"
            sx={{
              fontFamily: FD,
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: { xs: 48, sm: 64, md: 88, lg: 104 },
              lineHeight: 0.88,
              letterSpacing: { xs: -2, md: -4 },
              color: '#1a0a0a',
              display: 'block',
            }}
          >
            Votre
          </Typography>
          <Typography
            className="wow-t2"
            sx={{
              fontFamily: FD,
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: { xs: 48, sm: 64, md: 88, lg: 104 },
              lineHeight: 0.88,
              letterSpacing: { xs: -2, md: -4 },
              color: '#1a0a0a',
              display: 'block',
            }}
          >
            collection
          </Typography>
          <Typography
            className="wow-t3"
            sx={{
              fontFamily: FD,
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: { xs: 48, sm: 64, md: 88, lg: 104 },
              lineHeight: 0.88,
              letterSpacing: { xs: -2, md: -4 },
              color: '#c62828',
              display: 'block',
            }}
          >
            maîtrisée.
          </Typography>
        </Box>

        {/* Divider line */}
        <Box
          className="wow-line"
          sx={{
            height: 1,
            background:
              'linear-gradient(to right, rgba(198,40,40,0.4), transparent)',
            mb: { xs: 2.5, md: 3 },
            maxWidth: 320,
          }}
        />

        {/* Subtitle */}
        <Typography
          className="wow-sub"
          sx={{
            fontFamily: FD,
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: { xs: 15, md: 18 },
            color: '#6b3a3a',
            lineHeight: 1.65,
            maxWidth: 380,
            letterSpacing: 0.1,
          }}
        >
          Suivez, organisez et découvrez vos jeux vidéo — en un seul endroit.
        </Typography>

        {/* Stats row */}
        <Box
          className="wow-stat"
          sx={{
            display: 'flex',
            gap: { xs: 3, md: 5 },
            mt: { xs: 3, md: 4 },
            alignItems: 'center',
          }}
        >
          {[
            { num: '∞', label: 'Jeux trackés' },
            { num: '1', label: 'Endroit' },
            { num: '0', label: 'Doublon' },
          ].map(({ num, label }, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}
            >
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: { xs: 28, md: 36 },
                  lineHeight: 1,
                  color: '#c62828',
                  letterSpacing: -1,
                }}
              >
                {num}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FB,
                  fontSize: 9,
                  fontWeight: 400,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: 'rgba(107,58,58,0.65)',
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Floating accent dots ── */}
      <Box
        className="wow-float"
        sx={{
          position: 'absolute',
          right: { xs: '5%', md: '22%' },
          top: '12%',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: '#c62828',
          opacity: 0.3,
        }}
      />
      <Box
        className="wow-float"
        sx={{
          position: 'absolute',
          right: { xs: '12%', md: '16%' },
          bottom: '18%',
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: '#c62828',
          opacity: 0.2,
          animationDelay: '1.5s',
        }}
      />
      <Box
        className="wow-float"
        sx={{
          position: 'absolute',
          right: { xs: '20%', md: '28%' },
          top: '55%',
          width: 4,
          height: 4,
          borderRadius: '50%',
          bgcolor: '#c62828',
          opacity: 0.15,
          animationDelay: '3s',
        }}
      />
    </Box>
  );
};

export default Banner;
