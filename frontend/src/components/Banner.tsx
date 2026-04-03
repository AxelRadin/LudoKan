import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 220, md: 300 },
        display: 'flex',
        alignItems: 'center',
        px: { xs: 3, sm: 5, md: 8 },
        py: { xs: 5, md: 6 },
        borderRadius: { xs: 4, md: 6 },
        background:
          'linear-gradient(135deg, #fff7f7 0%, #fffdfd 45%, #fff1f1 100%)',
        border: '1px solid rgba(198,40,40,0.08)',
      }}
    >
      {/* Background text */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          top: '50%',
          left: { xs: '50%', md: '58%' },
          transform: 'translate(-50%, -50%)',
          fontSize: { xs: '18vw', md: '11vw' },
          fontWeight: 800,
          letterSpacing: '-0.06em',
          lineHeight: 1,
          color: 'rgba(198,40,40,0.05)',
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        LUDOKAN
      </Typography>

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: { xs: '100%', md: 520 },
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#c62828',
            mb: 1.5,
          }}
        >
          Univers gaming
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '2rem', md: '3.5rem' },
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: '#1f1f1f',
            mb: 2,
          }}
        >
          Votre univers
          <Box component="span" sx={{ color: '#c62828' }}>
            {' '}
            gaming
          </Box>
          , simplement.
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            color: '#6b6b6b',
            lineHeight: 1.7,
            maxWidth: 460,
          }}
        >
          Explorez vos jeux, découvrez les tendances et organisez votre
          collection dans une interface claire et élégante.
        </Typography>
      </Box>
    </Box>
  );
};

export default Banner;
