import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 180, md: 240 },
        display: 'flex',
        alignItems: 'center',
        px: { xs: 3, sm: 5, md: 8 },
        py: { xs: 4, md: 5 },
        borderRadius: { xs: 4, md: 6 },
        background:
          'linear-gradient(135deg, #fff7f7 0%, #fffdfd 45%, #fff1f1 100%)',
        border: '1px solid rgba(198,40,40,0.08)',
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: '-6%', md: '2%' },
          transform: 'translateY(-50%)',
          fontSize: { xs: '20vw', md: '10vw' },
          fontWeight: 800,
          letterSpacing: '-0.08em',
          lineHeight: 1,
          color: 'rgba(198,40,40,0.04)',
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        LUDOKAN
      </Typography>

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 320,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: '2px',
            backgroundColor: '#c62828',
            borderRadius: '999px',
            mb: 1.5,
          }}
        />

        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#c62828',
            mb: 1,
          }}
        >
          Bibliothèque gaming
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1rem', md: '1.15rem' },
            fontWeight: 500,
            color: '#3a3a3a',
            lineHeight: 1.6,
          }}
        >
          Pensée simplement.
        </Typography>
      </Box>
    </Box>
  );
};

export default Banner;
