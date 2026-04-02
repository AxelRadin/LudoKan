import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const FD = "'Orbitron', 'Rajdhani', sans-serif";
const FB = "'Inter', 'DM Sans', sans-serif";

export const Banner: React.FC = () => {
  useEffect(() => {
    if (!document.head.querySelector('link[data-gaming-banner-fonts]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-gaming-banner-fonts', '1');
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@600;700;800&family=Rajdhani:wght@500;600;700&display=swap';
      document.head.appendChild(link);
    }

    if (!document.head.querySelector('style[data-gaming-banner-style]')) {
      const style = document.createElement('style');
      style.setAttribute('data-gaming-banner-style', '1');
      style.textContent = `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatSoft {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .banner-fade-1 { animation: fadeUp .7s ease-out both; }
        .banner-fade-2 { animation: fadeUp .7s ease-out .15s both; }
        .banner-fade-3 { animation: fadeUp .7s ease-out .3s both; }
        .banner-float  { animation: floatSoft 5s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 280, md: 360 },
        display: 'flex',
        alignItems: 'center',
        px: { xs: 3, sm: 5, md: 8 },
        py: { xs: 5, md: 6 },
        borderRadius: 4,
        background: `
          radial-gradient(circle at 20% 20%, rgba(255, 72, 72, 0.22) 0%, transparent 25%),
          radial-gradient(circle at 85% 30%, rgba(255, 0, 0, 0.14) 0%, transparent 30%),
          linear-gradient(135deg, #0f0a0a 0%, #1c0b0b 35%, #3a0d0d 100%)
        `,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
      }}
    >
      {/* grille discrète */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}
      />

      {/* glow à droite */}
      <Box
        className="banner-float"
        sx={{
          position: 'absolute',
          right: { xs: -40, md: 40 },
          top: '50%',
          transform: 'translateY(-50%)',
          width: { xs: 140, md: 220 },
          height: { xs: 140, md: 220 },
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,70,70,0.25) 0%, rgba(255,70,70,0.08) 35%, transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      {/* ghost text */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: '-4%', md: '4%' },
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: FD,
          fontWeight: 800,
          fontSize: { xs: '24vw', md: '14vw' },
          lineHeight: 1,
          color: 'rgba(255,255,255,0.04)',
          letterSpacing: '0.08em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        PLAY
      </Typography>

      {/* contenu */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: { xs: '100%', md: '60%' },
        }}
      >
        <Typography
          className="banner-fade-1"
          sx={{
            fontFamily: FB,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)',
            mb: 2,
          }}
        >
          Bibliothèque gaming
        </Typography>

        <Typography
          className="banner-fade-2"
          sx={{
            fontFamily: FD,
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: 34, sm: 46, md: 64 },
            lineHeight: 0.95,
            color: '#ffffff',
            mb: 1.5,
            textShadow: '0 6px 24px rgba(0,0,0,0.25)',
          }}
        >
          Votre collection,
          <br />
          votre univers.
        </Typography>

        <Typography
          className="banner-fade-3"
          sx={{
            fontFamily: FB,
            fontSize: { xs: 14, md: 17 },
            fontWeight: 400,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.72)',
            maxWidth: 460,
            mb: 3,
          }}
        >
          Suivez, organisez et retrouvez tous vos jeux dans une interface
          élégante, simple et pensée pour les joueurs.
        </Typography>

        <Box
          className="banner-fade-3"
          sx={{
            display: 'flex',
            gap: 1.2,
            flexWrap: 'wrap',
          }}
        >
          {['Jeux', 'Wishlist', 'Collection'].map(item => (
            <Box
              key={item}
              sx={{
                px: 1.8,
                py: 0.9,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: FB,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.82)',
                }}
              >
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Banner;
